# Achivo — Steam Achievement Manager

Track your Steam achievements, see how rare each one is, get an optimal
**roadmap** to 100%, and unlock achievements locally. Live at
**[achivo.pages.dev](https://achivo.pages.dev)**.

Achivo is a monorepo of three cooperating parts. The hosted backend is the
"brain" (reads Steam, computes metrics, builds roadmaps), the web app is the
face, and a small local Windows agent is the only piece that can physically
unlock achievements — because Steam only allows that from the machine it runs on.

```
Browser (web)  ──►  Backend (FastAPI, hosted)  ──►  Steam Web API
     │
     └──────────────►  Local agent (127.0.0.1:57343)  ──►  steamclient.dll
        (unlock only — the browser talks to the agent directly)
```

---

## Components

| Path | What it is | Stack |
|------|-----------|-------|
| [`backend/`](backend/) | REST API: auth, library, achievements, stats, roadmap. Proxies unlock to the agent. | Python 3.12 · FastAPI · httpx · SQLAlchemy (async) · PostgreSQL · PyJWT |
| [`web/`](web/) | Frontend SPA: login, dashboard, library, game detail, roadmap timeline. | React 18 · TypeScript · Vite · TanStack Query · Tailwind |
| [`SteamAchievementManager-master/SAM.Agent/`](SteamAchievementManager-master/SAM.Agent/) | Local Windows service that unlocks achievements via Steam interop. | C# · .NET Framework 4.8 · x86 |

The `SteamAchievementManager-master/` tree also contains the original SAM tools
(`SAM.API`, `SAM.Game`, `SAM.Picker`) that `SAM.Agent` reuses.

---

## Shared contract

All three parts agree on one HTTP contract.

**Backend** — every `/api/*` route needs `Authorization: Bearer <jwt>`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/auth/steam` | Start Steam OpenID login |
| GET | `/auth/steam/callback` | Callback → issues JWT, redirects to the frontend |
| GET | `/api/me` | Profile + overall stats |
| GET | `/api/library` | Games with metrics |
| GET | `/api/game/{appId}` | Game detail + achievements + difficulty |
| GET | `/api/game/{appId}/roadmap` | Optimal achievement order |
| POST | `/api/game/{appId}/unlock` | Proxy to the agent (`{ ids: [...] }`) |
| GET | `/health` | Health check |

**Local agent** — loopback only (`http://127.0.0.1:57343`), no auth needed:

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/health` | — | `{ steamRunning, version }` |
| POST | `/unlock` | `{ appId, achievementId }` | `{ ok, error? }` |
| POST | `/unlock/batch` | `{ appId, ids: [...] }` | `{ ok, results: [...], error? }` |

The browser calls the agent **directly** — a hosted backend can't reach a user's
`127.0.0.1`. The agent binds to loopback and rejects non-localhost requests (403).

---

## Quick start (local)

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # set STEAM_API_KEY and JWT_SECRET
uvicorn app.main:app --reload # http://localhost:8000/docs
```

Without Postgres you can use SQLite: `DATABASE_URL=sqlite+aiosqlite:///./sam.db`.

### 2. Web

```bash
cd web
npm install
npm run dev                   # http://localhost:5173 (MSW mocks on by default)
```

The frontend ships with MSW mocks mirroring the shared contract, so it runs with
**zero backend**. Point it at the real API by editing `web/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_ENABLE_MOCKS=false
```

### 3. Agent (Windows only)

Requires Windows + Steam + .NET Framework 4.8. Steam must be running and signed in.

```bat
dotnet build SteamAchievementManager-master\SAM.Agent\SAM.Agent.csproj -c Release -p:AllowUnsafeBlocks=true
SAM.Agent.exe                 # listens on http://127.0.0.1:57343
```

---

## The roadmap algorithm

Input: every achievement of a game (`globalPercent`, `unlocked`, optional
`depends_on`). The service ([`backend/app/services/roadmap.py`](backend/app/services/roadmap.py)):

1. keeps only **locked** achievements;
2. sorts **easiest first** (high `globalPercent`) → hardest;
3. pulls **grind/progress** achievements ("Kill 100", "Survive 50") forward — worth
   starting early;
4. applies explicit dependencies (stable topological sort);
5. splits into `start / mid / end` and estimates `etaMinutes` from rarity.

Rarity thresholds: `ultra < 5% ≤ rare < 30% ≤ common`.

---

## Deployment

Free stack: **Neon** (Postgres) + **Render** (backend, Docker) + **Cloudflare
Pages** (frontend). The agent is a Windows build published to **GitHub Releases**.
Full runbook in [`DEPLOY.md`](DEPLOY.md); the Render blueprint is
[`render.yaml`](render.yaml).

### Publishing the agent

Push a tag `agent-v*` and CI ([`.github/workflows/agent-release.yml`](.github/workflows/agent-release.yml))
builds `AchivoAgent.zip` on `windows-latest` and publishes it to a GitHub Release
with a SHA-256 checksum:

```bash
git tag agent-v1.0.1 origin/main
git push origin agent-v1.0.1
```

To make the **"Download agent"** button appear in the web app's offline banner,
set this build-time variable in Cloudflare Pages and redeploy:

```
VITE_AGENT_DOWNLOAD_URL = https://github.com/San4o-0/SteamAnchivmentGet/releases/latest/download/AchivoAgent.zip
```

If it's empty, the button is hidden by design.

---

## Documentation

- [`backend/README.md`](backend/README.md) — backend architecture, endpoints, env vars
- [`web/README.md`](web/README.md) — frontend routes, mocks, contract
- [`SteamAchievementManager-master/SAM.Agent/README.md`](SteamAchievementManager-master/SAM.Agent/README.md) — agent internals, unlock flow, error handling
- [`DEPLOY.md`](DEPLOY.md) — step-by-step free deployment
- [`RELEASE_AUDIT.md`](RELEASE_AUDIT.md) — pre-release security audit
