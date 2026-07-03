"""Інтеграційні тести нових ендпоінтів: stats, settings, leaderboard, notifications."""
import pytest

from app.config import INSECURE_DEFAULT_SECRET, Settings


# ---------- release-hardening ----------
def test_player_invalid_steam_id_returns_400(client):
    # Довільний ввід не має тригерити важкий deep-scan Steam.
    r = client.get("/api/player/not-a-steamid")
    assert r.status_code == 400


def test_prod_config_rejects_default_secret():
    # У проді дефолтний JWT-секрет => fail-fast.
    with pytest.raises(RuntimeError):
        Settings(env="prod", jwt_secret=INSECURE_DEFAULT_SECRET, steam_api_key="k").check_production()


def test_prod_config_accepts_strong_secret():
    Settings(
        env="prod", jwt_secret="x" * 40, steam_api_key="k"
    ).check_production()  # не кидає


def test_dev_config_allows_default_secret():
    Settings(env="dev", jwt_secret=INSECURE_DEFAULT_SECRET).check_production()  # не кидає


# ---------- /api/stats ----------
def test_stats_totals(client):
    r = client.get("/api/stats")
    assert r.status_code == 200
    data = r.json()
    totals = data["totals"]
    assert totals["games"] == 3            # усього ігор у бібліотеці
    assert totals["achievements"] == 3     # вибиті: a1, a2, b1
    assert totals["perfectGames"] == 1     # Alpha на 100%
    assert 0.0 <= totals["avgCompletion"] <= 100.0
    # Монотонна формула рідкості: weight 2.43 -> ~4.7.
    assert totals["rarityScore"] == 4.7


def test_stats_rarity_counts(client):
    data = client.get("/api/stats").json()
    # a1=2%(legendary), a2=40%(uncommon), b1=15%(rare)
    assert data["rarity"] == {
        "common": 0,
        "uncommon": 1,
        "rare": 1,
        "epic": 0,
        "legendary": 1,
        "mythic": 0,
    }


def test_stats_buckets_and_tops(client):
    data = client.get("/api/stats").json()
    buckets = {b["label"]: b["count"] for b in data["completionBuckets"]}
    assert buckets["100%"] == 1
    assert buckets["25–50%"] == 1
    # 5 фіксованих бакетів завжди присутні.
    assert len(data["completionBuckets"]) == 5

    rare = data["topRareUnlocks"]
    assert len(rare) == 3                    # 3 вибиті ачивки
    assert rare[0]["ach"]["id"] == "a1"      # найрідкісніша (2%)
    assert rare[0]["ach"]["rarityTier"] == "legendary"
    assert rare[0]["gameName"] == "Alpha"

    top = data["topGames"]
    assert top[0]["completion"] == 100.0     # найближча до 100%
    assert [g["name"] for g in top] == ["Alpha", "Beta"]


# ---------- /api/settings ----------
def test_settings_defaults(client):
    data = client.get("/api/settings").json()
    assert data == {
        "agentUrl": "http://127.0.0.1:57343",
        "language": "en",
        "theme": "dark",
        "accent": "violet",
        "background": "cosmos",
        "privateProfile": False,
        "autoRoadmap": True,
    }


def test_settings_put_persists(client):
    new = {
        "agentUrl": "http://localhost:9999",
        "language": "en",
        "theme": "light",
        "accent": "blue",
        "background": "grid",
        "privateProfile": True,
        "autoRoadmap": False,
    }
    put = client.put("/api/settings", json=new)
    assert put.status_code == 200
    assert put.json() == new
    # Наступний GET повертає збережене.
    assert client.get("/api/settings").json() == new


# ---------- /api/leaderboard ----------
def test_leaderboard_ranked_with_me(client):
    rows = client.get("/api/leaderboard").json()
    assert len(rows) == 11                   # 10 реальних суперників + я
    me = [r for r in rows if r["isMe"]]
    assert len(me) == 1                       # рівно один isMe
    # Монотонна формула: 3 вибиті (2%,40%,15%) -> weight 2.43 -> ~4.7.
    assert me[0]["rarityScore"] == 4.7
    assert me[0]["achievements"] == 3
    # Відсортовано за rarityScore спадно й ранги послідовні.
    scores = [r["rarityScore"] for r in rows]
    assert scores == sorted(scores, reverse=True)
    assert [r["rank"] for r in rows] == list(range(1, 12))
    # 3 ачивки дають скромний рахунок (4.7) — нижче за всіх суперників -> останнє місце.
    assert me[0]["rank"] == 11


