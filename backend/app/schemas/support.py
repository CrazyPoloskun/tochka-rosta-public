from datetime import datetime
from pydantic import BaseModel, Field


class TicketCreateRequest(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    priority: str = Field("normal", description="low | normal | high")
    subject: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)


class TicketReplyRequest(BaseModel):
    admin_reply: str = Field(..., min_length=1)
    status: str = Field("resolved", description="in_progress | resolved")


class SupportTicketResponse(BaseModel):
    id: int
    user_id: int
    initiated_by_admin: bool = False
    category: str
    priority: str
    subject: str
    description: str
    status: str
    admin_reply: str | None = None
    created_at: datetime
    user_name: str | None = None
    user_email: str | None = None

    class Config:
        from_attributes = True


class TicketMessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_id: int
    is_admin_reply: bool
    content: str
    created_at: datetime
    sender_name: str | None = None

    class Config:
        from_attributes = True


class TicketMessageCreateRequest(BaseModel):
    content: str = Field(..., min_length=1)


class TicketUpdateRequest(BaseModel):
    category: str | None = None
    priority: str | None = None
    subject: str | None = None
    description: str | None = None
    status: str | None = None
