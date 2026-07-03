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

export function setAgentUrl(url: string): void {
  try {
    const clean = url.trim().replace(/\/$/, "");
    if (clean) localStorage.setItem(STORAGE_KEY, clean);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* приватний режим / вимкнений storage — ігноруємо */
  }
}

async function agentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getAgentUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

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
