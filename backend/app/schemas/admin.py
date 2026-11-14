from datetime import datetime
from decimal import Decimal
from typing import Any
from pydantic import BaseModel, Field


class AdminStatsResponse(BaseModel):
    pending_labs: int
    pending_content: int
    total_frozen_escrow: Decimal
    platform_revenue: Decimal
    active_disputes: int
    open_tickets: int


class AuditLogResponse(BaseModel):
    id: int
    admin_id: int | None = None
    admin_name: str
    admin_email: str
    action: str
    target_type: str
    target_id: int | None = None
    details: Any | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserVerifyRequest(BaseModel):
    verification_status: str = Field(..., description="verified | rejected | pending")
    comment: str | None = None


class UserBlockRequest(BaseModel):
    is_active: bool
    reason: str | None = None


class UserEditRequest(BaseModel):
    organization_name: str | None = None
    representative_name: str | None = None
    inn: str | None = None
    ogrn: str | None = None
    full_name: str | None = None
    is_admin: bool | None = None


class ContentModerateRequest(BaseModel):
    status: str = Field(..., description="approved | rejected | hidden | open")
    moderation_comment: str | None = None
    title: str | None = None
    summary: str | None = None
    category: str | None = None
    trl_level: int | None = None
    budget_total: Decimal | None = None


class FinanceAdjustRequest(BaseModel):
    user_id: int
    amount: Decimal = Field(..., gt=0)
    action: str = Field("deposit", description="deposit (начисление) или deduct (списание)")
    reason: str = Field(..., min_length=3, description="Основание для ручной проводки")


class MilestoneResolveRequest(BaseModel):
    action: str = Field(..., description="release (выплатить НИИ) или refund (вернуть инвестору)")
    comment: str | None = None
    new_amount: Decimal | None = None
