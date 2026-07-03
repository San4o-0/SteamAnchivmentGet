# Deploy — Achivo (безкоштовно)

Стек: **Neon** (Postgres) + **Render** (бекенд, Docker) + **Cloudflare Pages** (фронт).
Агент — окремо, як Windows-білд у GitHub Releases.

Порядок важливий: БД → бекенд → фронт (кожен наступний знає URL попереднього).

---

## 1. База — Neon
1. neon.tech → New Project.
2. Скопіюй connection string і **заміни драйвер** на async:
   `postgresql+asyncpg://<user>:<pass>@<host>/<db>?sslmode=require`
3. Це значення = `DATABASE_URL` для Render.

Таблиці створяться самі при першому старті бекенду (`Base.metadata.create_all`).

## 2. Бекенд — Render
Варіант A (Blueprint): Render → New → **Blueprint** → цей репо → підхопить `render.yaml`.
Варіант B (вручну): New → **Web Service** → репо → Root Directory `backend`, Runtime `Docker`.

Змінні (Environment):
| Ключ | Значення |
|---|---|
| `ENV` | `prod` |
| `STEAM_API_KEY` | ключ з steamcommunity.com/dev/apikey |
| `JWT_SECRET` | 32+ символи (`python -c "import secrets;print(secrets.token_hex(32))"`) |
| `DATABASE_URL` | Neon-рядок з кроку 1 |
| `FRONTEND_RETURN_URL` | `https://achivo.pages.dev/auth/callback#token={token}` |
| `CORS_ORIGINS` | `https://achivo.pages.dev` |
| `BASE_URL` | **після 1-го деплою** впиши `https://<сервіс>.onrender.com` і redeploy |

`BASE_URL` — курка/яйце: URL відомий лише після створення сервісу. Постав його
й перезапусти (потрібен для Steam OpenID return).

## 3. Фронт — Cloudflare Pages
Pages → Create → Connect to Git → цей репо. **Назва проєкту = `achivo`**
(щоб домен став `https://achivo.pages.dev`).

Build settings:
- Root directory: `web`
- Build command: `npm run build`
- Build output directory: `dist`

Environment variables:
| Ключ | Значення |
|---|---|
| `VITE_API_BASE_URL` | `https://<сервіс>.onrender.com` (URL Render) |
| `VITE_ENABLE_MOCKS` | `false` |
| `NODE_VERSION` | `20` |

## 4. Steam
Потрібен лише **Web API key** (крок 2). Окремої реєстрації додатку/redirect для
OpenID не треба — Steam OpenID приймає будь-який realm.

## 5. Агент (розблокування, Windows)
`SteamAchievementManager-master/SAM.Agent/build-dist.ps1` → exe → **GitHub Releases**.
Origin `https://achivo.pages.dev` уже в allowlist агента (HttpServer.cs).
Кастомний домен додається юзером через env `ACHIVO_ALLOWED_ORIGINS`.

---

## Перевірка
1. `https://<render>.onrender.com/api/agent/health` → JSON (бекенд живий).
2. `https://achivo.pages.dev` → відкривається логін.
3. «Увійти через Steam» → Steam → повертає на `/auth/callback` → дашборд із реальними даними.
4. Розблокування — лише коли запущено локальний Windows-агент + Steam.

## Нюанси
- Render free **засинає** ~15 хв простою → перший запит холодний (~30–50 с).
- Preview-деплої Pages (`<hash>.achivo.pages.dev`) не в CORS — за потреби додай у `CORS_ORIGINS`/`ACHIVO_ALLOWED_ORIGINS`.
- Docs (`/docs`) у проді вимкнені (`ENV=prod`).
