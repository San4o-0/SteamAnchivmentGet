"""Роути логіну: Steam OpenID (підтверджений) і ручний вхід за профілем."""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from ..auth.security import create_token
from ..auth.steam_openid import build_login_url, verify_and_get_steam_id
from ..config import get_settings
from ..schemas import ManualLoginRequest, TokenResponse
from ..steam.client import resolve_steam_id

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/manual", response_model=TokenResponse)
async def manual_login(body: ManualLoginRequest):
    """Прозорий вхід: користувач вставляє посилання на профіль / нік / steamID64.

    Читаємо лише ПУБЛІЧНІ дані, тож підтвердження особи не потрібне —
    видаємо токен для розв'язаного steamID64.
    """
    steam_id = await resolve_steam_id(body.profile)
    if steam_id is None:
        raise HTTPException(
            status_code=400,
            detail="Не вдалося розпізнати профіль. Встав посилання виду "
            "steamcommunity.com/id/нік або steamcommunity.com/profiles/765… "
            "чи сам steamID64.",
        )
    return TokenResponse(token=create_token(steam_id), steam_id=steam_id)


@router.get("/steam")
async def login_steam():
    """Крок 1: редірект користувача на Steam для підтвердження."""
    settings = get_settings()
    return_to = f"{settings.base_url}/auth/steam/callback"
    realm = settings.base_url
    return RedirectResponse(build_login_url(return_to, realm))


@router.get("/steam/callback")
async def steam_callback(request: Request):
    """Крок 2: Steam повертає користувача сюди. Верифікуємо й видаємо JWT."""
    params = dict(request.query_params)
    steam_id = await verify_and_get_steam_id(params)
    settings = get_settings()

    if steam_id is None:
        # Невдала верифікація -> назад на фронт без токена.
        return RedirectResponse(settings.frontend_return_url.format(token=""))

    token = create_token(steam_id)
    return RedirectResponse(settings.frontend_return_url.format(token=token))
