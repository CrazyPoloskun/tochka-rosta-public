from datetime import datetime
from decimal import Decimal
from typing import Any
from sqlalchemy import String, DateTime, Integer, Numeric, Text, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Idea(Base):
    __tablename__ = "ideas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # "lab_tech" (разработка НИИ) или "investor_idea" (идея инвестора)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="lab_tech", index=True)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    trl_level: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    budget_total: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    
    # Список этапов [{step: 1, title: "...", amount: 100000}]
    milestones: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    
    # SHA-256 хеш документа / описания для фиксации авторского права
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    
    # "pending" | "approved" | "rejected"
    moderation_status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending", index=True)
    moderation_comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
