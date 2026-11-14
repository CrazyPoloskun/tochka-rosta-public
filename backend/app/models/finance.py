from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, Integer, Numeric, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Account(Base):
    __tablename__ = "accounts"

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    available_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    frozen_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    from_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    to_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    # "deposit" | "donation" | "escrow_lock" | "escrow_release" | "platform_fee" | "refund" | "payout" | "profit_payout"
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # "completed" | "pending" | "rejected"
    status: Mapped[str] = mapped_column(String(50), default="completed", nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    bank_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProfitDistribution(Base):
    __tablename__ = "profit_distributions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    initiator_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    distribution_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    # "completed" | "pending" | "failed"
    status: Mapped[str] = mapped_column(String(50), default="completed", nullable=False)

    project: Mapped["Project"] = relationship("Project")  # noqa: F821
    initiator: Mapped["User"] = relationship("User")  # noqa: F821
    items: Mapped[list["ProfitPayoutItem"]] = relationship("ProfitPayoutItem", back_populates="distribution", cascade="all, delete-orphan")


class ProfitPayoutItem(Base):
    __tablename__ = "profit_payout_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    distribution_id: Mapped[int] = mapped_column(Integer, ForeignKey("profit_distributions.id", ondelete="CASCADE"), nullable=False, index=True)
    investor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    invested_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    share_percent: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False, default=Decimal("0.0000"))
    payout_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    transaction_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True)

    distribution: Mapped["ProfitDistribution"] = relationship("ProfitDistribution", back_populates="items")
    investor: Mapped["User"] = relationship("User")  # noqa: F821
