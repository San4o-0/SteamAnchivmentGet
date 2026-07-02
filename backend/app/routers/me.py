"""GET /api/me — профіль + загальна статистика."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import get_current_steam_id
from ..db import get_session
from ..schemas import Me, ProfileStats
from ..services import stats as stats_svc
from ..services.assembler import build_achievements
from ..steam.client import SteamClient

router = APIRouter(prefix="/api", tags=["me"])


@router.get("/me", response_model=Me)
async def get_me(
    steam_id: str = Depends(get_current_steam_id),
    session: AsyncSession = Depends(get_session),
):
    async with SteamClient(session) as steam:
        summary = await steam.get_player_summary(steam_id)
        games = await steam.get_owned_games(steam_id)

        # Рахуємо агреговані метрики по іграх, у яких є ачивки.
        completions: list[float] = []
        total_ach = 0
        unlocked_percents: list[float] = []

        # Обмежуємо кількість глибоких запитів, щоб не впертись у ліміти Steam.
        games_with_ach = [g for g in games if g.get("has_community_visible_stats")]
        for g in games_with_ach[:60]:
            achs = await build_achievements(steam, steam_id, g["appid"])
            if not achs:
                continue
            game_achs = [stats_svc.GameAch(a.unlocked, a.global_percent) for a in achs]
            completions.append(stats_svc.completion_percent(game_achs))
            for a in achs:
                if a.unlocked:
                    total_ach += 1
                    unlocked_percents.append(a.global_percent)

        avg_completion = round(sum(completions) / len(completions), 1) if completions else 0.0
        rarity_score = stats_svc.profile_rarity_score(unlocked_percents)

    return Me(
        steam_id=steam_id,
        name=summary.get("personaname", ""),
        avatar=summary.get("avatarfull", ""),
        stats=ProfileStats(
            games=len(games),
            achievements=total_ach,
            avg_completion=avg_completion,
            rarity_score=rarity_score,
        ),
    )
