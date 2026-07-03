"""Обгортка над Steam Web API з кешуванням у БД (TTL).

Документація методів:
  IPlayerService/GetOwnedGames
  ISteamUserStats/GetPlayerAchievements
  ISteamUserStats/GetSchemaForGame (via ISteamUserStats/GetSchemaForGame v2)
  ISteamUserStats/GetGlobalAchievementPercentagesForApp
  ISteamUser/GetPlayerSummaries
"""
from __future__ import annotations

import re
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models import CacheEntry

BASE = "https://api.steampowered.com"
STORE_CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps"

_STEAMID64_RE = re.compile(r"^\d{17}$")
_PROFILE_URL_RE = re.compile(r"steamcommunity\.com/profiles/(\d{17})")
_VANITY_URL_RE = re.compile(r"steamcommunity\.com/id/([^/?#]+)")


async def resolve_steam_id(raw: str) -> str | None:
    """Перетворює будь-який ввід користувача на steamID64 або None.

    Приймає: steamID64 (17 цифр), .../profiles/765..., .../id/nick, або голий нік.
    Vanity-ніки резолвляться через ISteamUser/ResolveVanityURL (ключем сервісу).
    """
    raw = (raw or "").strip()
    if not raw:
        return None

    if _STEAMID64_RE.match(raw):
        return raw

    m = _PROFILE_URL_RE.search(raw)
    if m:
        return m.group(1)

    m = _VANITY_URL_RE.search(raw)
    vanity = m.group(1) if m else raw
    if "/" in vanity or not vanity:
        return None  # незрозумілий URL, не vanity

    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            resp = await http.get(
                f"{BASE}/ISteamUser/ResolveVanityURL/v1/",
                params={"key": settings.steam_api_key, "vanityurl": vanity},
            )
            resp.raise_for_status()
            data = resp.json().get("response", {})
    except httpx.HTTPError:
        # Збій Steam не має валити /auth/manual у 500 — трактуємо як «не розпізнано».
        return None
    return data.get("steamid") if data.get("success") == 1 else None


def is_steam_id64(value: str) -> bool:
    """True, якщо рядок — валідний steamID64 (17 цифр, 7656119…)."""
    return bool(_STEAMID64_RE.match((value or "").strip()))


