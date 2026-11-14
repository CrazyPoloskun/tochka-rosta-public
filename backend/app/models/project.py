from datetime import datetime
from decimal import Decimal
from typing import Any
from sqlalchemy import String, DateTime, Integer, Numeric, Text, ForeignKey, func, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    investor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lab_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    total_budget: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    # "active" | "completed" | "disputed"
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active", index=True)

    # Синдикация и софинансирование
    is_syndicated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    syndication_min_deposit: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    syndication_soft_cap: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    # "open" (сбор открыт) | "funded" (собрано / soft cap достигнут) | "closed"
    syndication_status: Mapped[str] = mapped_column(String(50), nullable=False, default="open", index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    syndicate_members: Mapped[list["ProjectSyndicateMember"]] = relationship(
        "ProjectSyndicateMember", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    
    # "pending_funds" | "escrow_funded" | "in_review" | "disputed" | "completed"
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending_funds", index=True)
    
    raw_report: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ГОСТ 7.32-2017 отчетность
    gost_structured_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    gost_docx_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    gost_pdf_path: Mapped[str | None] = mapped_column(String(512), nullable=True)


class ProjectFile(Base):
    __tablename__ = "project_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    uploader_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False, default="application/octet-stream")
    
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProjectSyndicateMember(Base):
    __tablename__ = "project_syndicate_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    investor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    invested_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    share_percent: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("0.00"))
    is_lead: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # "royalty" (доля в будущих доходах) | "patent_co_owner" (соавтор/совладелец патента) | "exclusive_license"
    ip_share_type: Mapped[str] = mapped_column(String(50), nullable=False, default="royalty")

    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship("Project", back_populates="syndicate_members")
