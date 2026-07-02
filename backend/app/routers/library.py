"""GET /api/library — список ігор з метриками."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import get_current_steam_id
from ..db import get_session
from ..schemas import LibraryItem
from ..services import stats as stats_svc
from ..services.assembler import build_achievements
from ..steam.client import SteamClient

router = APIRouter(prefix="/api", tags=["library"])


@router.get("/library", response_model=list[LibraryItem])
async def get_library(
    steam_id: str = Depends(get_current_steam_id),
    session: AsyncSession = Depends(get_session),
):
    async with SteamClient(session) as steam:
        games = await steam.get_owned_games(steam_id)
        items: list[LibraryItem] = []

        for g in games:
            app_id = g["appid"]
            hours = round(g.get("playtime_forever", 0) / 60.0, 1)
            ts = g.get("rtime_last_played") or 0
            last_played = (
                datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
                if ts
                else None
            )

            ach_done = ach_total = 0
            completion = rarity = 0.0

            if g.get("has_community_visible_stats"):
                achs = await build_achievements(steam, steam_id, app_id)
                if achs:
                    ach_total = len(achs)
                    ach_done = sum(1 for a in achs if a.unlocked)
                    game_achs = [
                        stats_svc.GameAch(a.unlocked, a.global_percent) for a in achs
                    ]
                    completion = stats_svc.completion_percent(game_achs)
                    # rarity гри = середній globalPercent (менше = рідкісніше/важче)
                    rarity = round(
                        sum(a.global_percent for a in achs) / ach_total, 1
                    )

            items.append(
                LibraryItem(
                    app_id=app_id,
                    name=g.get("name", str(app_id)),
                    cover=SteamClient.cover_url(app_id),
                    completion=completion,
                    hours=hours,
                    ach_done=ach_done,
                    ach_total=ach_total,
                    rarity=rarity,
                    last_played=last_played,
                )
            )

    return items
