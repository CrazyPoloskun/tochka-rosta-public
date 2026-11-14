from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Chat, Message
from app.api.v1.endpoints.realtime import manager


async def get_or_create_context_chat(
    db: AsyncSession,
    investor_id: int,
    lab_id: int,
    context_type: str,
    context_id: int | None,
    title: str,
    initial_message: str | None = None,
    sender_id: int | None = None,
    project_id: int | None = None,
) -> tuple[Chat, bool]:
    """
    Находит существующий или автоматически создает целевой контекстный диалог
    между заказчиком/инвестором и научной лабораторией (НИИ).
    """
    # 1. Поиск существующего контекстного чата
    query = select(Chat).where(
        or_(
            and_(Chat.investor_id == investor_id, Chat.lab_id == lab_id),
            and_(Chat.investor_id == lab_id, Chat.lab_id == investor_id),
        )
    )

    if context_type and context_id:
        query = query.where(Chat.context_type == context_type, Chat.context_id == context_id)
    elif project_id:
        query = query.where(Chat.project_id == project_id)

    res = await db.execute(query)
    chat = res.scalar_one_or_none()

    if chat:
        return chat, False

    # 2. Создание нового чата
    chat = Chat(
        investor_id=investor_id,
        lab_id=lab_id,
        project_id=project_id,
        context_type=context_type,
        context_id=context_id,
        title=title,
    )
    db.add(chat)
    await db.flush()

    # 3. Добавление стартового сообщения, если передано
    if initial_message:
        msg = Message(
            chat_id=chat.id,
            sender_id=sender_id or investor_id,
            content=initial_message.strip(),
        )
        db.add(msg)
        await db.flush()

        # Реал-тайм оповещение
        try:
            await manager.broadcast_to_chat(
                chat.id,
                {
                    "type": "new_message",
                    "message": {
                        "id": msg.id,
                        "chat_id": chat.id,
                        "sender_id": msg.sender_id,
                        "content": msg.content,
                        "is_read": False,
                        "created_at": msg.created_at.isoformat() if msg.created_at else "",
                    },
                },
            )
        except Exception:
            pass

    return chat, True
