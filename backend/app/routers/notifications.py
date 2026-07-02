"""GET /api/notifications, POST /api/notifications/read."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import get_current_steam_id
from ..db import get_session
from ..schemas import MarkReadRequest, MarkReadResponse, Notification
from ..services import store
from ..services.aggregate import build_profile_aggregate
from ..services.notifications import build_notifications
from ..steam.client import SteamClient

router = APIRouter(prefix="/api", tags=["notifications"])


async def _current_notifications(steam_id: str, session: AsyncSession) -> list[Notification]:
    async with SteamClient(session) as steam:
        agg = await build_profile_aggregate(steam, steam_id)
    notes = build_notifications(agg)
    read_ids = store.get_read_ids(steam_id)
    for n in notes:
        n.read = n.id in read_ids
    return notes


@router.get("/notifications", response_model=list[Notification])
async def get_notifications(
    steam_id: str = Depends(get_current_steam_id),
    session: AsyncSession = Depends(get_session),
):
    # Список уже newest-first за побудовою.
    return await _current_notifications(steam_id, session)


@router.post("/notifications/read", response_model=MarkReadResponse)
async def mark_notifications_read(
    body: MarkReadRequest | None = None,
    steam_id: str = Depends(get_current_steam_id),
    session: AsyncSession = Depends(get_session),
):
    notes = await _current_notifications(steam_id, session)
    all_ids = [n.id for n in notes]

    ids = body.ids if body and body.ids is not None else None
    if ids is None:
        # Без ids -> позначити ВСІ прочитаними.
        store.mark_read(steam_id, all_ids)
    else:
        store.mark_read(steam_id, ids)

    read_ids = store.get_read_ids(steam_id)
    unread = sum(1 for nid in all_ids if nid not in read_ids)
    return MarkReadResponse(ok=True, unread=unread)
