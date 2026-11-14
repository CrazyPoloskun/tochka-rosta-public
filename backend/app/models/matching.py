from datetime import datetime
from typing import Any
from sqlalchemy import String, DateTime, Integer, Float, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MatchingInvitation(Base):
    __tablename__ = "matching_invitations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    # "task" | "idea"
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    lab_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    matched_reasons: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    
    # "pending" | "viewed" | "accepted" | "declined"
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
