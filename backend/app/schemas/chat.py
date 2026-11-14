from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class AttachmentResponse(BaseModel):
    id: int
    message_id: int
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMemberResponse(BaseModel):
    id: int
    chat_id: int
    user_id: int
    role: str
    full_name: str
    organization_name: str | None = None
    user_role: str  # "investor" | "lab"
    invested_amount: Decimal | None = None
    share_percent: Decimal | None = None
    joined_at: datetime
    is_online: bool = False

    class Config:
        from_attributes = True


class MessageSendRequest(BaseModel):
    content: str = Field(default="", max_length=5000)
    attachment_ids: list[int] = Field(default_factory=list)


class MessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    content: str
    is_read: bool
    is_system: bool = False
    created_at: datetime
    sender_name: str | None = None
    sender_role: str | None = None
    attachments: list[AttachmentResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    id: int
    chat_type: str = "direct"
    investor_id: int | None = None
    lab_id: int | None = None
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
    members_count: int = 2
    members: list[ChatMemberResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class FileUploadResponse(BaseModel):
    id: int
    file_name: str
    file_size: int
    mime_type: str
    download_url: str
