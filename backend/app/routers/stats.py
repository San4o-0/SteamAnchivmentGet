"""GET /api/stats — агрегована статистика профілю (те саме джерело, що /api/me)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import get_current_steam_id
from ..db import get_session
from ..schemas import (
    CompletionBucket,
    PlayerProfile,
    RarityCounts,
    Stats,
    StatsTotals,
    TopGame,
    TopRareUnlock,
)
from ..services.aggregate import ProfileAggregate, build_profile_aggregate
from ..services.assembler import to_ach_schema
from ..steam.client import SteamClient, is_steam_id64

router = APIRouter(prefix="/api", tags=["stats"])

_BUCKETS = ["0–25%", "25–50%", "50–75%", "75–99%", "100%"]


def _bucket_label(completion: float) -> str:
    if completion >= 100.0:
        return "100%"
    if completion >= 75.0:
        return "75–99%"
    if completion >= 50.0:
        return "50–75%"
    if completion >= 25.0:
        return "25–50%"
    return "0–25%"


def stats_from_aggregate(agg: ProfileAggregate) -> Stats:
    """Будує Stats із готового агрегату. Спільне для /stats і /player/{id}."""
    # completionBuckets — розподіл ігор (з ачивками) за завершеністю.
    counts = {label: 0 for label in _BUCKETS}
    for g in agg.game_aggs:
        counts[_bucket_label(g.completion)] += 1
    completion_buckets = [
        CompletionBucket(label=label, count=counts[label]) for label in _BUCKETS
    ]

    # topRareUnlocks — найрідкісніші ВИБИТІ ачивки, до 6.
    rarest = sorted(
        agg.unlocked_with_game(),
        key=lambda ga: (ga[1].global_percent, ga[0].app_id, ga[1].id),
    )[:6]
    top_rare_unlocks = [
        TopRareUnlock(game_name=g.name, app_id=g.app_id, ach=to_ach_schema(a))
        for g, a in rarest
    ]

    # topGames — найближчі до 100%, до 6.
    top = sorted(agg.game_aggs, key=lambda g: (-g.completion, g.name.lower()))[:6]
    top_games = [
        TopGame(
            app_id=g.app_id,
            name=g.name,
            cover=g.cover,
            completion=g.completion,
            ach_done=g.ach_done,
            ach_total=g.ach_total,
        )
        for g in top
    ]

    return Stats(
        totals=StatsTotals(
            games=agg.games,
            achievements=agg.achievements,
            perfect_games=agg.perfect_games,
            avg_completion=agg.avg_completion,
            rarity_score=agg.rarity_score,
        ),
        rarity=RarityCounts(**agg.rarity_counts),
        completion_buckets=completion_buckets,
        top_rare_unlocks=top_rare_unlocks,
        top_games=top_games,
    )


@router.get("/stats", response_model=Stats)
async def get_stats(
    steam_id: str = Depends(get_current_steam_id),
    session: AsyncSession = Depends(get_session),
):
    async with SteamClient(session) as steam:
        agg = await build_profile_aggregate(steam, steam_id)
    return stats_from_aggregate(agg)


@router.get("/player/{steam_id}", response_model=PlayerProfile)
async def get_player(
    steam_id: str,
    _viewer: str = Depends(get_current_steam_id),  # лише для залогінених
    session: AsyncSession = Depends(get_session),
):
    """Публічний профіль будь-якого гравця (клік у Лізі). Лише публічні дані."""
    # Валідуємо формат ДО важкого deep-scan: інакше довільний ввід тригерить
    # ~180 запитів до Steam (амплифікація/DoS + вичерпання квоти).
    if not is_steam_id64(steam_id):
        raise HTTPException(status_code=400, detail="Invalid steamId (expected 17-digit steamID64)")
    async with SteamClient(session) as steam:
        agg = await build_profile_aggregate(steam, steam_id)
    return PlayerProfile(
        steam_id=agg.steam_id,
        name=agg.name or steam_id,
        avatar=agg.avatar,
        stats=stats_from_aggregate(agg),
    )
