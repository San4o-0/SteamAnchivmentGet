"""Залежність FastAPI: витягнути поточного користувача з Bearer-токена."""
from fastapi import Depends, Header, HTTPException, status

from .security import decode_token


async def get_current_steam_id(authorization: str = Header(default="")) -> str:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization[7:].strip()
    try:
        return decode_token(token)
    except Exception as exc:  # noqa: BLE001 (усі jwt-помилки -> 401)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


CurrentUser = Depends(get_current_steam_id)
