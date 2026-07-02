"""GET /api/friends — друзі профілю з «легкою» статистикою (рівень, ачивки тощо).

Джерело друзів — ISteamUser/GetFriendList (лише публічні списки). Сортування за
метриками робить фронт (набір малий); бекенд лише рахує та віддає картки.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import get_current_steam_id
from ..db import get_session
from ..schemas import FriendCard, FriendsResponse
from ..services.friends import MAX_FRIENDS, build_friends
from ..steam.client import SteamClient

router = APIRouter(prefix="/api", tags=["friends"])


@router.get("/friends", response_model=FriendsResponse)
async def get_friends(
    limit: int = Query(default=12, ge=1, le=MAX_FRIENDS),
    steam_id: str = Depends(get_current_steam_id),
    session: AsyncSession = Depends(get_session),
):
    async with SteamClient(session) as steam:
        total, cards = await build_friends(steam, steam_id, limit)
    return FriendsResponse(
        total=total,
        limit=limit,
        private=total == 0,
        friends=[FriendCard(**c) for c in cards],
    )
