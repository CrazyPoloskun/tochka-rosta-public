import os
import uuid
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from fastapi.responses import FileResponse
from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.chat import Chat, Message, ChatMember, MessageAttachment
from app.models.project import Project, ProjectSyndicateMember
from app.models.notification import Notification
from app.schemas.chat import (
    ChatResponse,
    MessageResponse,
    MessageSendRequest,
    ChatMemberResponse,
    AttachmentResponse,
    FileUploadResponse,
)
from app.api.v1.endpoints.realtime import manager

router = APIRouter()

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")
CHAT_ATTACHMENTS_DIR = os.path.join(UPLOAD_DIR, "chat_attachments")
os.makedirs(CHAT_ATTACHMENTS_DIR, exist_ok=True)


async def check_user_has_chat_access(chat: Chat, current_user: User, db: AsyncSession) -> bool:
    """Проверяет права доступа текущего пользователя к диалогу (личному или групповому)."""
    if current_user.is_admin:
        return True

    # Личные диалоги
    if chat.investor_id == current_user.id or chat.lab_id == current_user.id:
        return True

    # Прямое членство в chat_members
    cm_res = await db.execute(
        select(ChatMember.id).where(
            and_(ChatMember.chat_id == chat.id, ChatMember.user_id == current_user.id)
        )
    )
    if cm_res.scalar_one_or_none():
        return True

    # Если проектный чат — проверка участия в проекте или синдикате
    if chat.project_id:
        p_res = await db.execute(select(Project).where(Project.id == chat.project_id))
        project = p_res.scalar_one_or_none()
        if project:
            if project.lab_id == current_user.id or project.investor_id == current_user.id:
                return True
            # Соинвестор в синдикате
            sm_res = await db.execute(
                select(ProjectSyndicateMember.id).where(
                    and_(
                        ProjectSyndicateMember.project_id == project.id,
                        ProjectSyndicateMember.investor_id == current_user.id,
                    )
                )
            )
            if sm_res.scalar_one_or_none():
                return True

    return False


async def ensure_chat_members(chat: Chat, db: AsyncSession):
    """Синхронизирует состав участников диалога (как личного, так и проектного группового)."""
    # Получаем существующих участников
    existing_res = await db.execute(select(ChatMember.user_id).where(ChatMember.chat_id == chat.id))
    existing_user_ids = set(existing_res.scalars().all())

    # 1. Инвестор / Заказчик чата
    if chat.investor_id and chat.investor_id not in existing_user_ids:
        db.add(ChatMember(chat_id=chat.id, user_id=chat.investor_id, role="lead_investor"))
        existing_user_ids.add(chat.investor_id)

    # 2. Лаборатория / Исполнитель чата
    if chat.lab_id and chat.lab_id not in existing_user_ids:
        db.add(ChatMember(chat_id=chat.id, user_id=chat.lab_id, role="lab"))
        existing_user_ids.add(chat.lab_id)

    # 3. Если чат привязан к проекту — подтягиваем проектных участников
    if chat.project_id:
        p_res = await db.execute(select(Project).where(Project.id == chat.project_id))
        project = p_res.scalar_one_or_none()
        if project:
            if project.lab_id and project.lab_id not in existing_user_ids:
                db.add(ChatMember(chat_id=chat.id, user_id=project.lab_id, role="lab"))
                existing_user_ids.add(project.lab_id)

            if project.investor_id and project.investor_id not in existing_user_ids:
                db.add(ChatMember(chat_id=chat.id, user_id=project.investor_id, role="lead_investor"))
                existing_user_ids.add(project.investor_id)

            syn_res = await db.execute(
                select(ProjectSyndicateMember).where(ProjectSyndicateMember.project_id == project.id)
            )
            for sm in syn_res.scalars().all():
                if sm.investor_id not in existing_user_ids:
                    role = "lead_investor" if sm.is_lead else "co_investor"
                    db.add(ChatMember(chat_id=chat.id, user_id=sm.investor_id, role=role))
                    existing_user_ids.add(sm.investor_id)

    # 4. Отправители сообщений в этом чате (если кто-то писал)
    senders_res = await db.execute(
        select(Message.sender_id).where(Message.chat_id == chat.id).distinct()
    )
    for sender_id in senders_res.scalars().all():
        if sender_id and sender_id not in existing_user_ids:
            db.add(ChatMember(chat_id=chat.id, user_id=sender_id, role="member"))
            existing_user_ids.add(sender_id)

    await db.commit()


