from datetime import datetime
from typing import Any
from sqlalchemy import String, DateTime, Integer, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DepositCertificate(Base):
    __tablename__ = "deposit_certificates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    certificate_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # "idea" | "task" | "project"
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    
    object_title: Mapped[str] = mapped_column(String(255), nullable=False)
    metadata_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    
    pdf_file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    deposited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
