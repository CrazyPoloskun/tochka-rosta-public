from datetime import datetime
from decimal import Decimal
from typing import Any
from sqlalchemy import String, DateTime, Integer, Numeric, Text, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    investor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    budget: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    deadline: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Список этапов [{step: 1, title: "...", amount: 100000}]
    milestones: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)

    # "pending" | "approved" | "rejected"
    moderation_status: Mapped[str] = mapped_column(String(50), nullable=False, default="approved", index=True)
    # "open" | "in_progress" | "closed"
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="open", index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TaskBid(Base):
    __tablename__ = "task_bids"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    lab_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    proposal_text: Mapped[str] = mapped_column(Text, nullable=False)
    proposed_budget: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    
    # "pending" | "accepted" | "rejected"
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending", index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
