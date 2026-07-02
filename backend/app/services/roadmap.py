"""★ Roadmap-алгоритм — головна фішка сервісу.

Чистий модуль: НЕ залежить від БД, HTTP чи FastAPI. На вхід — dataclass-и,
на вихід — впорядковані кроки. Це робить його повністю тестованим.

Ідея:
  Треба побудувати оптимальний ПОРЯДОК отримання ще НЕ вибитих ачивок:
  від найлегших (високий globalPercent) до найважчих (низький globalPercent),
  але з поправкою на "гриндові" (прогресові) ачивки — їх варто починати рано,
  навіть якщо вони рідкісні, бо вони накопичуються під час звичайної гри.

Кроки згруповані у start / mid / end (початок / середина / кінець шляху),
кожен має оцінку часу etaMinutes.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

# Пороги рідкості (globalPercent, %). Документовано й використовується всюди однаково.
ULTRA_MAX = 5.0   # < 5%  -> ultra
RARE_MAX = 30.0   # < 30% -> rare  (інакше common)

# Патерни "гриндових"/прогресових ачивок (укр+англ), які варто починати рано.
_GRIND_PATTERNS = [
    r"\b\d{2,}\b",                       # будь-яке число >= 10 (Kill 100, Survive 50)
    r"\b(collect|gather|craft|kill|defeat|win|complete|earn|reach|survive|play)\b",
    r"\b(games?|matches?|rounds?|days?|hours?|times?|kills?|wins?)\b",
    r"(зібр|вбий|вбити|пройди|виграй|збери|проживи|нада?бай|годин|днів|разів)",
]
_GRIND_RE = re.compile("|".join(_GRIND_PATTERNS), re.IGNORECASE)


@dataclass
class AchievementInput:
    """Вхід алгоритму — по одній ще не вибитій (або будь-якій) ачивці."""

    id: str
    name: str
    desc: str = ""
    icon: str = ""
    unlocked: bool = False
    global_percent: float = 0.0
    # Явні залежності (id ачивок, які треба вибити РАНІШЕ). Опційно.
    depends_on: list[str] = field(default_factory=list)


@dataclass
class RoadmapStepOut:
    order: int
    group: str          # "start" | "mid" | "end"
    ach: AchievementInput
    eta_minutes: int


def rarity_tier(global_percent: float) -> str:
    if global_percent < ULTRA_MAX:
        return "ultra"
    if global_percent < RARE_MAX:
        return "rare"
    return "common"


def is_grind(ach: AchievementInput) -> bool:
    """Чи схоже це на прогресову/накопичувальну ачивку."""
    return bool(_GRIND_RE.search(f"{ach.name} {ach.desc}"))


def estimate_eta_minutes(ach: AchievementInput) -> int:
    """Груба евристика часу на одну ачивку у хвилинах.

    Базується на глобальному відсотку: що рідкісніша — то довша.
    Гриндові ачивки додатково довші (бо це накопичення).
    Діапазон обрізаний до [5, 1200] хв (5 хв .. 20 год).
    """
    p = max(0.1, min(100.0, ach.global_percent))
    # Нелінійно: 90% -> ~10 хв, 10% -> ~200 хв, 1% -> ~600 хв.
    base = 600.0 / p  # p=1 -> 600, p=100 -> 6
    base += 5.0       # мінімальна "вартість" будь-якої дії
    if is_grind(ach):
        base *= 1.8
    return int(max(5, min(1200, round(base))))


def _difficulty_key(ach: AchievementInput) -> float:
    """Ключ сортування: менший = робити раніше.

    Легкі (високий percent) — раніше. Гриндові отримують бонус (робити рано),
    моделюємо як штучне підвищення "легкості".
    """
    ease = ach.global_percent  # більший percent = легше
    if is_grind(ach):
        ease += 25.0  # гриндові підтягуємо вперед
    return -ease  # сортуємо за зростанням ключа -> спершу найбільша "легкість"


def _topological_by_deps(items: list[AchievementInput]) -> list[AchievementInput]:
    """Стабільне сортування з урахуванням явних залежностей (depends_on).

    Зберігає вхідний (уже відсортований за складністю) порядок якнайбільше,
    але гарантує, що залежність іде раніше. Цикли/невідомі id ігноруються.
    """
    by_id = {a.id: a for a in items}
    order_index = {a.id: i for i, a in enumerate(items)}
    resolved: list[AchievementInput] = []
    done: set[str] = set()
    visiting: set[str] = set()

    def visit(a: AchievementInput) -> None:
        if a.id in done or a.id in visiting:
            return
        visiting.add(a.id)
        deps = sorted(
            (by_id[d] for d in a.depends_on if d in by_id and d != a.id),
            key=lambda d: order_index[d.id],
        )
        for dep in deps:
            visit(dep)
        visiting.discard(a.id)
        done.add(a.id)
        resolved.append(a)

    for a in items:
        visit(a)
    return resolved


def build_roadmap(achievements: list[AchievementInput]) -> list[RoadmapStepOut]:
    """Головна функція. Повертає впорядкований список кроків для НЕвибитих ачивок.

    1. Беремо лише ще не вибиті.
    2. Сортуємо від найлегших до найважчих (з бонусом гриндовим).
    3. Застосовуємо залежності (depends_on) — стабільний топосорт.
    4. Ділимо на start/mid/end (третини) і рахуємо ETA.
    """
    todo = [a for a in achievements if not a.unlocked]
    if not todo:
        return []

    # 2. За складністю (стабільно: при рівності — за іменем для детермінізму).
    todo.sort(key=lambda a: (_difficulty_key(a), a.name.lower()))

    # 3. Залежності.
    ordered = _topological_by_deps(todo)

    # 4. Групи по третинах + ETA.
    n = len(ordered)
    steps: list[RoadmapStepOut] = []
    for i, ach in enumerate(ordered):
        third = i / n
        if third < 1 / 3:
            group = "start"
        elif third < 2 / 3:
            group = "mid"
        else:
            group = "end"
        steps.append(
            RoadmapStepOut(
                order=i + 1,
                group=group,
                ach=ach,
                eta_minutes=estimate_eta_minutes(ach),
            )
        )
    return steps
