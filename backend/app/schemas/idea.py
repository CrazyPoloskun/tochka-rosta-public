from datetime import datetime
from decimal import Decimal
from typing import Any
from pydantic import BaseModel, Field


class MilestoneItem(BaseModel):
    step: int
    title: str
    amount: Decimal


class IdeaCreateRequest(BaseModel):
    type: str = Field("lab_tech", description="lab_tech или investor_idea")
    title: str = Field(..., min_length=1, max_length=255)
    summary: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1, max_length=100)
    trl_level: int = Field(4, ge=1, le=9)
    budget_total: Decimal = Field(Decimal("0.00"), ge=0)
    milestones: list[dict[str, Any]] = Field(default_factory=list)


class IdeaUpdateRequest(BaseModel):
    title: str | None = None
    summary: str | None = None
    category: str | None = None
    trl_level: int | None = Field(None, ge=1, le=9)
    budget_total: Decimal | None = Field(None, ge=0)
    milestones: list[dict[str, Any]] | None = None


class IdeaOrderRequest(BaseModel):
    proposed_budget: Decimal | None = None
    proposed_timeline: str | None = None
    proposal_message: str | None = None
    order_type: str | None = "rnd_order" # "donation" | "rnd_order"


class IdeaResponse(BaseModel):
    id: int
    author_id: int
    type: str
    title: str
    summary: str
    category: str
    trl_level: int
    budget_total: Decimal
    milestones: list[Any]
    file_hash: str
    moderation_status: str
    moderation_comment: str | None = None
    created_at: datetime
    author_name: str | None = None
    organization_name: str | None = None

    class Config:
        from_attributes = True
