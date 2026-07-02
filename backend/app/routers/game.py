"""GET /api/game/{appId}, /roadmap, POST /unlock (proxy до агента)."""
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import get_current_steam_id
from ..config import get_settings
from ..db import get_session
from ..schemas import (
    GameDetail,
    Roadmap,
    RoadmapStep,
    UnlockRequest,
    UnlockResponse,
    UnlockResultItem,
)
from ..services import stats as stats_svc
from ..services.assembler import build_achievements, to_ach_schema
from ..services.roadmap import build_roadmap
from ..steam.client import SteamClient

router = APIRouter(prefix="/api/game", tags=["game"])


@router.get("/{app_id}", response_model=GameDetail)
async def game_detail(
    app_id: int,
    steam_id: str = Depends(get_current_steam_id),
    session: AsyncSession = Depends(get_session),
):
    async with SteamClient(session) as steam:
        achs = await build_achievements(steam, steam_id, app_id)
        summary_name = None
        if not achs:
            raise HTTPException(status_code=404, detail="No achievements or game not found")

        game_achs = [stats_svc.GameAch(a.unlocked, a.global_percent) for a in achs]
        # Назву дістаємо з бібліотеки (owned games), fallback -> appId.
        games = await steam.get_owned_games(steam_id)
        for g in games:
            if g["appid"] == app_id:
                summary_name = g.get("name")
                break

    return GameDetail(
        app_id=app_id,
        name=summary_name or str(app_id),
        completion=stats_svc.completion_percent(game_achs),
        est_hours_to_100=stats_svc.est_hours_to_100(achs),
        achievements=[to_ach_schema(a) for a in achs],
        difficulty=stats_svc.game_difficulty(game_achs),
    )


@router.get("/{app_id}/roadmap", response_model=Roadmap)
async def game_roadmap(
    app_id: int,
    steam_id: str = Depends(get_current_steam_id),
    session: AsyncSession = Depends(get_session),
):
    async with SteamClient(session) as steam:
        achs = await build_achievements(steam, steam_id, app_id)

    steps = build_roadmap(achs)
    return Roadmap(
        steps=[
            RoadmapStep(
                order=s.order,
                group=s.group,
                ach=to_ach_schema(s.ach),
                eta_minutes=s.eta_minutes,
            )
            for s in steps
        ]
    )


@router.post("/{app_id}/unlock", response_model=UnlockResponse)
async def unlock(
    app_id: int,
    body: UnlockRequest,
    _steam_id: str = Depends(get_current_steam_id),
):
    """Проксі до локального агента (Потік 2): POST /unlock/batch.

    Бекенд не може сам ставити ачивки — це робить лише локальний C# агент
    на машині користувача через steamclient.dll.
    """
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=30.0) as http:
            resp = await http.post(
                f"{settings.agent_url}/unlock/batch",
                json={"appId": app_id, "ids": body.ids},
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        # Агент не запущений / недоступний -> усі невдалі, але 200 з поясненням.
        return UnlockResponse(
            ok=False,
            results=[
                UnlockResultItem(id=i, ok=False, error=f"agent unreachable: {exc}")
                for i in body.ids
            ],
        )

    results = [
        UnlockResultItem(
            id=r.get("id", ""),
            ok=bool(r.get("ok")),
            error=r.get("error"),
        )
        for r in data.get("results", [])
    ]
    return UnlockResponse(ok=bool(data.get("ok")), results=results)
