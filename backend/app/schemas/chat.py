from datetime import datetime
from pydantic import BaseModel, Field


class MessageSendRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    content: str
    is_read: bool
    created_at: datetime
    sender_name: str | None = None

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    id: int
    investor_id: int
    lab_id: int
    project_id: int | None = None
    context_type: str | None = None
    context_id: int | None = None
    title: str
    updated_at: datetime
    other_party_id: int | None = None
    other_party_name: str | None = None
    other_party_role: str | None = None
    unread_count: int = 0
    last_message: str | None = None

    class Config:
        from_attributes = True