async def ensure_project_chat_members(chat: Chat, project: Project, db: AsyncSession):
    """Алиас для обратной совместимости."""
    await ensure_chat_members(chat, db)


@router.get("", response_model=list[ChatResponse])
async def list_chats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает список всех личных и проектных групповых чатов текущего пользователя."""
    # 1. ID чатов, где пользователь числится через chat_members
    member_chat_ids_subq = select(ChatMember.chat_id).where(ChatMember.user_id == current_user.id)

    # 2. Проекты, где пользователь соинвестор
    syn_projects_subq = select(ProjectSyndicateMember.project_id).where(
        and_(
            ProjectSyndicateMember.investor_id == current_user.id,
            ProjectSyndicateMember.invested_amount > 0,
        )
    )

    query = (
        select(Chat)
        .where(
            or_(
                Chat.investor_id == current_user.id,
                Chat.lab_id == current_user.id,
                Chat.id.in_(member_chat_ids_subq),
                Chat.project_id.in_(syn_projects_subq),
            )
        )
        .order_by(Chat.updated_at.desc())
    )
    result = await db.execute(query)
    chats = result.scalars().all()

    response = []
    for chat in chats:
        is_group = chat.chat_type == "project"

        other_party_id = None
        other_party_name = None
        other_party_role = None

        if not is_group:
            other_party_id = chat.lab_id if current_user.id == chat.investor_id else chat.investor_id
            if other_party_id:
                other_res = await db.execute(select(User).where(User.id == other_party_id))
                other_user = other_res.scalar_one_or_none()
                if other_user:
                    other_party_name = other_user.organization_name or other_user.full_name
                    other_party_role = "НИИ / Лаборатория" if other_user.role == "lab" else "Инвестор"
        else:
            other_party_name = "Инвестиционный чат проекта"
            other_party_role = "Коллективное инвестирование"

        # Количество участников
        members_cnt_res = await db.execute(
            select(func.count(ChatMember.id)).where(ChatMember.chat_id == chat.id)
        )
        members_count = members_cnt_res.scalar() or 0
        if members_count == 0:
            known = {uid for uid in [chat.investor_id, chat.lab_id] if uid}
            members_count = max(len(known), 2)

        # Непрочитанные сообщения
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
            select(Message).where(Message.chat_id == chat.id).order_by(Message.id.desc()).limit(1)
        )
        last_msg = last_msg_res.scalar_one_or_none()
        last_message_text = last_msg.content if last_msg else None

        c_dto = ChatResponse.model_validate(chat)
        c_dto.chat_type = chat.chat_type
        c_dto.other_party_id = other_party_id
        c_dto.other_party_name = other_party_name or chat.title
        c_dto.other_party_role = other_party_role
        c_dto.unread_count = unread_count
        c_dto.last_message = last_message_text
        c_dto.members_count = members_count
        response.append(c_dto)

    return response


@router.get("/by-project/{project_id}", response_model=ChatResponse)
async def get_or_create_project_chat(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает или автоматически инициализирует групповой чат проекта с жесткой привязкой участников."""
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    # Проверка участия пользователя в проекте
    is_allowed = False
    if current_user.is_admin or project.lab_id == current_user.id or project.investor_id == current_user.id:
        is_allowed = True
    else:
        sm_res = await db.execute(
            select(ProjectSyndicateMember.id).where(
                and_(
                    ProjectSyndicateMember.project_id == project.id,
                    ProjectSyndicateMember.investor_id == current_user.id,
                    ProjectSyndicateMember.invested_amount > 0,
                )
            )
        )
        if sm_res.scalar_one_or_none():
            is_allowed = True

    if not is_allowed:
        raise HTTPException(status_code=403, detail="Вы не являетесь участником или инвестором этого проекта")

    # Ищем существующий групповой чат проекта
    c_res = await db.execute(
        select(Chat).where(and_(Chat.project_id == project.id, Chat.chat_type == "project"))
    )
    chat = c_res.scalars().first()

    if not chat:
        chat = Chat(
            chat_type="project",
            project_id=project.id,
            investor_id=project.investor_id,
            lab_id=project.lab_id,
            title=f"Проект: {project.title}",
            context_type="project",
            context_id=project.id,
        )
        db.add(chat)
        await db.commit()
        await db.refresh(chat)

        # Первое приветственное системное сообщение
        first_msg = Message(
            chat_id=chat.id,
            sender_id=project.investor_id or current_user.id,
            content=f"🚀 Открыт инвестиционный чат проекта «{project.title}». Здесь соинвесторы и исполнители НИОКР обсуждают ход разработки, этапы и распределение прибыли.",
            is_read=False,
            is_system=True,
        )
        db.add(first_msg)
        await db.commit()

    # Синхронизируем участников
    await ensure_project_chat_members(chat, project, db)

    # Количество участников
    members_cnt_res = await db.execute(
        select(func.count(ChatMember.id)).where(ChatMember.chat_id == chat.id)
    )
    members_count = members_cnt_res.scalar() or 0

    c_dto = ChatResponse.model_validate(chat)
    c_dto.chat_type = "project"
    c_dto.other_party_name = chat.title
    c_dto.other_party_role = "Коллективное инвестирование"
    c_dto.members_count = members_count
    return c_dto


