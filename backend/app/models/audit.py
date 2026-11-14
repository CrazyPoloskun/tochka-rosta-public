from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Text, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    admin_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    admin_name: Mapped[str] = mapped_column(String(255), nullable=False)
    admin_email: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # "verify_user", "block_user", "edit_user", "moderate_content", "resolve_dispute", "adjust_balance", "reply_ticket", "delete_file"
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    
    # "user", "idea", "task", "project", "milestone", "account", "ticket", "file"
    target_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    target_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    
    details: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
