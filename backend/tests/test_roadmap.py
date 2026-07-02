"""Юніт-тести для roadmap-алгоритму та stats-евристик (чисті функції)."""
from app.services.roadmap import (
    AchievementInput,
    build_roadmap,
    estimate_eta_minutes,
    is_grind,
    rarity_tier,
)
from app.services.stats import (
    GameAch,
    completion_percent,
    est_hours_to_100,
    game_difficulty,
    profile_rarity_score,
)


def A(id, name="A", desc="", unlocked=False, gp=50.0, deps=None):
    return AchievementInput(
        id=id, name=name, desc=desc, unlocked=unlocked,
        global_percent=gp, depends_on=deps or [],
    )


# ---------- rarity_tier ----------
def test_rarity_tiers():
    assert rarity_tier(0.4) == "mythic"
    assert rarity_tier(0.99) == "mythic"
    assert rarity_tier(2.0) == "legendary"
    assert rarity_tier(4.9) == "legendary"
    assert rarity_tier(7.5) == "epic"
    assert rarity_tier(15.0) == "rare"
    assert rarity_tier(30.0) == "uncommon"
    assert rarity_tier(60.0) == "common"


def test_rarity_tier_boundaries():
    # Межі включні знизу для вищого порогу: p < MAX -> нижчий тір.
    assert rarity_tier(0.5) == "mythic"       # p < 1
    assert rarity_tier(1.0) == "legendary"    # 1 <= p < 5
    assert rarity_tier(5.0) == "epic"         # 5 <= p < 10
    assert rarity_tier(10.0) == "rare"        # 10 <= p < 20
    assert rarity_tier(20.0) == "uncommon"    # 20 <= p < 50
    assert rarity_tier(50.0) == "common"      # p >= 50
    assert rarity_tier(90.0) == "common"


# ---------- is_grind ----------
def test_grind_detection():
    assert is_grind(A("a", "Kill 100 Bears")) is True
    assert is_grind(A("b", "Survive 50 days")) is True
    assert is_grind(A("c", "Вбий 100 ворогів")) is True
    assert is_grind(A("d", "Find Military Crate")) is False


# ---------- eta ----------
def test_eta_rarer_takes_longer():
    easy = estimate_eta_minutes(A("e", gp=90.0))
    hard = estimate_eta_minutes(A("h", gp=1.0))
    assert hard > easy
    assert 5 <= easy <= 1200
    assert 5 <= hard <= 1200


def test_eta_grind_multiplier():
    plain = estimate_eta_minutes(A("p", "Do thing", gp=20.0))
    grind = estimate_eta_minutes(A("g", "Kill 100 enemies", gp=20.0))
    assert grind > plain


# ---------- build_roadmap ----------
def test_roadmap_skips_unlocked():
    achs = [A("x", unlocked=True), A("y", unlocked=False)]
    steps = build_roadmap(achs)
    assert [s.ach.id for s in steps] == ["y"]


def test_roadmap_orders_easy_first():
    achs = [
        A("hard", "Hard", gp=2.0),
        A("easy", "Easy", gp=95.0),
        A("mid", "Mid", gp=40.0),
    ]
    steps = build_roadmap(achs)
    ids = [s.ach.id for s in steps]
    assert ids == ["easy", "mid", "hard"]
    assert steps[0].order == 1
    assert steps[-1].order == 3


def test_roadmap_groups_thirds():
    achs = [A(f"a{i}", gp=100 - i) for i in range(9)]
    steps = build_roadmap(achs)
    groups = [s.group for s in steps]
    assert groups[:3] == ["start", "start", "start"]
    assert groups[3:6] == ["mid", "mid", "mid"]
    assert groups[6:] == ["end", "end", "end"]


def test_roadmap_grind_pulled_forward():
    # Рідкісна гриндова має йти раніше за таку ж рідкісну не-гриндову.
    achs = [
        A("rare_plain", "Secret", gp=10.0),
        A("rare_grind", "Kill 100 wolves", gp=10.0),
    ]
    steps = build_roadmap(achs)
    assert steps[0].ach.id == "rare_grind"


def test_roadmap_respects_dependencies():
    # b легша за a, але a — залежність b, тож a має йти першою.
    achs = [
        A("b", "B", gp=90.0, deps=["a"]),
        A("a", "A", gp=10.0),
    ]
    steps = build_roadmap(achs)
    ids = [s.ach.id for s in steps]
    assert ids.index("a") < ids.index("b")


def test_roadmap_empty():
    assert build_roadmap([]) == []
    assert build_roadmap([A("x", unlocked=True)]) == []


# ---------- stats ----------
def test_completion_percent():
    achs = [GameAch(True, 50), GameAch(False, 10), GameAch(True, 20), GameAch(False, 5)]
    assert completion_percent(achs) == 50.0
    assert completion_percent([]) == 0.0


def test_game_difficulty_scale():
    easy = [GameAch(False, 80), GameAch(False, 70)]
    hard = [GameAch(False, 2), GameAch(False, 3)]
    assert game_difficulty(easy) == 1
    assert game_difficulty(hard) == 5
    assert 1 <= game_difficulty([GameAch(False, 20)]) <= 5


def test_est_hours_to_100_ignores_unlocked():
    achs = [A("done", unlocked=True, gp=1.0), A("todo", unlocked=False, gp=50.0)]
    hours = est_hours_to_100(achs)
    assert hours > 0
    # Лише 'todo' враховується.
    assert hours == round(estimate_eta_minutes(achs[1]) / 60.0, 1)


def test_profile_rarity_score_range():
    assert profile_rarity_score([]) == 0.0
    common = profile_rarity_score([90.0, 85.0, 95.0])
    rare = profile_rarity_score([1.0, 2.0, 3.0])
    assert rare > common
    assert 0.0 <= common <= 100.0
    assert 0.0 <= rare <= 100.0
