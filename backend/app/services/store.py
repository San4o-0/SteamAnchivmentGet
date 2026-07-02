"""Просте per-user сховище у пам'яті (MVP): налаштування + стан прочитаних сповіщень.

Модульні dict-и, кейовані steamId. Достатньо для single-user інструменту; за потреби
легко замінити на БД, не міняючи роутери.
"""
from __future__ import annotations

from ..config import get_settings
from ..schemas import UserSettings

# steamId -> serialized UserSettings (field names / snake_case)
_settings_store: dict[str, dict] = {}
# steamId -> set of notification ids позначених прочитаними
_read_store: dict[str, set[str]] = {}


def get_user_settings(steam_id: str) -> UserSettings:
    data = _settings_store.get(steam_id)
    if data is None:
        # Дефолт: agentUrl синхронізуємо з конфігом бекенда.
        return UserSettings(agent_url=get_settings().agent_url)
    return UserSettings(**data)


def save_user_settings(steam_id: str, settings: UserSettings) -> UserSettings:
    _settings_store[steam_id] = settings.model_dump()
    return settings


def get_read_ids(steam_id: str) -> set[str]:
    return _read_store.setdefault(steam_id, set())


def mark_read(steam_id: str, ids: list[str]) -> None:
    get_read_ids(steam_id).update(ids)
