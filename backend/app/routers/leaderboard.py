"""GET /api/leaderboard — ліга за rarityScore.

Single-user інструмент: реальний запис — поточний користувач (з його даних),
решта — детермінований МОК-ростер суперників (без випадковості). Усе ранжуємо
разом за rarityScore спадно.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import get_current_steam_id
from ..db import get_session
from ..schemas import LeaderboardEntry
from ..services.aggregate import build_profile_aggregate
from ..steam.client import SteamClient

router = APIRouter(prefix="/api", tags=["leaderboard"])

# Ростер суперників — РЕАЛЬНІ публічні Steam-акаунти (справжні люди).
# Очки — снапшот, порахований тим самим движком build_profile_aggregate, що й
# для поточного користувача (глибина сканування обмежена, тож числа партійні,
# але це справжні дані реальних профілів, а не вигаданий мок).
# (steam_id, name, rarity_score, achievements, perfect_games, avatar)
_RIVALS = [
    ("76561197966896320", "Skaery", 100.0, 1223, 13, "https://avatars.steamstatic.com/474579a00ebdbd10884ead409a3362a59788a3b4_full.jpg"),
    ("76561197960343708", "-hi7.eM.hiGh-", 88.0, 224, 1, "https://avatars.steamstatic.com/da515aaf83a0ed9e30dc3b4495a424e3cb032400_full.jpg"),
    ("76561197969158018", "Menin Gate", 73.3, 208, 1, "https://avatars.steamstatic.com/4c632460497f4dd6f74e74bc4371ac8a6d0b09a1_full.jpg"),
    ("76561197960272945", "Cocopah", 66.9, 91, 0, "https://avatars.steamstatic.com/56d3ab201eb363f637ba930564e893cf8e97f2bc_full.jpg"),
    ("76561197961806704", "YASTA", 66.6, 25, 1, "https://avatars.steamstatic.com/289323abb04699ae12e1355d90d58edc90d5cdf7_full.jpg"),
    ("76561197960618312", "ohjunior", 60.4, 1, 1, "https://avatars.steamstatic.com/e6687b030ead732283163e5ab22927d6e82d2e81_full.jpg"),
    ("76561197962277384", "Necr0", 60.4, 1, 1, "https://avatars.steamstatic.com/7a11c4a9f7c084298d5195bc7c3a8a89a4b2b89d_full.jpg"),
    ("76561197980435204", "twl`", 60.1, 216, 1, "https://avatars.steamstatic.com/4e5064e8327da3e6ab11a3d7f7dd7a905337f0c0_full.jpg"),
    ("76561197963523367", "Hyp", 54.2, 81, 1, "https://avatars.steamstatic.com/e74ee690fcab66134b7776503e4f76215e09f76e_full.jpg"),
    ("76561197967897275", "Metr0 私", 42.7, 21, 1, "https://avatars.steamstatic.com/666b7f9c953c639e9daa2b064e2682fcbb254141_full.jpg"),
]


def _avatar(seed: str) -> str:
    return f"https://api.dicebear.com/7.x/bottts/svg?seed={seed}"


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    steam_id: str = Depends(get_current_steam_id),
    session: AsyncSession = Depends(get_session),
):
    async with SteamClient(session) as steam:
        agg = await build_profile_aggregate(steam, steam_id)

    rows: list[dict] = [
        {
            "steam_id": sid,
            "name": name,
            "avatar": avatar,
            "rarity_score": score,
            "achievements": ach,
            "perfect_games": perfect,
            "is_me": False,
        }
        for sid, name, score, ach, perfect, avatar in _RIVALS
    ]
    rows.append(
        {
            "steam_id": agg.steam_id,
            "name": agg.name or "Ти",
            "avatar": agg.avatar or _avatar(agg.steam_id),
            "rarity_score": agg.rarity_score,
            "achievements": agg.achievements,
            "perfect_games": agg.perfect_games,
            "is_me": True,
        }
    )

    # Ранжуємо за rarityScore спадно; тай-брейк — за achievements, тоді steamId.
    rows.sort(
        key=lambda r: (-r["rarity_score"], -r["achievements"], r["steam_id"])
    )

    return [
        LeaderboardEntry(rank=i + 1, **row) for i, row in enumerate(rows)
    ]
