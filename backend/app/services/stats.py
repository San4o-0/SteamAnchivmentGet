"""Похідні метрики: completion, difficulty, estHoursTo100, rarityScore.

Чисті функції — жодних БД/HTTP. Легко тестувати й перевикористовувати.
"""
from __future__ import annotations

from dataclasses import dataclass

from .roadmap import AchievementInput, estimate_eta_minutes


@dataclass
class GameAch:
    unlocked: bool
    global_percent: float


def completion_percent(achievements: list[GameAch]) -> float:
    if not achievements:
        return 0.0
    done = sum(1 for a in achievements if a.unlocked)
    return round(done / len(achievements) * 100.0, 1)


def game_difficulty(achievements: list[GameAch]) -> int:
    """Складність гри у зірках 1..5 на основі середньої рідкості ачивок.

    Чим нижчий середній globalPercent — тим важче отримати 100%.
    """
    if not achievements:
        return 1
    avg = sum(a.global_percent for a in achievements) / len(achievements)
    # avg високий (легко) -> мало зірок; avg низький (важко) -> багато зірок.
    if avg >= 50:
        return 1
    if avg >= 30:
        return 2
    if avg >= 15:
        return 3
    if avg >= 6:
        return 4
    return 5


def est_hours_to_100(achievements: list[AchievementInput]) -> float:
    """Оцінка годин до 100% = сума ETA ще не вибитих ачивок."""
    minutes = sum(
        estimate_eta_minutes(a) for a in achievements if not a.unlocked
    )
    return round(minutes / 60.0, 1)


def profile_rarity_score(unlocked_percents: list[float]) -> float:
    """Рейтинг рідкості профілю 0..100.

    Базується на тому, наскільки рідкісні ачивки вибив користувач:
    вибив ультрарідкісну (1%) -> великий внесок; вибив 90% -> малий.
    Внесок однієї ачивки = (100 - globalPercent). Нормуємо в 0..100.
    """
    if not unlocked_percents:
        return 0.0
    contributions = [(100.0 - min(100.0, max(0.0, p))) for p in unlocked_percents]
    raw = sum(contributions) / len(contributions)  # 0..100 середній внесок
    # Легкий буст за кількість рідкісних (щоб профіль з багатьма ultra цінувався):
    ultra = sum(1 for p in unlocked_percents if p < 5.0)
    bonus = min(15.0, ultra * 0.5)
    return round(min(100.0, raw + bonus), 1)
