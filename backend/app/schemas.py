"""Pydantic-схеми відповіді API. Точно за SHARED CONTRACT.

Ach = { id, name, desc, icon, unlocked, globalPercent,
        rarityTier:"common|uncommon|rare|epic|legendary|mythic" }
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

RarityTier = Literal["common", "uncommon", "rare", "epic", "legendary", "mythic"]
RoadmapGroup = Literal["start", "mid", "end"]


class CamelModel(BaseModel):
    """Віддаємо camelCase (як у контракті), приймаємо будь-що."""

    model_config = ConfigDict(populate_by_name=True)


# --- Ach ---
class Ach(CamelModel):
    id: str
    name: str
    desc: str = ""
    icon: str = ""
    unlocked: bool = False
    global_percent: float = Field(0.0, alias="globalPercent")
    rarity_tier: RarityTier = Field("common", alias="rarityTier")


# --- /api/me ---
class ProfileStats(CamelModel):
    games: int
    achievements: int
    avg_completion: float = Field(alias="avgCompletion")
    rarity_score: float = Field(alias="rarityScore")


class Me(CamelModel):
    steam_id: str = Field(alias="steamId")
    name: str
    avatar: str
    stats: ProfileStats


# --- /api/library ---
class LibraryItem(CamelModel):
    app_id: int = Field(alias="appId")
    name: str
    cover: str
    completion: float
    hours: float
    ach_done: int = Field(alias="achDone")
    ach_total: int = Field(alias="achTotal")
    rarity: float
    # ISO-дата (YYYY-MM-DD) або None — фронт форматує через new Date(iso).
    last_played: str | None = Field(default=None, alias="lastPlayed")


# --- /api/game/{appId} ---
class GameDetail(CamelModel):
    app_id: int = Field(alias="appId")
    name: str
    completion: float
    est_hours_to_100: float = Field(alias="estHoursTo100")
    achievements: list[Ach]
    difficulty: int  # 1..5 зірок


# --- /api/game/{appId}/roadmap ---
class RoadmapStep(CamelModel):
    order: int
    group: RoadmapGroup
    ach: Ach
    eta_minutes: int = Field(alias="etaMinutes")


class Roadmap(CamelModel):
    steps: list[RoadmapStep]


# --- POST /auth/manual ---
class ManualLoginRequest(CamelModel):
    profile: str


class TokenResponse(CamelModel):
    token: str
    steam_id: str = Field(alias="steamId")


# --- POST /api/game/{appId}/unlock ---
class UnlockRequest(CamelModel):
    ids: list[str]


class UnlockResultItem(CamelModel):
    id: str
    ok: bool
    error: str | None = None


class UnlockResponse(CamelModel):
    ok: bool
    results: list[UnlockResultItem]


# --- GET /api/stats ---
class StatsTotals(CamelModel):
    games: int
    achievements: int
    perfect_games: int = Field(alias="perfectGames")
    avg_completion: float = Field(alias="avgCompletion")
    rarity_score: float = Field(alias="rarityScore")


class RarityCounts(CamelModel):
    common: int
    uncommon: int
    rare: int
    epic: int
    legendary: int
    mythic: int


class CompletionBucket(CamelModel):
    label: str
    count: int


class TopRareUnlock(CamelModel):
    game_name: str = Field(alias="gameName")
    app_id: int = Field(alias="appId")
    ach: Ach


class TopGame(CamelModel):
    app_id: int = Field(alias="appId")
    name: str
    cover: str
    completion: float
    ach_done: int = Field(alias="achDone")
    ach_total: int = Field(alias="achTotal")


class Stats(CamelModel):
    totals: StatsTotals
    rarity: RarityCounts
    completion_buckets: list[CompletionBucket] = Field(alias="completionBuckets")
    top_rare_unlocks: list[TopRareUnlock] = Field(alias="topRareUnlocks")
    top_games: list[TopGame] = Field(alias="topGames")


# --- GET /api/player/{steamId} ---
class PlayerProfile(CamelModel):
    steam_id: str = Field(alias="steamId")
    name: str
    avatar: str
    stats: Stats


# --- /api/settings ---
class UserSettings(CamelModel):
    agent_url: str = Field("http://127.0.0.1:57343", alias="agentUrl")
    language: Literal["uk", "en"] = "uk"
    theme: Literal["dark", "light"] = "dark"
    accent: Literal["violet", "blue", "green", "gold", "magenta"] = "violet"
    background: Literal["cosmos", "aurora", "rain", "grid", "fireflies", "off"] = "cosmos"
    private_profile: bool = Field(False, alias="privateProfile")
    auto_roadmap: bool = Field(True, alias="autoRoadmap")


# --- GET /api/leaderboard ---
class LeaderboardEntry(CamelModel):
    rank: int
    steam_id: str = Field(alias="steamId")
    name: str
    avatar: str
    rarity_score: float = Field(alias="rarityScore")
    achievements: int
    perfect_games: int = Field(alias="perfectGames")
    is_me: bool = Field(alias="isMe")


# --- /api/notifications ---
NotificationType = Literal["unlock", "rare", "roadmap", "system", "almost", "milestone"]


class Notification(CamelModel):
    id: str
    type: NotificationType
    title: str
    body: str
    game_name: str | None = Field(default=None, alias="gameName")
    app_id: int | None = Field(default=None, alias="appId")
    read: bool = False
    created_at: str = Field(alias="createdAt")


class MarkReadRequest(CamelModel):
    ids: list[str] | None = None


class MarkReadResponse(CamelModel):
    ok: bool
    unread: int
