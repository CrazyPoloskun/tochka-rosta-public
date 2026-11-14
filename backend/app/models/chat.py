from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Boolean, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    # direct | project | support
    chat_type: Mapped[str] = mapped_column(String(50), default="direct", nullable=False, index=True)

    # Для P2P диалогов (сохранено для обратной совместимости)
    investor_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    lab_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # Контекст диалога: "task_bid" | "idea_proposal" | "idea_order" | "donation" | "project"
    context_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    context_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    members: Mapped[list["ChatMember"]] = relationship("ChatMember", back_populates="chat", cascade="all, delete-orphan")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
    attachments: Mapped[list["MessageAttachment"]] = relationship("MessageAttachment", back_populates="chat", cascade="all, delete-orphan")


class ChatMember(Base):
    __tablename__ = "chat_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # "lead_investor" | "co_investor" | "lab" | "admin" | "member"
    role: Mapped[str] = mapped_column(String(50), default="member", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_read_message_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    chat: Mapped["Chat"] = relationship("Chat", back_populates="members")
    user: Mapped["User"] = relationship("User")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chat: Mapped["Chat"] = relationship("Chat", back_populates="messages")
    sender: Mapped["User"] = relationship("User")
    attachments: Mapped[list["MessageAttachment"]] = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan")


class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=True, index=True)
    
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False, default="application/octet-stream")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chat: Mapped["Chat"] = relationship("Chat", back_populates="attachments")
    message: Mapped["Message | None"] = relationship("Message", back_populates="attachments")
