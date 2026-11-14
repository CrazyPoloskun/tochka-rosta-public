import os
from contextlib import asynccontextmanager
from decimal import Decimal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
import app.models  # noqa: F401
from app.models.user import User
from app.models.finance import Account
from app.core.security import hash_password


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Создание папки загрузок
    upload_dir = os.environ.get("UPLOAD_DIR", "/app/uploads")
    os.makedirs(upload_dir, exist_ok=True)

    # 2. Инициализация таблиц БД
    async with engine.begin() as conn:
        # Гарантируем наличие новых столбцов в таблице users при накате обновлений (по одной команде для asyncpg)
        alter_statements = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) NOT NULL DEFAULT 'pending'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS patents_info JSON NOT NULL DEFAULT '[]'::json",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS moderation_comment TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS inn VARCHAR(30)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS ogrn VARCHAR(30)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS representative_name VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS documents JSON NOT NULL DEFAULT '[]'::json",
            "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS initiated_by_admin BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_summary TEXT",
            "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_sentiment VARCHAR(50)",
            "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_suggested_action TEXT",
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'completed'",
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_details JSON",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_syndicated BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS syndication_min_deposit NUMERIC(15, 2) NOT NULL DEFAULT 0.00",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS syndication_soft_cap NUMERIC(15, 2) NOT NULL DEFAULT 0.00",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS syndication_status VARCHAR(50) NOT NULL DEFAULT 'open'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS external_links JSON NOT NULL DEFAULT '[]'::json",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_files JSON NOT NULL DEFAULT '[]'::json",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_embedding JSON",
            "ALTER TABLE chats ADD COLUMN IF NOT EXISTS context_type VARCHAR(50)",
            "ALTER TABLE chats ADD COLUMN IF NOT EXISTS context_id INTEGER",
            "ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS gost_structured_data JSON",
            "ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS gost_docx_path VARCHAR(512)",
            "ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS gost_pdf_path VARCHAR(512)",
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS milestones JSON NOT NULL DEFAULT '[]'::json",
        ]
        for stmt in alter_statements:
            try:
                await conn.execute(text(stmt))
            except Exception as e:
                print(f"[DB INIT] Alter table warning: {e}")

        await conn.run_sync(Base.metadata.create_all)

    # 3. Создание стартового администратора платформы (если нет)
    async with AsyncSessionLocal() as session:
        admin_res = await session.execute(select(User).where(User.email == "admin@tochkarosta.ru"))
        admin_user = admin_res.scalar_one_or_none()
        if not admin_user:
            admin_user = User(
                email="admin@tochkarosta.ru",
                hashed_password=hash_password("admin12345"),
                full_name="Главный Администратор",
                organization_name="Платформа «Точка Роста»",
                role="investor",
                status="active",
                verification_status="verified",
                is_admin=True,
            )
            session.add(admin_user)
            await session.flush()

            acc = Account(
                user_id=admin_user.id,
                available_balance=Decimal("10000000.00"),
                frozen_balance=Decimal("0.00"),
            )
            session.add(acc)
            await session.commit()
            print("==> Admin account seeded: admin@tochkarosta.ru / admin12345")

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
