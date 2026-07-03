"""Налаштування застосунку. Читаються з оточення / .env файлу."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# Публічна константа — небезпечно лишати в проді (токени підробляються).
INSECURE_DEFAULT_SECRET = "dev-insecure-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Оточення: "dev" | "prod". У проді вмикається fail-fast перевірка секретів.
    env: str = "dev"

    # Steam
    steam_api_key: str = ""

    # Auth
    jwt_secret: str = INSECURE_DEFAULT_SECRET
    jwt_expire_minutes: int = 60 * 24 * 7
    jwt_algorithm: str = "HS256"

    # URLs. Токен віддаємо у FRAGMENT (#), а не query (?) — щоб JWT не потрапляв
    # у логи сервера/проксі й у Referer.
    base_url: str = "http://localhost:8000"
    frontend_return_url: str = "http://localhost:5173/auth/callback#token={token}"

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

    @property
    def is_prod(self) -> bool:
        return self.env.strip().lower() in ("prod", "production")

    def check_production(self) -> None:
        """Fail-fast у проді: не даємо піднятись зі слабкими/дефолтними секретами,
        інакше всі JWT підписані публічною константою й тривіально підробляються."""
        if not self.is_prod:
            return
        problems: list[str] = []
        if (
            not self.jwt_secret
            or self.jwt_secret == INSECURE_DEFAULT_SECRET
            or len(self.jwt_secret) < 32
        ):
            problems.append("JWT_SECRET must be a strong (>=32 chars) non-default value")
        if not self.steam_api_key:
            problems.append("STEAM_API_KEY must be set")
        if problems:
            raise RuntimeError(
                "Insecure production configuration (ENV=prod): " + "; ".join(problems)
            )


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.check_production()
    return s
