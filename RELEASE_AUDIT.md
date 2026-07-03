# Achivo — передрелізний чекліст

Джерело: аудит 5 агентів (бекенд / фронт / C#-агент / реліз-безпека / тести).
Статуси: `[x]` зроблено · `[~]` частково · `[ ]` треба · `[D]` чекає домен · `[?]` рішення продукту · `[ops]` інфра/деплой.

Перевірено після фіксів: **backend 32 тести** ✅ · **web tsc 0** ✅ · **agent build 0 errors** ✅

---

## 🔴 БЛОКЕРИ

- [x] **B1. Агент: origin-allowlist замість `CORS *`.** Reflect лише дозволений Origin (dev-дефолти + env `ACHIVO_ALLOWED_ORIGINS`), інакше 403. Прод-домен додати в env — `[D]`. `HttpServer.cs`.
- [x] **B2. JWT-секрет: fail-fast у проді** (`ENV=prod` + дефолтний/короткий секрет → RuntimeError). `config.py`.
- [x] **B3. Мок-байпас лише в DEV** (`import.meta.env.DEV`) + `enableMocks` не стартує в прод-білді + `.env.example` → `mocks=false`. `auth.ts`, `browser.ts`.
- [x] **B4. MiniJson: ліміт глибини рекурсії (64)** — прибрано stack-overflow DoS. `MiniJson.cs`.
- [x] **B5. CI білд-скрипт** (шлях виводу). `build-dist.ps1`.
- [x] **B6. Відкат тимчасових тестових хаків.**

## 🟠 HIGH

- [x] **H1. Steam-клієнт: graceful degrade** на 429/5xx/timeout у `_cached` (віддає stale-кеш або `{}`, не 500, не кешує збій). `steam/client.py`.
- [x] **H2. `/api/player/{id}`: валідація SteamID64** (400 до deep-scan). `stats.py`.
- [x] **H3. Агент: ліміт розміру тіла (64 КБ).** `HttpServer.cs`.
- [x] **H4. `main.tsx`: `.catch` на `enableMocks`.**
- [~] **H5. `/auth/manual`:** валідація + hardening `resolve_steam_id` (try/except) ✅; гейт запису/unlock за OpenID — `[?]` рішення.
- [ ] **H6. Фронт-тести (vitest).** НЕ зроблено (нема раннера) — додано 4 backend-регрес-тести замість. Лишається як окрема задача.
- [ops] **H7. Ротувати `STEAM_API_KEY` + `JWT_SECRET`** (живі в `backend/.env`).

## 🟡 MEDIUM

- [x] **M1. global% unknown → `100.0` (common), не `0.0` (mythic).** `assembler.py`.
- [x] **M2. JWT у fragment `#token=`** (не query). `config.py` + `AuthCallbackPage.tsx` (+ чистка адресного рядка).
- [x] **M3. Агент: валідація Host** (DNS-rebinding). `HttpServer.cs`.
- [x] **M4. `agentFetch`: AbortController timeout 4с.** `agent.ts`.
- [x] **M5. Cap `ids` (≤1000) на UnlockRequest.** `schemas.py`.
- [x] **M6. CI: вбудований `gh` замість стороннього action** + публікація SHA-256. `agent-release.yml`.
- [x] **M7. `install.bat`: taskkill перед копіюванням** + `uninstall.bat` у цільову теку.
- [D] **M8. CORS бекенду + return-URL: прод-origin** (механізм env готовий).
- [ops] **M9. In-memory settings/notifications → БД; sqlite → Postgres.**
- [ops] **M10. `/notifications` кешувати.**

## 🟢 LOW

- [x] **L1.** `allow_credentials=False` (Bearer, не cookies). `main.py`.
- [x] **L2.** `setAgentUrl` — валідація loopback-URL. `agent.ts`.
- [x] **L3.** ProgressBar вже клампить >100 (n/a).
- [x] **L4.** `putJson` → `api.put` (спільний 401-flow). `hooks.ts`+`client.ts`.
- [x] **L5.** `/docs`,`/redoc`,`/openapi.json` вимкнені у проді. `main.py`.
- [ ] **L6.** podium-лейбли за рангом незалежно від метрики — косметика, лишив.
- [?] **L7.** Cross-browser PNA hint (Firefox/Safari).
- [ops] **L8.** Підпис exe; Alembic; rivals-заглушки; `SetAchievement` валідація id.

---

## Лишилось (не код / рішення)
- **Домен фронта** → B1 фінальний origin (env `ACHIVO_ALLOWED_ORIGINS`), M8.
- **Модель auth** (H5): гейт unlock/settings за OpenID?
- **Ротація ключів** (H7), **Postgres/persist** (M9), **підпис exe** (L8) — деплой.
- **Фронт-тести** (H6), **cross-browser PNA** (L7).
