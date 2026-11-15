from datetime import datetime
from decimal import Decimal
from typing import Any
from pydantic import BaseModel, Field


class TaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    budget: Decimal = Field(..., ge=0)
    deadline: str = Field(..., min_length=1, max_length=50)
    milestones: list[dict[str, Any]] = Field(default_factory=list)


class TaskUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    budget: Decimal | None = None
    deadline: str | None = None
    milestones: list[dict[str, Any]] | None = None


class TaskBidCreateRequest(BaseModel):
    proposal_text: str | None = None
    work_plan: str | None = None
    proposed_budget: Decimal = Field(..., ge=0)
    proposed_deadline: str | None = None
    attached_patents: list[Any] = Field(default_factory=list)


class TaskBidResponse(BaseModel):
    id: int
    task_id: int
    lab_id: int
    proposal_text: str
    proposed_budget: Decimal
    status: str
    created_at: datetime
    lab_name: str | None = None
    organization_name: str | None = None
    chat_id: int | None = None

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    id: int
    investor_id: int
    creator_id: int | None = None
    creator_name: str | None = None
    creator_role: str | None = None
    title: str
    description: str
    budget: Decimal
    deadline: str
    milestones: list[Any] = []
    moderation_status: str
    status: str
    created_at: datetime
    investor_name: str | None = None
    bids_count: int = 0
    bids: list[TaskBidResponse] = []

    class Config:
        from_attributes = True
