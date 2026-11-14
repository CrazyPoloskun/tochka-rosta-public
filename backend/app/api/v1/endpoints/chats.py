from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.chat import Chat, Message
from app.schemas.chat import ChatResponse, MessageResponse, MessageSendRequest
from app.api.v1.endpoints.realtime import manager

router = APIRouter()


@router.get("", response_model=list[ChatResponse])
async def list_chats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Chat)
        .where(or_(Chat.investor_id == current_user.id, Chat.lab_id == current_user.id))
        .order_by(Chat.updated_at.desc())
    )
    result = await db.execute(query)
    chats = result.scalars().all()

    response = []
    for chat in chats:
        other_party_id = chat.lab_id if current_user.id == chat.investor_id else chat.investor_id
        other_res = await db.execute(select(User).where(User.id == other_party_id))
        other_user = other_res.scalar_one_or_none()

        # Непрочитанные
        unread_res = await db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.chat_id == chat.id,
                    Message.sender_id != current_user.id,
                    Message.is_read == False,
                )
            )
        )
        unread_count = unread_res.scalar() or 0

        # Последнее сообщение
        last_msg_res = await db.execute(
            select(Message.content).where(Message.chat_id == chat.id).order_by(Message.id.desc()).limit(1)
        )
        last_message = last_msg_res.scalar_one_or_none()

        c_dto = ChatResponse.model_validate(chat)
        c_dto.other_party_id = other_party_id
        c_dto.other_party_name = other_user.organization_name or other_user.full_name if other_user else "Собеседник"
        c_dto.other_party_role = "НИИ / Лаборатория" if other_user and other_user.role == "lab" else "Инвестор"
        c_dto.unread_count = unread_count
        c_dto.last_message = last_message
        response.append(c_dto)

    return response


@router.get("/by-context/{context_type}/{context_id}", response_model=ChatResponse)
async def get_chat_by_context(
    context_type: str,
    context_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Позволяет мгновенно открыть или найти чат, привязанный к отклику, задаче или идее."""
    query = (
        select(Chat)
        .where(
            Chat.context_type == context_type,
            Chat.context_id == context_id,
            or_(Chat.investor_id == current_user.id, Chat.lab_id == current_user.id)
        )
        .order_by(Chat.updated_at.desc())
    )
    res = await db.execute(query)
    chat = res.scalars().first()
    if not chat:
        raise HTTPException(status_code=404, detail="Контекстный диалог не найден")

    other_party_id = chat.lab_id if current_user.id == chat.investor_id else chat.investor_id
    other_res = await db.execute(select(User).where(User.id == other_party_id))
    other_user = other_res.scalar_one_or_none()

    c_dto = ChatResponse.model_validate(chat)
    c_dto.other_party_id = other_party_id
    c_dto.other_party_name = other_user.organization_name or other_user.full_name if other_user else "Собеседник"
    c_dto.other_party_role = "НИИ / Лаборатория" if other_user and other_user.role == "lab" else "Инвестор"
    return c_dto


@router.get("/{chat_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c_res = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = c_res.scalar_one_or_none()
    if not chat or (chat.investor_id != current_user.id and chat.lab_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Доступ к чату запрещён")

    # Получаем сообщения
    m_res = await db.execute(
        select(Message, User.full_name)
        .join(User, Message.sender_id == User.id)
        .where(Message.chat_id == chat_id)
        .order_by(Message.id.asc())
    )
    rows = m_res.all()

    # Отмечаем прочитанными входящие сообщения
    for msg, _ in rows:
        if msg.sender_id != current_user.id and not msg.is_read:
            msg.is_read = True
    await db.commit()

    return [
        MessageResponse(
            id=msg.id,
            chat_id=msg.chat_id,
            sender_id=msg.sender_id,
            content=msg.content,
            is_read=msg.is_read,
            created_at=msg.created_at,
            sender_name=sender_name,
        )
        for msg, sender_name in rows
    ]


@router.post("/{chat_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    chat_id: int,
    data: MessageSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c_res = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = c_res.scalar_one_or_none()
    if not chat or (chat.investor_id != current_user.id and chat.lab_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Доступ к чату запрещён")

    msg = Message(
        chat_id=chat.id,
        sender_id=current_user.id,
        content=data.content.strip(),
        is_read=False,
    )
    chat.updated_at = datetime.utcnow()
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    res = MessageResponse.model_validate(msg)
    res.sender_name = current_user.full_name

    try:
        await manager.broadcast_chat(chat.id, {
            "type": "message",
            "id": msg.id,
            "chat_id": chat.id,
            "sender_id": current_user.id,
            "sender_name": current_user.full_name or current_user.organization_name or current_user.email,
            "content": msg.content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "is_mine": False,
        })
    except Exception as e:
        pass

    return res
