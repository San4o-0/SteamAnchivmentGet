// Прямий клієнт до ЛОКАЛЬНОГО агента (Потік 2), який крутиться на машині
// користувача на http://127.0.0.1:57343. Браузер стукає в нього НАПРЯМУ — не
// через бекенд, бо захостений бекенд не бачить чужого 127.0.0.1.
//
// Це loopback і власна машина користувача, тож токен/авторизація не потрібні.
// Агент віддає CORS `*` + Access-Control-Allow-Private-Network: true, тож
// виклик із HTTPS-сайту дозволений (Chrome Private Network Access).

import type { AgentHealth, AgentProgressResponse, UnlockResponse } from "./types";

const DEFAULT_AGENT_URL = "http://127.0.0.1:57343";
const STORAGE_KEY = "sam.agentUrl";

// Адресу агента можна перевизначити (напр. якщо порт зайнятий) — зберігаємо
// локально в браузері, бо це клієнт-специфічне, а не серверне налаштування.
export function getAgentUrl(): string {
  try {
    return (localStorage.getItem(STORAGE_KEY) || DEFAULT_AGENT_URL).replace(/\/$/, "");
  } catch {
    return DEFAULT_AGENT_URL;
  }
}

// Приймаємо лише loopback-URL (агент — локальний): http://127.0.0.1|localhost[:port].
// Повертає false і НЕ зберігає, якщо URL невалідний, щоб опис не «зламав» виклики.
export function setAgentUrl(url: string): boolean {
  const clean = url.trim().replace(/\/$/, "");
  try {
    if (!clean) {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    }
    const u = new URL(clean);
    const loopback =
      u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.hostname === "[::1]";
    if (u.protocol !== "http:" || !loopback) return false;
    localStorage.setItem(STORAGE_KEY, clean);
    return true;
  } catch {
    return false;
  }
}

// Таймаут: завислий агент (прийняв з'єднання, але не відповідає) інакше
// лишав би health-запит вічно pending і банер «офлайн» ніколи б не з'явився.
const AGENT_TIMEOUT_MS = 4000;

// unlock/progress спавнять окремий worker-процес (steamclient біндиться до
// одного appId на процес), який вантажить steamclient.dll і чекає стати від
// Steam — це секунди, а не мілісекунди. Тому їм даємо значно довший таймаут.
const AGENT_WORK_TIMEOUT_MS = 35000;

async function agentFetch<T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = AGENT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    // Chrome Local Network Access: a public HTTPS page reaching 127.0.0.1 is a
    // local network request. It must declare the target's address space, which
    // for 127.0.0.1 is "loopback" (NOT "local" — Chrome rejects a mismatch:
    // "target IP address space of `local` yet the resource is in `loopback`").
    // This makes Chrome allow it over HTTP / prompt for permission instead of
    // silently blocking. Not yet in the TS RequestInit type; other browsers
    // ignore the unknown option.
    const fetchInit: RequestInit & {
      targetAddressSpace?: "loopback" | "local" | "private";
    } = {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init?.headers },
      targetAddressSpace: "loopback",
    };
    res = await fetch(`${getAgentUrl()}${path}`, fetchInit);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.error ?? body?.message ?? message;
    } catch {
      /* не-JSON тіло помилки */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// GET /health -> { steamRunning, version }. Кидає, якщо агент офлайн
// (fetch reject) — це й є сигнал «агент не запущено» для банера.
export function agentHealth(): Promise<AgentHealth> {
  return agentFetch<AgentHealth>("/health");
}

// POST /unlock/batch { appId, ids } -> { ok, results:[{id, ok}] }.
export function agentUnlock(appId: number, ids: string[]): Promise<UnlockResponse> {
  return agentFetch<UnlockResponse>(
    "/unlock/batch",
    {
      method: "POST",
      body: JSON.stringify({ appId, ids }),
    },
    AGENT_WORK_TIMEOUT_MS,
  );
}

// POST /progress { appId } -> { ok, progress: { <id>: { min, max } } }.
// Lists the app's progress/stat-gated achievements (which the agent can't
// force-unlock), so the UI can show a goal and disable their unlock button.
export function agentProgress(appId: number): Promise<AgentProgressResponse> {
  return agentFetch<AgentProgressResponse>(
    "/progress",
    {
      method: "POST",
      body: JSON.stringify({ appId }),
    },
    AGENT_WORK_TIMEOUT_MS,
  );
}
