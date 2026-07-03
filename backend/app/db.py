"""Async SQLAlchemy: engine, сесія, базовий клас, ініціалізація схеми."""
from collections.abc import AsyncGenerator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings

settings = get_settings()


def _normalize_db_url(url: str) -> tuple[str, dict]:
    """Робить URL сумісним з asyncpg.

    Провайдери (Neon/Supabase/Render) дають libpq-рядок
    `postgresql://…?sslmode=require`, який asyncpg не розуміє. Тут:
      • `postgres[ql]://` → `postgresql+asyncpg://`;
      • викидаємо libpq-only параметри (`sslmode`, `channel_binding`), які
        asyncpg відхилив би, і за потреби вмикаємо TLS через connect_args.
    Локальний sqlite та вже-asyncpg-URL лишаються некритично зміненими.
    """
    parts = urlsplit(url)
    scheme = parts.scheme
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+asyncpg"

    connect_args: dict = {}
    if scheme.endswith("asyncpg"):
        q = dict(parse_qsl(parts.query))
        sslmode = q.pop("sslmode", None)
        q.pop("channel_binding", None)  # libpq-only, asyncpg падає на ньому
        if sslmode in ("require", "verify-ca", "verify-full"):
            connect_args["ssl"] = True
        elif sslmode == "disable":
            connect_args["ssl"] = False
        # без sslmode (напр. локальний Postgres у docker) — TLS не нав'язуємо
        return (
            urlunsplit((scheme, parts.netloc, parts.path, urlencode(q), parts.fragment)),
            connect_args,
        )

    return url, connect_args


_db_url, _connect_args = _normalize_db_url(settings.database_url)
engine = create_async_engine(
    _db_url, echo=False, pool_pre_ping=True, connect_args=_connect_args
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    """Створює таблиці кешу, якщо їх ще немає (для MVP — без Alembic)."""
    from . import models  # noqa: F401  (реєструє моделі в метадані)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
