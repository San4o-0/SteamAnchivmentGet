"""Збірка даних зі Steam Web API у доменні об'єкти/схеми контракту.

Тут з'єднуються три джерела:
  schema (назви/іконки) + player achievements (вибито/ні) + global % (рідкість)
"""
from __future__ import annotations

from ..schemas import Ach
from ..steam.client import SteamClient
from .roadmap import AchievementInput, rarity_tier
from .stats import GameAch


def _icon_url(schema_ach: dict, unlocked: bool) -> str:
    return schema_ach.get("icon" if unlocked else "icongray") or schema_ach.get("icon", "")


async def build_achievements(
    steam: SteamClient, steam_id: str, app_id: int
) -> list[AchievementInput]:
    """Повний список ачивок гри як AchievementInput (для roadmap/stats/API)."""
    schema = await steam.get_schema(app_id)
    schema_list = schema.get("achievements", [])
    if not schema_list:
        return []

    player = await steam.get_player_achievements(steam_id, app_id)
    unlocked_map = {a["apiname"]: bool(a.get("achieved")) for a in player}

    global_map = await steam.get_global_percentages(app_id)

    result: list[AchievementInput] = []
    for s in schema_list:
        api_name = s.get("name", "")
        result.append(
            AchievementInput(
                id=api_name,
                name=s.get("displayName", api_name),
                desc=s.get("description", ""),
                icon=_icon_url(s, unlocked_map.get(api_name, False)),
                unlocked=unlocked_map.get(api_name, False),
                global_percent=global_map.get(api_name, 0.0),
            )
        )
    return result


def to_ach_schema(a: AchievementInput) -> Ach:
    return Ach(
        id=a.id,
        name=a.name,
        desc=a.desc,
        icon=a.icon,
        unlocked=a.unlocked,
        global_percent=round(a.global_percent, 1),
        rarity_tier=rarity_tier(a.global_percent),
    )


def to_game_ach(a: AchievementInput) -> GameAch:
    return GameAch(unlocked=a.unlocked, global_percent=a.global_percent)
