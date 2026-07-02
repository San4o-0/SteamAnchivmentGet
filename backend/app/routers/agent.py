"""GET /api/agent/health — проксі до локального агента (Потік 2).

Фронт опитує це, щоб показати банер «агент офлайн». Якщо агент недоступний —
повертаємо 200 з steamRunning=false (а не помилку), щоб UI просто показав банер.
"""
import httpx
from fastapi import APIRouter, Depends

from ..auth.deps import get_current_steam_id
from ..config import get_settings

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.get("/health")
async def agent_health(_steam_id: str = Depends(get_current_steam_id)):
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=5.0) as http:
            resp = await http.get(f"{settings.agent_url}/health")
            resp.raise_for_status()
            data = resp.json()
        return {
            "steamRunning": bool(data.get("steamRunning")),
            "version": data.get("version", "unknown"),
        }
    except httpx.HTTPError:
        # Агент не запущений/недоступний -> м'яка деградація для банера.
        return {"steamRunning": False, "version": "offline"}