class SteamClient:
    def __init__(self, session: AsyncSession, http: httpx.AsyncClient | None = None):
        self._settings = get_settings()
        self._session = session
        self._http = http
        self._owns_http = http is None

    async def __aenter__(self) -> "SteamClient":
        if self._http is None:
            self._http = httpx.AsyncClient(timeout=20.0)
        return self

    async def __aexit__(self, *exc: Any) -> None:
        if self._owns_http and self._http is not None:
            await self._http.aclose()

    # ---------- кеш ----------
    async def _cached(self, key: str, fetch, ttl: int | None = None) -> dict:
        ttl = self._settings.cache_ttl_seconds if ttl is None else ttl
        row = (
            await self._session.execute(select(CacheEntry).where(CacheEntry.key == key))
        ).scalar_one_or_none()
        if row is not None and row.age_seconds() < ttl:
            return row.payload

        try:
            payload = await fetch()
        except httpx.HTTPError:
            # Steam недоступний / приватний профіль / 429 / таймаут: НЕ 500-имо.
            # Віддаємо протермінований кеш, якщо є (краще за порожнечу), інакше {}
            # — і НЕ кешуємо збій, щоб при відновленні Steam одразу підтягти дані.
            # Усі виклики читають результат через .get(...), тож {} безпечне.
            return row.payload if row is not None else {}

        if row is None:
            self._session.add(CacheEntry(key=key, payload=payload))
        else:
            row.payload = payload
            from datetime import datetime, timezone

            row.fetched_at = datetime.now(timezone.utc)
        await self._session.commit()
        return payload

    async def _get(self, path: str, **params) -> dict:
        params["key"] = self._settings.steam_api_key
        assert self._http is not None
        resp = await self._http.get(f"{BASE}/{path}", params=params)
        resp.raise_for_status()
        return resp.json()

    # ---------- методи API ----------
    async def get_player_summary(self, steam_id: str) -> dict:
        async def fetch():
            data = await self._get(
                "ISteamUser/GetPlayerSummaries/v2/", steamids=steam_id
            )
            players = data.get("response", {}).get("players", [])
            return players[0] if players else {}

        return await self._cached(f"summary:{steam_id}", fetch, ttl=3600)

    async def get_owned_games(self, steam_id: str) -> list[dict]:
        async def fetch():
            data = await self._get(
                "IPlayerService/GetOwnedGames/v1/",
                steamid=steam_id,
                include_appinfo=1,
                include_played_free_games=1,
            )
            return {"games": data.get("response", {}).get("games", [])}

        payload = await self._cached(f"owned:{steam_id}", fetch)
        return payload.get("games", [])

    async def get_schema(self, app_id: int) -> dict:
        """Схема гри: назви/описи/іконки ачивок. Глобальна (не залежить від юзера)."""

        async def fetch():
            data = await self._get(
                "ISteamUserStats/GetSchemaForGame/v2/", appid=app_id
            )
            game = data.get("game", {})
            stats = game.get("availableGameStats", {})
            return {"achievements": stats.get("achievements", [])}

        return await self._cached(f"schema:{app_id}", fetch, ttl=86400)

    async def get_player_achievements(self, steam_id: str, app_id: int) -> list[dict]:
        async def fetch():
            try:
                data = await self._get(
                    "ISteamUserStats/GetPlayerAchievements/v1/",
                    steamid=steam_id,
                    appid=app_id,
                )
            except httpx.HTTPStatusError:
                # Гра без ачивок / приватний профіль -> порожньо
                return {"achievements": []}
            ps = data.get("playerstats", {})
            return {"achievements": ps.get("achievements", []) if ps.get("success") else []}

        payload = await self._cached(f"ach:{steam_id}:{app_id}", fetch, ttl=600)
        return payload.get("achievements", [])

    async def get_global_percentages(self, app_id: int) -> dict[str, float]:
        """{ achievement_name: percent } — глобальна рідкість."""

        async def fetch():
            data = await self._get(
                "ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/",
                gameid=app_id,
            )
            arr = data.get("achievementpercentages", {}).get("achievements", [])
            return {"map": {a["name"]: float(a["percent"]) for a in arr}}

        payload = await self._cached(f"global:{app_id}", fetch, ttl=86400)
        return payload.get("map", {})

    async def get_steam_level(self, steam_id: str) -> int:
        """Рівень Steam-профілю (IPlayerService/GetSteamLevel). 0, якщо приховано."""

        async def fetch():
            try:
                data = await self._get(
                    "IPlayerService/GetSteamLevel/v1/", steamid=steam_id
                )
            except httpx.HTTPStatusError:
                return {"level": 0}
            lvl = data.get("response", {}).get("player_level")
            return {"level": int(lvl) if lvl is not None else 0}

        payload = await self._cached(f"level:{steam_id}", fetch, ttl=3600)
        return payload.get("level", 0)

    async def get_friends(self, steam_id: str) -> list[dict]:
        """Список друзів [{steamid, friend_since}].

        Працює лише якщо friends list профілю ПУБЛІЧНИЙ; інакше Steam віддає
        401/403 → повертаємо порожньо (приватний список не відрізняємо від
        «немає друзів» — обидва кейси = порожньо).
        """

        async def fetch():
            try:
                data = await self._get(
                    "ISteamUser/GetFriendList/v1/",
                    steamid=steam_id,
                    relationship="friend",
                )
            except httpx.HTTPStatusError:
                return {"friends": []}
            friends = data.get("friendslist", {}).get("friends", [])
            return {
                "friends": [
                    {
                        "steamid": f["steamid"],
                        "friend_since": int(f.get("friend_since", 0) or 0),
                    }
                    for f in friends
                    if f.get("steamid")
                ]
            }

        payload = await self._cached(f"friends:{steam_id}", fetch, ttl=3600)
        return payload.get("friends", [])

    # ---------- утиліти ----------
    @staticmethod
    def cover_url(app_id: int) -> str:
        return f"{STORE_CDN}/{app_id}/library_600x900.jpg"
