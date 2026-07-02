# SAM Tracker — Backend (Потік 1: мозок + roadmap)

Бекенд сервісу трекінгу Steam-ачивок. Читає дані зі **Steam Web API**,
кешує їх, рахує метрики й будує **оптимальний Roadmap** проходження ачивок.
Розблокування ачивок бекенд **не робить** — лише проксює команду локальному
C# агенту (Потік 2), бо ставити ачивки можна тільки локально.

## Стек
Python 3.12 · FastAPI · httpx · SQLAlchemy (async) · PostgreSQL · Pydantic · PyJWT

## Швидкий старт (локально)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # впиши STEAM_API_KEY і JWT_SECRET
# Без Postgres можна лишити sqlite: DATABASE_URL=sqlite+aiosqlite:///./sam.db
uvicorn app.main:app --reload
```

Swagger: http://localhost:8000/docs

## Через Docker

```bash
cp .env.example .env          # заповни STEAM_API_KEY
docker compose up --build
```

## Тести

```bash
pytest            # юніт-тести roadmap-алгоритму та stats (без мережі/БД)
```

## Змінні оточення

| Змінна | Опис |
|--------|------|
| `STEAM_API_KEY` | ключ Steam Web API (https://steamcommunity.com/dev/apikey) |
| `JWT_SECRET` | секрет підпису токенів сесії |
| `JWT_EXPIRE_MINUTES` | час життя токена (за замовч. 7 днів) |
| `BASE_URL` | публічний URL цього API (для OpenID return_to) |
| `FRONTEND_RETURN_URL` | куди редіректити з `{token}` після логіну |
| `DATABASE_URL` | `postgresql+asyncpg://...` або `sqlite+aiosqlite:///./sam.db` |
| `AGENT_URL` | URL локального агента розблокування (Потік 2) |
| `CORS_ORIGINS` | дозволені origin-и фронтенду (кома) |
| `CACHE_TTL_SECONDS` | свіжість кешу даних Steam |

## Ендпоінти (SHARED CONTRACT)

| Метод | Шлях | Опис |
|-------|------|------|
| GET | `/auth/steam` | старт логіну через Steam OpenID |
| GET | `/auth/steam/callback` | callback → видає JWT, редірект на фронт |
| GET | `/api/me` | профіль + загальна статистика |
| GET | `/api/library` | бібліотека ігор з метриками |
| GET | `/api/game/{appId}` | деталі гри + список ачивок + difficulty |
| GET | `/api/game/{appId}/roadmap` | оптимальний порядок ачивок |
| POST | `/api/game/{appId}/unlock` | проксі до агента (`{ids:[...]}`) |
| GET | `/health` | healthcheck |

Усі `/api/*` вимагають заголовок `Authorization: Bearer <jwt>`.

## Архітектура

```
routers/   — тонкі HTTP-обробники (валідація, збірка відповіді)
services/  — БІЗНЕС-ЛОГІКА без БД/HTTP:
   roadmap.py  ★ алгоритм порядку ачивок (повністю тестований)
   stats.py    completion / difficulty / estHoursTo100 / rarityScore
   assembler.py  з'єднує schema + player + global% у доменні об'єкти
steam/     — Steam Web API клієнт з кешем (TTL у БД)
auth/      — Steam OpenID 2.0 + JWT
models.py  — ORM лише як кеш поверх Steam (джерело правди — Steam)
```

## Про roadmap-алгоритм

Вхід: усі ачивки гри (`globalPercent`, `unlocked`, опційні `depends_on`).
Логіка:
1. беремо лише **невибиті**;
2. сортуємо **від найлегших** (високий `globalPercent`) **до найважчих**;
3. **гриндові/прогресові** ачивки (Kill 100, Survive 50, «Вбий 100…»)
   підтягуємо вперед — їх варто починати рано;
4. застосовуємо явні залежності (стабільний топосорт);
5. ділимо на `start / mid / end` і рахуємо `etaMinutes` (евристика від рідкості).

Пороги рідкості: `ultra < 5% ≤ rare < 30% ≤ common`.
