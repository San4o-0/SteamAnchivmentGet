"""Детермінований синтез сповіщень із даних користувача.

Джерело — ProfileAggregate (ті самі ігри/ачивки, що й решта API). Ніякої
випадковості: одні й ті самі дані -> той самий список (стабільні id), тож
позначення «прочитано» коректно тримається між запитами.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from ..schemas import Notification
from .aggregate import ProfileAggregate
from .roadmap import LEGENDARY_MAX


def _iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat()


def build_notifications(aggregate: ProfileAggregate) -> list[Notification]:
    """Повертає список сповіщень (newest first), усі read=False.

    Стан прочитаного накладає роутер зі сховища.
    """
    # Вибиті ачивки, від найрідкісніших до звичайніших (детерміновано).
    unlocked = sorted(
        aggregate.unlocked_with_game(),
        key=lambda ga: (ga[1].global_percent, ga[0].app_id, ga[1].id),
    )

    now = datetime.now(timezone.utc)
    items: list[Notification] = []

    def add(**kwargs) -> None:
        # createdAt спадає з кроком, щоб порядок був стабільний (newest first).
        kwargs["created_at"] = _iso(now - timedelta(hours=len(items)))
        items.append(Notification(**kwargs))

    # 1. Рідкісні вибиті ачивки (legendary+mythic, тобто < LEGENDARY_MAX%), до 3 шт.
    for g, a in [ga for ga in unlocked if ga[1].global_percent < LEGENDARY_MAX][:3]:
        add(
            id=f"rare:{g.app_id}:{a.id}",
            type="rare",
            title="Рідкісна ачивка!",
            body=f"«{a.name}» — лише {round(a.global_percent, 1)}% гравців мають її.",
            game_name=g.name,
            app_id=g.app_id,
        )

    # 2. Нещодавні розблокування (наступні за рідкістю), до 2 шт.
    rare_ids = {n.id for n in items}
    for g, a in unlocked:
        nid = f"unlock:{g.app_id}:{a.id}"
        if f"rare:{g.app_id}:{a.id}" in rare_ids:
            continue
        add(
            id=nid,
            type="unlock",
            title="Ачивку розблоковано",
            body=f"Ти отримав «{a.name}» у грі {g.name}.",
            game_name=g.name,
            app_id=g.app_id,
        )
        if sum(1 for n in items if n.type == "unlock") >= 2:
            break

    # 3. «До ачивки один крок»: у розпочатих іграх (>=60%) — найлегша з решти
    #    (найвищий globalPercent серед НЕвибитих), до 2 ігор.
    started = sorted(
        (g for g in aggregate.game_aggs if 60.0 <= g.completion < 100.0),
        key=lambda x: (-x.completion, x.app_id),
    )
    for g in started[:2]:
        locked = [a for a in g.achs if not a.unlocked]
        if not locked:
            continue
        easiest = max(locked, key=lambda a: (a.global_percent, a.id))
        add(
            id=f"almost:{g.app_id}:{easiest.id}",
            type="almost",
            title="До ачивки один крок",
            body=(
                f"«{easiest.name}» — найлегша з решти у {g.name}: "
                f"її мають {round(easiest.global_percent, 1)}% гравців."
            ),
            game_name=g.name,
            app_id=g.app_id,
        )

    # 4. «Рідкісний дроп поруч»: невибита legendary/mythic у грі, де вже >=50%.
    near_rare = []
    for g in aggregate.game_aggs:
        if g.completion < 50.0 or g.completion >= 100.0:
            continue
        for a in g.achs:
            if not a.unlocked and a.global_percent < LEGENDARY_MAX:
                near_rare.append((g, a))
    near_rare.sort(key=lambda ga: (ga[1].global_percent, ga[0].app_id, ga[1].id))
    for g, a in near_rare[:2]:
        add(
            id=f"rare-near:{g.app_id}:{a.id}",
            type="almost",
            title="Рідкісний дроп поруч ✦",
            body=(
                f"У {g.name} на тебе чекає «{a.name}» — "
                f"лише {round(a.global_percent, 1)}% гравців мають її."
            ),
            game_name=g.name,
            app_id=g.app_id,
        )

    # 5. Roadmap-підказка: гра, найближча до 100% (але ще не завершена).
    unfinished = [g for g in aggregate.game_aggs if g.completion < 100.0]
    if unfinished:
        g = max(unfinished, key=lambda x: (x.completion, -x.app_id))
        remaining = g.ach_total - g.ach_done
        add(
            id=f"roadmap:{g.app_id}",
            type="roadmap",
            title="Майже готово!",
            body=(
                f"У грі {g.name} лишилось {remaining} ачивок до 100% "
                f"({g.completion}% зроблено). Побудувати роадмап?"
            ),
            game_name=g.name,
            app_id=g.app_id,
        )

    # 6. Рубежі (milestone): кожні 500 вибитих ачивок + ігри на 100%.
    if aggregate.achievements >= 500:
        threshold = (aggregate.achievements // 500) * 500
        add(
            id=f"milestone:ach:{threshold}",
            type="milestone",
            title=f"Рубіж: {threshold}+ ачивок 🏆",
            body=(
                f"У колекції вже {aggregate.achievements} вибитих ачивок. "
                f"Наступна позначка — {threshold + 500}."
            ),
        )
    if aggregate.perfect_games > 0:
        add(
            id=f"milestone:perfect:{aggregate.perfect_games}",
            type="milestone",
            title=f"Ігор на 100%: {aggregate.perfect_games}",
            body="Кожна доведена до кінця гра — трофей на полиці. Так тримати!",
        )

    # 7. Системне сповіщення (завжди присутнє).
    add(
        id="system:sync",
        type="system",
        title="Синхронізацію завершено",
        body=(
            f"Профіль оновлено: {aggregate.games} ігор, "
            f"{aggregate.achievements} вибитих ачивок, "
            f"rarity score {aggregate.rarity_score}."
        ),
    )

    return items
