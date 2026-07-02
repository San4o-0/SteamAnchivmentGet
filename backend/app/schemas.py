"""Pydantic-схеми відповіді API. Точно за SHARED CONTRACT.

Ach = { id, name, desc, icon, unlocked, globalPercent, rarityTier:"common|rare|ultra" }
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

RarityTier = Literal["common", "rare", "ultra"]
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