# ---------- /api/notifications ----------
def test_notifications_list(client):
    notes = client.get("/api/notifications").json()
    ids = [n["id"] for n in notes]
    # "rare drop" тригериться лише на legendary+mythic (p < 5): тільки a1 (2%).
    # b1 (15%, rare) тепер іде як звичайний unlock. Гра 100 пройдена на 100% ->
    # milestone:perfect:1. "almost"/"rare-near" не тригеряться на цих фікстурах
    # (гра 200 нижче порогів) — вони покриті юніт-тестом нижче.
    assert ids == [
        "rare:100:a1",
        "unlock:200:b1",
        "unlock:100:a2",
        "roadmap:200",
        "milestone:perfect:1",
        "system:sync",
    ]
    assert all(n["read"] is False for n in notes)
    # newest-first: createdAt спадає.
    created = [n["createdAt"] for n in notes]
    assert created == sorted(created, reverse=True)


def test_notifications_mark_specific(client):
    resp = client.post("/api/notifications/read", json={"ids": ["rare:100:a1"]})
    body = resp.json()
    assert body["ok"] is True
    assert body["unread"] == 5               # 6 усього, 1 прочитано
    notes = client.get("/api/notifications").json()
    read_map = {n["id"]: n["read"] for n in notes}
    assert read_map["rare:100:a1"] is True
    assert read_map["system:sync"] is False


def test_notifications_event_generators():
    """Юніт-тест нових івентів: almost, rare-near, milestone (без HTTP)."""
    from app.services.aggregate import GameAggregate, ProfileAggregate
    from app.services.notifications import build_notifications
    from app.services.roadmap import AchievementInput as A

    # Гра на 80%: невибиті — легка (60%) і mythic (0.8%) -> almost + rare-near.
    game = GameAggregate(
        app_id=300,
        name="Testgame",
        cover="",
        completion=80.0,
        ach_done=8,
        ach_total=10,
        achs=[
            A(id="easy", name="Easy One", unlocked=False, global_percent=60.0),
            A(id="myth", name="Void Heart", unlocked=False, global_percent=0.8),
            A(id="u1", name="Done", unlocked=True, global_percent=50.0),
        ],
    )
    agg = ProfileAggregate(
        steam_id="s",
        name="n",
        avatar="",
        games=1,
        achievements=520,          # >= 500 -> milestone:ach:500
        perfect_games=2,           # -> milestone:perfect:2
        avg_completion=80.0,
        rarity_score=10.0,
        rarity_counts={t: 0 for t in ("common", "uncommon", "rare", "epic", "legendary", "mythic")},
        game_aggs=[game],
    )

    ids = {n.id: n for n in build_notifications(agg)}
    assert "almost:300:easy" in ids            # найлегша з решти
    assert ids["almost:300:easy"].type == "almost"
    assert "rare-near:300:myth" in ids         # невибитий mythic поруч
    assert ids["rare-near:300:myth"].type == "almost"
    assert "milestone:ach:500" in ids
    assert "milestone:perfect:2" in ids
    assert ids["milestone:ach:500"].type == "milestone"


def test_notifications_mark_all(client):
    resp = client.post("/api/notifications/read", json={})
    assert resp.json() == {"ok": True, "unread": 0}
    notes = client.get("/api/notifications").json()
    assert all(n["read"] is True for n in notes)


def test_notifications_mark_all_no_body(client):
    resp = client.post("/api/notifications/read")
    assert resp.json()["unread"] == 0


# ---------- auth ----------
def test_stats_requires_auth():
    # Без override залежності -> 401 (окремий клієнт без auth).
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        assert c.get("/api/stats").status_code == 401
