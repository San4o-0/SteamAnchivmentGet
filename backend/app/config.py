"""Налаштування застосунку. Читаються з оточення / .env файлу."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Steam
    steam_api_key: str = ""

    # Auth
    jwt_secret: str = "dev-insecure-secret-change-me"
    jwt_expire_minutes: int = 60 * 24 * 7
    jwt_algorithm: str = "HS256"

    # URLs
    base_url: str = "http://localhost:8000"
    frontend_return_url: str = "http://localhost:5173/auth/callback?token={token}"

    # DB
    database_url: str = "sqlite+aiosqlite:///./sam.db"

    # Локальний агент (Потік 2)
    agent_url: str = "http://127.0.0.1:57343"

    # CORS (кома-розділений список)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Кеш
    cache_ttl_seconds: int = 1800

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
