# SAM.Agent — локальний агент розблокування ачивок

Фоновий локальний HTTP-сервіс на базі **SAM.API** (інтероп зі `steamclient.dll`).
Це «руки» сервісу — єдина частина, що фізично ставить ачивки, бо працює
локально на машині, де запущений Steam.

Реалізує локальну частину **Shared Contract**:

| Метод | Шлях            | Тіло запиту                     | Відповідь |
|-------|-----------------|---------------------------------|-----------|
| GET   | `/health`       | —                               | `{ "steamRunning": bool, "version": "1.0.0" }` |
| POST  | `/unlock`       | `{ "appId": 220, "achievementId": "ACH_X" }` | `{ "ok": bool, "error"?: string }` |
| POST  | `/unlock/batch` | `{ "appId": 220, "ids": ["A","B"] }` | `{ "ok": bool, "results": [{ "id": "A", "ok": true }], "error"?: string }` |

Слухає **тільки** `http://127.0.0.1:57343` (loopback). Небезпечно/віддалено
достукатись не можна: сервер прив'язаний до `127.0.0.1` і додатково відкидає
не-localhost запити (403).

## Вимоги

- **Windows** із встановленим Steam (агент вантажить `steamclient.dll`).
- **.NET Framework 4.8** (є в усіх сучасних Windows).
- Збірка: Visual Studio 2019+ або `dotnet` SDK / `msbuild`.
- **Платформа x86 обов'язкова** — `steamclient.dll` 32-бітна, тому й процес
  агента 32-бітний (проєкт уже налаштований на `x86`).
- Перед розблокуванням **Steam має бути запущений і залогінений**.

## Збірка

З VS: відкрий `SAM.sln`, обери конфігурацію `Release | x86`, збери проєкт
`SAM.Agent`.

З командного рядка (Developer Command Prompt / встановлений MSBuild):

```bat
msbuild SAM.sln /t:SAM_Agent /p:Configuration=Release /p:Platform=x86
```

або через .NET SDK:

```bat
dotnet build SAM.Agent\SAM.Agent.csproj -c Release -p:Platform=x86
```

Результат: `SAM.Agent\bin\x86\Release\net48\SAM.Agent.exe`.

## Запуск

```bat
SAM.Agent.exe
```

Вивід:

```
SAM.Agent listening on http://127.0.0.1:57343
Endpoints: GET /health, POST /unlock, POST /unlock/batch
Steam running: True
Press Ctrl+C to stop.
```

Прив'язка до loopback-IP `127.0.0.1` **не потребує адмін-прав** (URL ACL не
потрібен). Для запуску у фоні без вікна: `Start-Process SAM.Agent.exe
-WindowStyle Hidden`, ярлик у автозавантаженні, або Task Scheduler.

## Приклади curl

Health:

```bat
curl http://127.0.0.1:57343/health
```

```json
{"steamRunning":true,"version":"1.0.0"}
```

Розблокувати одну ачивку (приклад: Half-Life 2, appId 220):

```bat
curl -X POST http://127.0.0.1:57343/unlock ^
  -H "Content-Type: application/json" ^
  -d "{\"appId\":220,\"achievementId\":\"HL2_HIT_CANCROACH\"}"
```

```json
{"ok":true}
```

Помилка (Steam не запущений):

```json
{"ok":false,"error":"Steam is not running, or the game is locked by Family Share"}
```

Батч (одна гра, кілька ачивок):

```bat
curl -X POST http://127.0.0.1:57343/unlock/batch ^
  -H "Content-Type: application/json" ^
  -d "{\"appId\":220,\"ids\":[\"HL2_HIT_CANCROACH\",\"HL2_BREAK_MINITELEPORTER\"]}"
```

```json
{"ok":true,"results":[{"id":"HL2_HIT_CANCROACH","ok":true},{"id":"HL2_BREAK_MINITELEPORTER","ok":true}]}
```

> На Linux/curl bash використовуй `-d '{"appId":220,"achievementId":"..."}'`
> (одинарні лапки) замість екранованих — приклади вище під `cmd.exe`.

## Як це працює (потік розблокування)

Повторює перевірений цикл із `SAM.Game/Manager.cs`:

1. `new API.Client()` + `Initialize(appId)` — підміна `SteamAppId`, завантаження
   `steamclient.dll`, створення pipe та підключення користувача.
2. `SteamUser.GetSteamId()` → `SteamUserStats.RequestUserStats(steamId)`.
3. Прокачування `client.RunCallbacks(false)` у циклі, доки не спрацює
   callback `UserStatsReceived` (Id 1101, `Result==1`) або не спрацює таймаут (10 с).
4. `SteamUserStats.SetAchievement(id, true)` для кожної ачивки.
5. `SteamUserStats.StoreStats()` — запис у Steam.
6. `client.Dispose()` — коректне звільнення pipe/user.

**Один клієнт на appId.** Steam-клієнт ініціалізується під один appId, тому
`/unlock/batch` приймає єдиний `appId` і робить один `Initialize` на весь батч.
Усі Steam-операції серіалізовані під `lock` (нативний клієнт не розрахований на
паралельні виклики).

## Обробка помилок

| Ситуація | Відповідь |
|----------|-----------|
| Steam не запущений | `/health` → `steamRunning:false`; `/unlock` → `ok:false, error:"Steam is not running..."` |
| appId mismatch | `error:"appId mismatch: Steam reported a different running app"` |
| Невідома ачивка | `SetAchievement` → `ok:false, error:"SetAchievement failed (unknown achievement id...)"` |
| Збій запису | `error:"StoreStats failed"` |
| Таймаут статів | `error:"timed out waiting for user stats from Steam"` |
| Не-localhost | HTTP 403 `{"error":"forbidden: localhost only"}` |

## Обмеження / нотатки

- Без зовнішніх NuGet-залежностей: HTTP через `System.Net.HttpListener`,
  JSON через власний мінімальний `MiniJson`.
- Один інстанс на порт `57343`. Якщо порт зайнятий — агент завершиться з
  повідомленням.
- Не входить у скоуп: веб-бекенд, UI, читання бібліотеки/статів через Web API.
  Єдиний клієнт агента — веб-бекенд (Потік 1), контракт фіксований.
