"""Збірка картки друзів: список друзів профілю + «легка» статистика по кожному.

Дані дорогі (повний скан на друга = десятки запитів), тож:
  • беремо лише перших `limit` друзів;
  • на кожного рахуємо агрегат із МЕНШОЮ глибиною (FRIEND_DEEP_GAMES) і за
    найбільш награними іграми — тож числа партійні, але репрезентативні;
  • рахуємо паралельно, але з семафором і ОКРЕМОЮ сесією БД на задачу
    (AsyncSession не можна ділити між конкурентними корутинами).
"""
from __future__ import annotations

import asyncio

from ..db import SessionLocal
from ..steam.client import SteamClient
from .aggregate import build_profile_aggregate

# Глибина «легкого» скану на друга та стеля кількості друзів на відповідь.
FRIEND_DEEP_GAMES = 12
MAX_FRIENDS = 50
# Обмежуємо конкурентність: бережемо ліміти Steam і уникаємо "database is locked".
_SEM = asyncio.Semaphore(5)


async def _friend_card(steam_id: str, friend_since: int) -> dict:
    async with _SEM:
        async with SessionLocal() as session:
            async with SteamClient(session) as steam:
                agg = await build_profile_aggregate(
                    steam,
                    steam_id,
                    max_deep=FRIEND_DEEP_GAMES,
                    sort_by_playtime=True,
                )
                level = await steam.get_steam_level(steam_id)
    return {
        "steam_id": agg.steam_id,
        "name": agg.name or steam_id,
        "avatar": agg.avatar,
        "level": level,
        "games": agg.games,
        "achievements": agg.achievements,
        "perfect_games": agg.perfect_games,
        "rarity_score": agg.rarity_score,
        "avg_completion": agg.avg_completion,
        "friend_since": friend_since,
    }


async def build_friends(
    steam: SteamClient, steam_id: str, limit: int
) -> tuple[int, list[dict]]:
    """(total, cards). total — усього друзів; cards — порахований підмножинний зріз."""
    friends = await steam.get_friends(steam_id)
    total = len(friends)
    subset = friends[: max(1, min(limit, MAX_FRIENDS))]

    cards = await asyncio.gather(
        *(_friend_card(f["steamid"], f["friend_since"]) for f in subset),
        return_exceptions=True,
    )
    # Друзі, чий скан упав (приватний профіль/тимчасова помилка), просто випадають.
    ok = [c for c in cards if isinstance(c, dict)]
    return total, ok
