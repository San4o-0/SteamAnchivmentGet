"""Steam OpenID 2.0 flow.

Steam логінить через OpenID: ми редіректимо користувача на Steam, він
підтверджує, Steam повертає його на наш return_to з параметрами, які ми
верифікуємо запитом check_authentication. З claimed_id дістаємо steamID64.
"""
from __future__ import annotations

import re
from urllib.parse import urlencode

import httpx

STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"
_STEAM_ID_RE = re.compile(r"https?://steamcommunity\.com/openid/id/(\d+)")


def build_login_url(return_to: str, realm: str) -> str:
    """URL, куди редіректимо користувача для логіну на Steam."""
    params = {
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.return_to": return_to,
        "openid.realm": realm,
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    }
    return f"{STEAM_OPENID_URL}?{urlencode(params)}"


async def verify_and_get_steam_id(query_params: dict[str, str]) -> str | None:
    """Верифікує callback від Steam. Повертає steamID64 або None."""
    claimed_id = query_params.get("openid.claimed_id", "")
    match = _STEAM_ID_RE.match(claimed_id)
    if not match:
        return None

    # Повертаємо ті самі параметри, але mode=check_authentication.
    data = dict(query_params)
    data["openid.mode"] = "check_authentication"

    async with httpx.AsyncClient(timeout=15.0) as http:
        resp = await http.post(STEAM_OPENID_URL, data=data)
        resp.raise_for_status()

    if "is_valid:true" not in resp.text:
        return None
    return match.group(1)
