"""Агрегація даних профілю з того самого джерела, що /api/me та /api/library.

Один прохід по іграх користувача, який перевикористовується у /api/stats,
/api/leaderboard та /api/notifications. НЕ вводить нового пайплайну — спирається
на build_achievements + services.stats + пороги рідкості з services.roadmap.
"""
from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass

from ..steam.client import SteamClient
from . import stats as stats_svc
from .assembler import build_achievements
from .roadmap import AchievementInput, rarity_tier

# Обмеження глибоких запитів (як у routers/me.py), щоб не впертись у ліміти Steam.
MAX_DEEP_GAMES = 60


@dataclass
class GameAggregate:
    app_id: int
    name: str
    cover: str
    completion: float
    ach_done: int
    ach_total: int
    achs: list[AchievementInput]


@dataclass
class ProfileAggregate:
    steam_id: str
    name: str
    avatar: str
    games: int                 # усього ігор у бібліотеці
    achievements: int          # усього ВИБИТИХ ачивок
    perfect_games: int
    avg_completion: float
    rarity_score: float
    rarity_counts: dict[str, int]   # counts of UNLOCKED ach by tier
    game_aggs: list[GameAggregate]

    def unlocked_with_game(self) -> Iterator[tuple[GameAggregate, AchievementInput]]:
        for g in self.game_aggs:
            for a in g.achs:
                if a.unlocked:
                    yield g, a


async def build_profile_aggregate(
    steam: SteamClient,
    steam_id: str,
    max_deep: int = MAX_DEEP_GAMES,
    sort_by_playtime: bool = False,
) -> ProfileAggregate:
    """Збирає агрегацію профілю з того самого джерела, що /api/me.

    max_deep — скільки ігор сканувати вглиб (менше = швидше, але частковіші
    числа). sort_by_playtime — брати найбільш награні ігри першими (для
    «легкого» скану друзів це репрезентативніше за довільний порядок бібліотеки).
    """
    summary = await steam.get_player_summary(steam_id)
    games = await steam.get_owned_games(steam_id)

    games_with_ach = [g for g in games if g.get("has_community_visible_stats")]
    if sort_by_playtime:
        games_with_ach.sort(
            key=lambda g: g.get("playtime_forever", 0), reverse=True
        )

    game_aggs: list[GameAggregate] = []
    completions: list[float] = []
    total_unlocked = 0
    unlocked_percents: list[float] = []
    perfect = 0
    rarity_counts = {
        "common": 0,
        "uncommon": 0,
        "rare": 0,
        "epic": 0,
        "legendary": 0,
        "mythic": 0,
    }

    for g in games_with_ach[:max_deep]:
        app_id = g["appid"]
        achs = await build_achievements(steam, steam_id, app_id)
        if not achs:
            continue

        game_achs = [stats_svc.GameAch(a.unlocked, a.global_percent) for a in achs]
        completion = stats_svc.completion_percent(game_achs)
        ach_total = len(achs)
        ach_done = sum(1 for a in achs if a.unlocked)

        completions.append(completion)
        if ach_total > 0 and ach_done == ach_total:
            perfect += 1

        for a in achs:
            if a.unlocked:
                total_unlocked += 1
                unlocked_percents.append(a.global_percent)
                rarity_counts[rarity_tier(a.global_percent)] += 1

        game_aggs.append(
            GameAggregate(
                app_id=app_id,
                name=g.get("name", str(app_id)),
                cover=SteamClient.cover_url(app_id),
                completion=completion,
                ach_done=ach_done,
                ach_total=ach_total,
                achs=achs,
            )
        )

    avg_completion = (
        round(sum(completions) / len(completions), 1) if completions else 0.0
    )
    rarity_score = stats_svc.profile_rarity_score(unlocked_percents)

    return ProfileAggregate(
        steam_id=steam_id,
        name=summary.get("personaname", ""),
        avatar=summary.get("avatarfull", ""),
        games=len(games),
        achievements=total_unlocked,
        perfect_games=perfect,
        avg_completion=avg_completion,
        rarity_score=rarity_score,
        rarity_counts=rarity_counts,
        game_aggs=game_aggs,
    )
