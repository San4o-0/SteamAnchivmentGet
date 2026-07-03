// Прямий клієнт до ЛОКАЛЬНОГО агента (Потік 2), який крутиться на машині
// користувача на http://127.0.0.1:57343. Браузер стукає в нього НАПРЯМУ — не
// через бекенд, бо захостений бекенд не бачить чужого 127.0.0.1.
//
// Це loopback і власна машина користувача, тож токен/авторизація не потрібні.
// Агент віддає CORS `*` + Access-Control-Allow-Private-Network: true, тож
// виклик із HTTPS-сайту дозволений (Chrome Private Network Access).

import type { AgentHealth, UnlockResponse } from "./types";

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

async function agentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${getAgentUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
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
  return agentFetch<UnlockResponse>("/unlock/batch", {
    method: "POST",
    body: JSON.stringify({ appId, ids }),
  });
}
