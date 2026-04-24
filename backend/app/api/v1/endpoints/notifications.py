from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime

from app.core.database import get_db
from app.core.deps import require_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse

router = APIRouter()


@router.get("/", response_model=list[NotificationResponse])
async def list_notifications(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """List user notifications (unread first)."""
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.is_read, Notification.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == user.id,
            )
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification


@router.post("/read-all")
async def mark_all_notifications_read(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all user notifications as read."""
    result = await db.execute(
        select(Notification)
        .where(
            and_(
                Notification.user_id == user.id,
                Notification.is_read == False,
            )
        )
    )
    notifications = result.scalars().all()

    for notification in notifications:
        notification.is_read = True

    await db.commit()
    return {"message": f"Marked {len(notifications)} notifications as read"}


@router.get("/unread-count")
async def get_unread_count(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get count of unread notifications."""
    result = await db.execute(
        select(func.count(Notification.id)).where(
            and_(
                Notification.user_id == user.id,
                Notification.is_read == False,
            )
        )
    )
    count = result.scalar() or 0
    return {"unread_count": count}
