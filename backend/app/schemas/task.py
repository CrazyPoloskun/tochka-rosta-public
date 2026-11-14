from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class TaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    budget: Decimal = Field(..., ge=0)
    deadline: str = Field(..., min_length=1, max_length=50)


class TaskBidCreateRequest(BaseModel):
    proposal_text: str = Field(..., min_length=1)
    proposed_budget: Decimal = Field(..., ge=0)


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
    title: str
    description: str
    budget: Decimal
    deadline: str
    moderation_status: str
    status: str
    created_at: datetime
    investor_name: str | None = None
    bids_count: int = 0
    bids: list[TaskBidResponse] = []

    class Config:
        from_attributes = True
