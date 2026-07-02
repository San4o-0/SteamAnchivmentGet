"""ORM-моделі. Використовуються ЛИШЕ як кеш поверх Steam Web API
(у Steam є ліміти запитів). Джерело правди — Steam; БД лише пришвидшує."""
from datetime import datetime, timezone

from sqlalchemy import JSON, BigInteger, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """Мінімальний профіль користувача (після OpenID-логіну)."""

    __tablename__ = "users"

    steam_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    avatar: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


class CacheEntry(Base):
    """Універсальний кеш JSON-відповідей Steam Web API з TTL.

    key — унікальний ідентифікатор запиту, напр.:
      owned:76561198000000000
      ach:76561198000000000:252490
      schema:252490
      global:252490
    """

    __tablename__ = "cache"
    __table_args__ = (UniqueConstraint("key", name="uq_cache_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(255), index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    def age_seconds(self) -> float:
        fetched = self.fetched_at
        if fetched.tzinfo is None:
            fetched = fetched.replace(tzinfo=timezone.utc)
        return (_utcnow() - fetched).total_seconds()
