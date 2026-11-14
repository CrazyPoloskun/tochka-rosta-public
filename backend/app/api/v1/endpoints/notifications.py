from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.notification import Notification

router = APIRouter()


@router.get("", status_code=status.HTTP_200_OK)
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.is_admin:
        query = select(Notification).where(
            (Notification.recipient_id == current_user.id) |
            (Notification.recipient_role_scope == "admin")
        ).order_by(Notification.created_at.desc()).limit(50)
    else:
        query = select(Notification).where(
            Notification.recipient_id == current_user.id
        ).order_by(Notification.created_at.desc()).limit(50)

    res = await db.execute(query)
    notifications = res.scalars().all()
    return [
        {
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "link_url": n.link_url,
            "severity": n.severity,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]


@router.get("/unread-count", status_code=status.HTTP_200_OK)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.is_admin:
        query = select(func.count(Notification.id)).where(
            ((Notification.recipient_id == current_user.id) | (Notification.recipient_role_scope == "admin")) &
            (Notification.is_read == False)
        )
    else:
        query = select(func.count(Notification.id)).where(
            (Notification.recipient_id == current_user.id) &
            (Notification.is_read == False)
        )

    res = await db.execute(query)
    count = res.scalar() or 0
    return {"count": count}


@router.patch("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Notification).where(Notification.id == notification_id)
    res = await db.execute(query)
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")

    notif.is_read = True
    await db.commit()
    return {"success": True}


@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.is_admin:
        stmt = update(Notification).where(
            ((Notification.recipient_id == current_user.id) | (Notification.recipient_role_scope == "admin")) &
            (Notification.is_read == False)
        ).values(is_read=True)
    else:
        stmt = update(Notification).where(
            (Notification.recipient_id == current_user.id) &
            (Notification.is_read == False)
        ).values(is_read=True)

    await db.execute(stmt)
    await db.commit()
    return {"success": True}
