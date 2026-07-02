"""Похідні метрики: completion, difficulty, estHoursTo100, rarityScore.

Чисті функції — жодних БД/HTTP. Легко тестувати й перевикористовувати.
"""
from __future__ import annotations

import math
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


# Масштаб кривої насичення. Більший K -> повільніше наближення до 100
# (ширший діапазон значень); менший -> швидше насичення. Підібрано так, щоб
# ~50 ачивок середньої рідкості давали ~50, ~200 -> ~94.
_SATURATION_K = 50.0


def profile_rarity_score(unlocked_percents: list[float]) -> float:
    """Рейтинг рідкості профілю 0..100 — МОНОТОННИЙ (від нових ачивок лише росте).

    Кожна вибита ачивка додає "вагу рідкості" = (100 - globalPercent)/100:
    ультрарідкісна (1%) додає ~0.99, масова (90%) — лише ~0.10. Сумарну вагу
    проганяємо через насичувальну криву, тож рахунок росте до 100 і НІКОЛИ не
    падає від здобуття ачивки — на відміну від старого СЕРЕДНЬОГО внеску, яке
    масова ачивка тягла вниз.

        weight = Σ (100 - p) / 100
        score  = 100 * (1 - e^(-weight / K))

    Рідкісні важать ~10× за масові, тож рейтинг піднімають саме складні
    здобутки; прості лише трохи додають, але ніколи не віднімають.
    Орієнтири (K=50, avg ~30% рідкості): 50 ачивок -> ~50, 100 -> ~75,
    200 -> ~94, 500 -> ~100.
    """
    if not unlocked_percents:
        return 0.0
    weight = sum(
        (100.0 - min(100.0, max(0.0, p))) / 100.0 for p in unlocked_percents
    )
    score = 100.0 * (1.0 - math.exp(-weight / _SATURATION_K))
    return round(score, 1)