@router.get("/by-context/{context_type}/{context_id}", response_model=ChatResponse)
async def get_chat_by_context(
    context_type: str,
    context_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Позволяет мгновенно открыть контекстный диалог (задача, идея, донат)."""
    query = (
        select(Chat)
        .where(
            Chat.context_type == context_type,
            Chat.context_id == context_id,
            or_(Chat.investor_id == current_user.id, Chat.lab_id == current_user.id),
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


@router.get("/{chat_id}/members", response_model=list[ChatMemberResponse])
async def list_chat_members(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает детальный список участников группового или личного чата с их ролями и долями."""
    c_res = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = c_res.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Чат не найден")

    if not await check_user_has_chat_access(chat, current_user, db):
        raise HTTPException(status_code=403, detail="Доступ к списку участников чата запрещён")

    # Синхронизируем состав участников
    await ensure_chat_members(chat, db)

    # Загружаем членов чата
    m_res = await db.execute(
        select(ChatMember, User)
        .join(User, ChatMember.user_id == User.id)
        .where(ChatMember.chat_id == chat_id)
        .order_by(ChatMember.joined_at.asc())
    )
    rows = m_res.all()

    # Для проектного чата подтягиваем суммы инвестиций и доли из синдиката
    syndicate_shares: dict[int, tuple[Decimal, Decimal]] = {}
    if chat.project_id:
        syn_res = await db.execute(
            select(ProjectSyndicateMember).where(ProjectSyndicateMember.project_id == chat.project_id)
        )
        for sm in syn_res.scalars().all():
            syndicate_shares[sm.investor_id] = (sm.invested_amount, sm.share_percent)

    response = []
    seen_user_ids: set[int] = set()

    for cm, user in rows:
        if user.id in seen_user_ids:
            continue
        seen_user_ids.add(user.id)
        inv_amt, share_pct = syndicate_shares.get(user.id, (None, None))
        member_role = cm.role or ("lead_investor" if user.id == chat.investor_id else "lab" if user.id == chat.lab_id else "member")
        response.append(
            ChatMemberResponse(
                id=cm.id,
                chat_id=cm.chat_id,
                user_id=user.id,
                role=member_role,
                full_name=user.full_name or user.organization_name or f"Пользователь #{user.id}",
                organization_name=user.organization_name,
                user_role=user.role or "investor",
                invested_amount=inv_amt,
                share_percent=share_pct,
                joined_at=cm.joined_at or chat.created_at or datetime.utcnow(),
                is_online=manager.is_user_online(user.id),
            )
        )

    # Если по какой-то причине rows пуст, формируем участников из известных сторон чата
    if not response:
        candidate_ids = [u_id for u_id in [chat.investor_id, chat.lab_id, current_user.id] if u_id]
        if candidate_ids:
            p_users_res = await db.execute(select(User).where(User.id.in_(candidate_ids)))
            users = p_users_res.scalars().all()
            for u in users:
                if u.id in seen_user_ids:
                    continue
                seen_user_ids.add(u.id)
                inv_amt, share_pct = syndicate_shares.get(u.id, (None, None))
                response.append(
                    ChatMemberResponse(
                        id=u.id,
                        chat_id=chat.id,
                        user_id=u.id,
                        role="lead_investor" if u.id == chat.investor_id else "lab" if u.id == chat.lab_id else "member",
                        full_name=u.full_name or u.organization_name or f"Пользователь #{u.id}",
                        organization_name=u.organization_name,
                        user_role=u.role or "investor",
                        invested_amount=inv_amt,
                        share_percent=share_pct,
                        joined_at=chat.created_at or datetime.utcnow(),
                        is_online=manager.is_user_online(u.id),
                    )
                )

    return response


@router.post("/{chat_id}/upload-attachment", response_model=FileUploadResponse)
async def upload_chat_attachment(
    chat_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Загружает файл вложения для указанного чата на локальный диск."""
    c_res = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = c_res.scalar_one_or_none()
    if not chat or not await check_user_has_chat_access(chat, current_user, db):
        raise HTTPException(status_code=403, detail="Доступ к чату запрещён")

    # Чтение и валидация размера (максимум 50 МБ)
    file_bytes = await file.read()
    file_size = len(file_bytes)
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Файл пуст")
    if file_size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Размер файла превышает допустимый лимит 50 МБ")

    # Безопасное сохранение на локальный диск с уникальным UUID
    orig_name = os.path.basename(file.filename or "attachment")
    ext = os.path.splitext(orig_name)[1]
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    target_path = os.path.join(CHAT_ATTACHMENTS_DIR, safe_filename)

    with open(target_path, "wb") as f:
        f.write(file_bytes)

    # Создание записи вложения
    attachment = MessageAttachment(
        chat_id=chat.id,
        message_id=None,  # связывается при вызове send_message
        file_name=orig_name,
        file_path=target_path,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)

    return FileUploadResponse(
        id=attachment.id,
        file_name=attachment.file_name,
        file_size=attachment.file_size,
        mime_type=attachment.mime_type,
        download_url=f"/api/v1/chats/attachments/{attachment.id}/download",
    )


@router.get("/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Скачивание файла вложения с проверкой прав доступа пользователя к чату."""
    att_res = await db.execute(
        select(MessageAttachment, Chat)
        .join(Chat, MessageAttachment.chat_id == Chat.id)
        .where(MessageAttachment.id == attachment_id)
    )
    row = att_res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Вложение не найдено")

    attachment, chat = row
    if not await check_user_has_chat_access(chat, current_user, db):
        raise HTTPException(status_code=403, detail="Доступ к вложению запрещён")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="Файл не найден на сервере")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.file_name,
        media_type=attachment.mime_type,
    )


