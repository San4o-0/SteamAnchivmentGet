"""Фікстури для інтеграційних тестів нових ендпоінтів.

Підміняємо auth-залежність та методи SteamClient фейковими даними, тож тести
не ходять у Steam і не чіпають БД.
"""
import pytest
from fastapi.testclient import TestClient

from app.auth.deps import get_current_steam_id
from app.db import get_session
from app.main import app
from app.services import store
from app.steam.client import SteamClient

TEST_STEAM_ID = "76561190000099999"

# Фейкові дані Steam: 2 гри з ачивками + 1 без.
_OWNED = [
    {"appid": 100, "name": "Alpha", "has_community_visible_stats": True},
    {"appid": 200, "name": "Beta", "has_community_visible_stats": True},
    {"appid": 300, "name": "NoStats", "has_community_visible_stats": False},
]

_SCHEMAS = {
    100: [
        {"name": "a1", "displayName": "Alpha One", "description": "d", "icon": "i1", "icongray": "g1"},
        {"name": "a2", "displayName": "Alpha Two", "description": "d", "icon": "i2", "icongray": "g2"},
    ],
    200: [
        {"name": "b1", "displayName": "Beta One", "description": "d", "icon": "i", "icongray": "g"},
        {"name": "b2", "displayName": "Beta Two", "description": "d", "icon": "i", "icongray": "g"},
        {"name": "b3", "displayName": "Beta Three", "description": "d", "icon": "i", "icongray": "g"},
    ],
}

_PLAYER = {
    100: [{"apiname": "a1", "achieved": 1}, {"apiname": "a2", "achieved": 1}],
    200: [
        {"apiname": "b1", "achieved": 1},
        {"apiname": "b2", "achieved": 0},
        {"apiname": "b3", "achieved": 0},
    ],
}

_GLOBAL = {
    100: {"a1": 2.0, "a2": 40.0},
    200: {"b1": 15.0, "b2": 60.0, "b3": 1.0},
}


@pytest.fixture(autouse=True)
def _patch_steam(monkeypatch):
    async def get_player_summary(self, steam_id):
        return {"personaname": "TestUser", "avatarfull": "http://avatar/full.jpg"}

    async def get_owned_games(self, steam_id):
        return list(_OWNED)

    async def get_schema(self, app_id):
        return {"achievements": _SCHEMAS.get(app_id, [])}

    async def get_player_achievements(self, steam_id, app_id):
        return list(_PLAYER.get(app_id, []))

    async def get_global_percentages(self, app_id):
        return dict(_GLOBAL.get(app_id, {}))

    monkeypatch.setattr(SteamClient, "get_player_summary", get_player_summary)
    monkeypatch.setattr(SteamClient, "get_owned_games", get_owned_games)
    monkeypatch.setattr(SteamClient, "get_schema", get_schema)
    monkeypatch.setattr(SteamClient, "get_player_achievements", get_player_achievements)
    monkeypatch.setattr(SteamClient, "get_global_percentages", get_global_percentages)


@pytest.fixture(autouse=True)
def _reset_store():
    store._settings_store.clear()
    store._read_store.clear()
    yield
    store._settings_store.clear()
    store._read_store.clear()


@pytest.fixture
def client():
    async def _fake_session():
        yield None

    app.dependency_overrides[get_current_steam_id] = lambda: TEST_STEAM_ID
    app.dependency_overrides[get_session] = _fake_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
