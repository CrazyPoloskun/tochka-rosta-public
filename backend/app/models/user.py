from datetime import datetime
from typing import Any
from sqlalchemy import String, DateTime, Integer, Boolean, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # "investor" (Инвестор / Донор) или "lab" (НИИ / Лаборатория)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="investor")
    
    # "active" или "pending"
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    
    # "pending" | "verified" | "rejected"
    verification_status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    
    # Флаг администратора платформы
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Флаг активности аккаунта (блокировка/разблокировка)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Дополнительные поля для НИИ и организаций
    organization_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    inn: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ogrn: Mapped[str | None] = mapped_column(String(30), nullable=True)
    representative_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Список патентов и свидетельств [{number, title, year}]
    patents_info: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    # Загруженные уставные документы [{name, path, size, type}]
    documents: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)

    # Расширенный профиль организации
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Внешние ссылки [{title: str, url: str}]
    external_links: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    # Портфолио и презентации [{id: str, name: str, path: str, url: str, size: int, uploaded_at: str}]
    portfolio_files: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    # Вектор профиля для семантического матчинга
    profile_embedding: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    
    # Комментарий модератора / причина отказа
    moderation_comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