@router.get("/{chat_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получает историю сообщений чата с вложенными файлами."""
    c_res = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = c_res.scalar_one_or_none()
    if not chat or not await check_user_has_chat_access(chat, current_user, db):
        raise HTTPException(status_code=403, detail="Доступ к чату запрещён")

    # Получаем сообщения с eager loading вложений
    m_res = await db.execute(
        select(Message, User.full_name, User.organization_name, User.role)
        .join(User, Message.sender_id == User.id)
        .options(selectinload(Message.attachments))
        .where(Message.chat_id == chat_id)
        .order_by(Message.id.asc())
    )
    rows = m_res.all()

    # Отмечаем прочитанными
    for msg, _, _, _ in rows:
        if msg.sender_id != current_user.id and not msg.is_read:
            msg.is_read = True
    await db.commit()

    response = []
    for msg, sender_name, sender_org, sender_role in rows:
        att_dtos = [
            AttachmentResponse(
                id=att.id,
                message_id=msg.id,
                file_name=att.file_name,
                file_path=f"/api/v1/chats/attachments/{att.id}/download",
                file_size=att.file_size,
                mime_type=att.mime_type,
                created_at=att.created_at,
            )
            for att in (msg.attachments or [])
        ]
        display_sender_name = sender_name or sender_org or "Пользователь"
        response.append(
            MessageResponse(
                id=msg.id,
                chat_id=msg.chat_id,
                sender_id=msg.sender_id,
                content=msg.content,
                is_read=msg.is_read,
                is_system=msg.is_system,
                created_at=msg.created_at,
                sender_name=display_sender_name,
                sender_role=sender_role,
                attachments=att_dtos,
            )
        )
    return response


@router.post("/{chat_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    chat_id: int,
    data: MessageSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Отправляет текстовое сообщение и/или прикрепленные файлы в чат."""
    c_res = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = c_res.scalar_one_or_none()
    if not chat or not await check_user_has_chat_access(chat, current_user, db):
        raise HTTPException(status_code=403, detail="Доступ к чату запрещён")

    content_clean = data.content.strip() if data.content else ""
    if not content_clean and not data.attachment_ids:
        raise HTTPException(status_code=400, detail="Сообщение не может быть пустым")

    msg = Message(
        chat_id=chat.id,
        sender_id=current_user.id,
        content=content_clean,
        is_read=False,
        is_system=False,
    )
    chat.updated_at = datetime.utcnow()
    db.add(msg)
    await db.flush()

    # Привязка предварительно загруженных вложений
    attached_files = []
    if data.attachment_ids:
        att_res = await db.execute(
            select(MessageAttachment).where(
                and_(
                    MessageAttachment.id.in_(data.attachment_ids),
                    MessageAttachment.chat_id == chat.id,
                    MessageAttachment.message_id.is_(None),
                )
            )
        )
        attachments = att_res.scalars().all()
        for att in attachments:
            att.message_id = msg.id
            attached_files.append({
                "id": att.id,
                "file_name": att.file_name,
                "file_size": att.file_size,
                "mime_type": att.mime_type,
                "download_url": f"/api/v1/chats/attachments/{att.id}/download",
            })

    await db.commit()
    await db.refresh(msg)

    res = MessageResponse(
        id=msg.id,
        chat_id=msg.chat_id,
        sender_id=msg.sender_id,
        content=msg.content,
        is_read=msg.is_read,
        is_system=msg.is_system,
        created_at=msg.created_at,
        sender_name=current_user.full_name or current_user.organization_name,
        sender_role=current_user.role,
        attachments=[
            AttachmentResponse(
                id=a["id"],
                message_id=msg.id,
                file_name=a["file_name"],
                file_path=a["download_url"],
                file_size=a["file_size"],
                mime_type=a["mime_type"],
                created_at=msg.created_at,
            )
            for a in attached_files
        ],
    )

    try:
        await manager.broadcast_chat(chat.id, {
            "type": "message",
            "id": msg.id,
            "chat_id": chat.id,
            "sender_id": current_user.id,
            "sender_name": current_user.full_name or current_user.organization_name or current_user.email,
            "sender_role": current_user.role,
            "content": msg.content,
            "is_system": msg.is_system,
            "attachments": attached_files,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "is_mine": False,
        })
    except Exception:
        pass

    # Создание системных уведомлений для участников чата
    try:
        recipient_ids = []
        if chat.chat_type == "direct":
            other_id = chat.lab_id if current_user.id == chat.investor_id else chat.investor_id
            if other_id and other_id != current_user.id:
                recipient_ids.append(other_id)
        else:
            cm_res = await db.execute(
                select(ChatMember.user_id).where(
                    and_(ChatMember.chat_id == chat.id, ChatMember.user_id != current_user.id)
                )
            )
            recipient_ids = [uid for uid in cm_res.scalars().all()]

        sender_label = current_user.organization_name or current_user.full_name or "Собеседник"
        for r_id in recipient_ids:
            body_text = msg.content[:120] if msg.content else "Отправлен файл вложения"
            notif = Notification(
                recipient_id=r_id,
                type="new_message",
                title=f"Сообщение от {sender_label}",
                body=body_text,
                link_url=f"/dashboard?tab=messages&chat_id={chat.id}",
                severity="info",
            )
            db.add(notif)
        await db.commit()
    except Exception as e:
        print(f"[CHAT NOTIFICATION] Error: {e}")

    return res


@router.post("/{chat_id}/forward", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def forward_message(
    chat_id: int,
    source_message_id: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Пересылает сообщение из любого доступного диалога в указанный чат с системной пометкой."""
    # 1. Проверяем целевой чат
    c_res = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = c_res.scalar_one_or_none()
    if not chat or not await check_user_has_chat_access(chat, current_user, db):
        raise HTTPException(status_code=403, detail="Доступ к целевому чату запрещён")

    # 2. Исходное сообщение
    sm_res = await db.execute(
        select(Message, User.full_name)
        .join(User, Message.sender_id == User.id)
        .options(selectinload(Message.attachments))
        .where(Message.id == source_message_id)
    )
    row = sm_res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Исходное сообщение для пересылки не найдено")

    source_msg, orig_author_name = row
    # Проверяем доступ к исходному чату
    sc_res = await db.execute(select(Chat).where(Chat.id == source_msg.chat_id))
    source_chat = sc_res.scalar_one_or_none()
    if not source_chat or not await check_user_has_chat_access(source_chat, current_user, db):
        raise HTTPException(status_code=403, detail="Доступ к исходному сообщению запрещён")

    forwarded_content = f"↪ Переслано от {orig_author_name}:\n{source_msg.content}"
    f_msg = Message(
        chat_id=chat.id,
        sender_id=current_user.id,
        content=forwarded_content,
        is_read=False,
        is_system=False,
    )
    chat.updated_at = datetime.utcnow()
    db.add(f_msg)
    await db.commit()
    await db.refresh(f_msg)

    # Системное оповещение
    recipient_ids = []
    if chat.chat_type == "direct":
        other_id = chat.lab_id if current_user.id == chat.investor_id else chat.investor_id
        if other_id and other_id != current_user.id:
            recipient_ids.append(other_id)
    else:
        cm_res = await db.execute(
            select(ChatMember.user_id).where(
                and_(ChatMember.chat_id == chat.id, ChatMember.user_id != current_user.id)
            )
        )
        recipient_ids = [uid for uid in cm_res.scalars().all()]

    sender_label = current_user.organization_name or current_user.full_name or "Собеседник"
    for r_id in recipient_ids:
        notif = Notification(
            recipient_id=r_id,
            type="forwarded_message",
            title=f"Пересланное сообщение от {sender_label}",
            body=forwarded_content[:120],
            link_url=f"/dashboard?tab=messages&chat_id={chat.id}",
            severity="info",
        )
        db.add(notif)
    await db.commit()

    return MessageResponse(
        id=f_msg.id,
        chat_id=f_msg.chat_id,
        sender_id=f_msg.sender_id,
        content=f_msg.content,
        is_read=f_msg.is_read,
        is_system=f_msg.is_system,
        created_at=f_msg.created_at,
        sender_name=current_user.full_name or current_user.organization_name,
        sender_role=current_user.role,
        attachments=[],
    )
