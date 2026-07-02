"""GET/PUT /api/settings — налаштування користувача (per-user in-memory store)."""
from fastapi import APIRouter, Depends

from ..auth.deps import get_current_steam_id
from ..schemas import UserSettings
from ..services import store

router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/settings", response_model=UserSettings)
async def get_settings_endpoint(steam_id: str = Depends(get_current_steam_id)):
    return store.get_user_settings(steam_id)


@router.put("/settings", response_model=UserSettings)
async def put_settings_endpoint(
    body: UserSettings,
    steam_id: str = Depends(get_current_steam_id),
):
    return store.save_user_settings(steam_id, body)
