from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.support import SupportTicket, TicketMessage
from app.schemas.support import (
    TicketCreateRequest,
    SupportTicketResponse,
    TicketMessageResponse,
    TicketMessageCreateRequest,
    TicketUpdateRequest,
)
from app.api.v1.endpoints.realtime import manager

router = APIRouter()


@router.get("/tickets", response_model=list[SupportTicketResponse])
async def list_user_tickets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(SupportTicket)
        .where(SupportTicket.user_id == current_user.id)
        .order_by(SupportTicket.id.desc())
    )
    result = await db.execute(query)
    tickets = result.scalars().all()
    return [SupportTicketResponse.model_validate(t) for t in tickets]


@router.post("/tickets", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    data: TicketCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = SupportTicket(
        user_id=current_user.id,
        category=data.category,
        priority=data.priority,
        subject=data.subject.strip(),
        description=data.description.strip(),
        status="open",
        initiated_by_admin=False,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    # Initial message
    init_msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        is_admin_reply=False,
        content=data.description.strip(),
    )
    db.add(init_msg)
    await db.commit()

    res = SupportTicketResponse.model_validate(ticket)
    res.user_name = current_user.full_name
    res.user_email = current_user.email
    return res


@router.get("/tickets/{ticket_id}/messages", response_model=list[TicketMessageResponse])
async def get_ticket_messages(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = t_res.scalar_one_or_none()
    if not ticket or (ticket.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    m_res = await db.execute(
        select(TicketMessage, User.full_name)
        .join(User, TicketMessage.sender_id == User.id)
        .where(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.id.asc())
    )
    rows = m_res.all()

    return [
        TicketMessageResponse(
            id=msg.id,
            ticket_id=msg.ticket_id,
            sender_id=msg.sender_id,
            is_admin_reply=msg.is_admin_reply,
            content=msg.content,
            created_at=msg.created_at,
            sender_name="Служба заботы" if msg.is_admin_reply else sender_name,
        )
        for msg, sender_name in rows
    ]


@router.post("/tickets/{ticket_id}/messages", response_model=TicketMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_ticket_message(
    ticket_id: int,
    data: TicketMessageCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = t_res.scalar_one_or_none()
    if not ticket or (ticket.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    new_msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        is_admin_reply=current_user.is_admin,
        content=data.content.strip(),
    )
    db.add(new_msg)
    if current_user.is_admin and ticket.status == "open":
        ticket.status = "in_progress"
    await db.commit()
    await db.refresh(new_msg)

    # Broadcast via websocket
    try:
        await manager.broadcast_ticket(ticket.id, {
            "type": "ticket_message",
            "id": new_msg.id,
            "ticket_id": ticket.id,
            "sender_id": current_user.id,
            "sender_name": "Служба заботы" if current_user.is_admin else current_user.full_name,
            "is_admin_reply": current_user.is_admin,
            "content": new_msg.content,
            "created_at": new_msg.created_at.isoformat() if new_msg.created_at else None,
        })
    except Exception:
        pass

    res = TicketMessageResponse.model_validate(new_msg)
    res.sender_name = "Служба заботы" if current_user.is_admin else current_user.full_name
    return res


@router.patch("/tickets/{ticket_id}", response_model=SupportTicketResponse)
async def update_ticket(
    ticket_id: int,
    data: TicketUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = t_res.scalar_one_or_none()
    if not ticket or (ticket.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    if data.subject is not None and data.subject.strip():
        ticket.subject = data.subject.strip()
    if data.category is not None and data.category.strip():
        ticket.category = data.category.strip()
    if data.description is not None and data.description.strip():
        ticket.description = data.description.strip()
    if data.priority is not None and data.priority.strip():
        ticket.priority = data.priority.strip()
    if data.status is not None and data.status.strip():
        ticket.status = data.status.strip()

    await db.commit()
    await db.refresh(ticket)
    return SupportTicketResponse.model_validate(ticket)


@router.patch("/tickets/{ticket_id}/close", response_model=SupportTicketResponse)
async def close_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = t_res.scalar_one_or_none()
    if not ticket or (ticket.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    ticket.status = "resolved"
    await db.commit()
    await db.refresh(ticket)
    return SupportTicketResponse.model_validate(ticket)


@router.patch("/tickets/{ticket_id}/reopen", response_model=SupportTicketResponse)
async def reopen_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = t_res.scalar_one_or_none()
    if not ticket or (ticket.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    ticket.status = "in_progress"
    await db.commit()
    await db.refresh(ticket)
    return SupportTicketResponse.model_validate(ticket)


# ==============================================================================
# Вложения файлов в тикетах поддержки (Support File Attachments)
# ==============================================================================
import os
import uuid
from fastapi import UploadFile, File
from fastapi.responses import FileResponse

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")
SUPPORT_ATTACHMENTS_DIR = os.path.join(UPLOAD_DIR, "support_attachments")
os.makedirs(SUPPORT_ATTACHMENTS_DIR, exist_ok=True)


@router.post("/tickets/{ticket_id}/upload-attachment")
async def upload_support_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Загрузка файла-вложения в тикет поддержки."""
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = t_res.scalar_one_or_none()
    if not ticket or (ticket.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Доступ к тикету запрещён")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Файл пуст")
    if len(file_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл превышает 50 МБ")

    orig_name = os.path.basename(file.filename or "attachment")
    ext = os.path.splitext(orig_name)[1]
    safe_name = f"{uuid.uuid4().hex}{ext}"
    target_path = os.path.join(SUPPORT_ATTACHMENTS_DIR, safe_name)

    with open(target_path, "wb") as f:
        f.write(file_bytes)

    # Публикуем сообщение со ссылкой на скачивание
    file_msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        is_admin_reply=current_user.is_admin,
        content=f"[Файл: {orig_name}](/api/v1/support/files/{safe_name}?filename={orig_name})",
    )
    db.add(file_msg)
    await db.commit()
    await db.refresh(file_msg)

    # Оповещаем через WS
    try:
        await manager.broadcast_ticket(ticket.id, {
            "type": "ticket_message",
            "id": file_msg.id,
            "ticket_id": ticket.id,
            "sender_id": current_user.id,
            "sender_name": "Служба заботы" if current_user.is_admin else current_user.full_name,
            "is_admin_reply": current_user.is_admin,
            "content": file_msg.content,
            "created_at": file_msg.created_at.isoformat() if file_msg.created_at else None,
        })
    except Exception:
        pass

    return {
        "success": True,
        "file_name": orig_name,
        "download_url": f"/api/v1/support/files/{safe_name}?filename={orig_name}",
    }


@router.get("/files/{safe_name}")
async def download_support_file(
    safe_name: str,
    filename: str = "attachment",
    current_user: User = Depends(get_current_user),
):
    """Скачивание файла вложения из тикета поддержки."""
    file_path = os.path.join(SUPPORT_ATTACHMENTS_DIR, os.path.basename(safe_name))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(file_path, filename=filename)
