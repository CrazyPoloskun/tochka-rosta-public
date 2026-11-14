from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class InvestorRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150, description="Имя инвестора или донора")
    email: EmailStr = Field(..., description="Электронная почта")
    password: str = Field(..., min_length=6, max_length=100, description="Пароль")


class LabRegisterRequest(BaseModel):
    organization_name: str = Field(..., min_length=2, max_length=250, description="Название НИИ или научной организации")
    inn: str = Field(..., min_length=10, max_length=12, description="ИНН организации (10 или 12 цифр)")
    ogrn: str = Field(..., min_length=13, max_length=15, description="ОГРН / ОГРНИП")
    representative_name: str = Field(..., min_length=2, max_length=150, description="ФИО представителя НИИ")
    email: EmailStr = Field(..., description="Рабочая электронная почта")
    password: str = Field(..., min_length=6, max_length=100, description="Пароль")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Электронная почта")
    password: str = Field(..., description="Пароль")


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=150, description="Имя пользователя / Организации")
    representative_name: str | None = Field(None, min_length=2, max_length=150, description="ФИО представителя")
    organization_name: str | None = Field(None, min_length=2, max_length=250, description="Название организации")
    inn: str | None = Field(None, description="ИНН")
    ogrn: str | None = Field(None, description="ОГРН")
    patents_info: list[dict] | None = Field(None, description="Список патентов")
    documents: list[dict] | None = Field(None, description="Уставные документы")
    bio: str | None = Field(None, description="Описание деятельности и компетенций")
    website_url: str | None = Field(None, description="Официальный сайт")
    external_links: list[dict] | None = Field(None, description="Внешние ссылки [{title, url}]")
    portfolio_files: list[dict] | None = Field(None, description="Файлы портфолио")
    request_reverification: bool | None = Field(False, description="Отправить на повторную модерацию")


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    status: str
    verification_status: str = "pending"
    is_admin: bool = False
    is_active: bool = True
    full_name: str
    organization_name: str | None = None
    inn: str | None = None
    ogrn: str | None = None
    representative_name: str | None = None
    patents_info: list[dict] | list[str] = []
    documents: list[dict] | list[str] = []
    bio: str | None = None
    website_url: str | None = None
    external_links: list[dict] = []
    portfolio_files: list[dict] = []
    moderation_comment: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class PublicUserProfileResponse(BaseModel):
    id: int
    full_name: str
    organization_name: str | None = None
    role: str
    verification_status: str = "pending"
    inn: str | None = None
    ogrn: str | None = None
    representative_name: str | None = None
    bio: str | None = None
    website_url: str | None = None
    external_links: list[dict] = []
    portfolio_files: list[dict] = []
    patents_info: list[dict] | list[str] = []
    completed_projects_count: int = 0
    active_projects_count: int = 0
    ideas_count: int = 0
    tasks_count: int = 0
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh JWT токен")


class TokenRefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
