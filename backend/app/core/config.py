from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Tochka Rosta API"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "root"
    POSTGRES_DB: str = "tochka_rosta"

    SECRET_KEY: str = "tochka-rosta-secure-jwt-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI Integrations (Multi-provider support: OpenRouter, OpenAI, Gemini, Neural Engine)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "google/gemini-2.5-flash"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_PROXY: str | None = None  # Например: "http://user:pass@proxy-ip:port" или "socks5://127.0.0.1:10808"
    AI_PROXY: str | None = None          # Общий прокси для всех зарубежных AI-провайдеров

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    FALLBACK_AI_URL: str = "https://text.pollinations.ai/openai/chat/completions"
    FALLBACK_AI_MODEL: str = "openai"

    # External Integrations (Optional)
    DADATA_API_KEY: str = ""
    UPLOAD_DIR: str = "uploads"

    DATABASE_URL: str | None = None

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: str | None, info) -> str:
        data = info.data if info and hasattr(info, "data") and info.data else {}
        server = data.get("POSTGRES_SERVER") or "localhost"
        user = data.get("POSTGRES_USER") or "postgres"
        password = data.get("POSTGRES_PASSWORD") or "root"
        port = data.get("POSTGRES_PORT") or 5432
        db = data.get("POSTGRES_DB") or "tochka_rosta"

        if isinstance(v, str) and v.strip():
            url = v.strip()
            # If server is explicitly set to a container host (e.g. 'db') but DATABASE_URL in .env has localhost/127.0.0.1
            if server not in ("localhost", "127.0.0.1"):
                url = url.replace("@localhost:", f"@{server}:").replace("@127.0.0.1:", f"@{server}:")
                url = url.replace("@localhost/", f"@{server}/").replace("@127.0.0.1/", f"@{server}/")
            if url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            return url

        return f"postgresql+asyncpg://{user}:{password}@{server}:{port}/{db}"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
