# Achivo — Steam Achievement Manager (Frontend / Потік 3)

React + TypeScript + Vite frontend for tracking and completing Steam achievements.
Runs fully against **MSW mocks** that mirror the SHARED CONTRACT, so it works with
zero backend. Flip one env var to point at the real REST backend (Потік 1).

## Стек

- React 18 + TypeScript + Vite
- TanStack Query (server state)
- React Router 6
- Tailwind CSS (dark, Steam-vibe)
- MSW (mock service worker — контракт-сумісні моки)

## Запуск

```bash
npm install
npm run dev      # http://localhost:5173  (моки увімкнені)
npm run build    # tsc + production build
npm run preview  # прев'ю прод-збірки
```

## Перемикання моки → реальний бекенд

Все зав'язано на дві змінні в `.env`:

```env
VITE_API_BASE_URL=https://api.your-backend.example   # база REST-бекенду (Потік 1)
VITE_ENABLE_MOCKS=false                               # вимкнути MSW
```

Жодного коду міняти не треба — `src/api/client.ts` додає base URL до кожного
шляху, а `src/mocks/browser.ts` не стартує воркер, коли моки вимкнені.

## Маршрути

| Route | Сторінка |
|---|---|
| `/login` | Вхід через Steam (→ `/auth/steam`) |
| `/dashboard` | Профіль + статистика + наступні цілі |
| `/library` | Сітка ігор + фільтри |
| `/game/:appId` | Деталі гри, ачивки, складність |
| `/game/:appId/roadmap` | Timeline-маршрут до 100% + Unlock |

## Контракт (SHARED CONTRACT)

Типи — у `src/api/types.ts`, запити — у `src/api/hooks.ts`. Ендпоінти:

- `GET /api/me`, `GET /api/library`, `GET /api/game/{appId}`, `GET /api/game/{appId}/roadmap`
- `POST /api/game/{appId}/unlock { ids: [..] }` (за MVP-специфікацією)
- `GET /api/agent/health` — статус локального агента (для банера)

> Примітка щодо unlock: MVP описує `POST /api/game/{appId}/unlock`, тоді як
> секція локального агента має `/unlock` та `/unlock/batch`. Фронтенд говорить
> лише з REST-бекендом за MVP-шляхом; бекенд проксіює агента. Якщо бекенд
> віддасть перевагу batch-формі — правиться один рядок у `useUnlock`.

## Структура

```
src/
  api/        client.ts · types.ts · hooks.ts
  mocks/      browser.ts · handlers.ts · data.ts
  components/ layout/ · ui/ · library/ · game/ · roadmap/
  pages/      Login · Dashboard · Library · GameDetail · Roadmap
  lib/        format.ts
```
