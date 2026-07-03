import { http, HttpResponse, delay } from "msw";
import type { Settings, UnlockResponse } from "@/api/types";
import {
  buildGame,
  buildLibrary,
  buildRoadmap,
  buildStats,
  leaderboard,
  me,
  notifications,
  settings,
  unlockedIds,
  updateSettings,
} from "./data";

// Ті самі шляхи, що й у реального бекенду (Потік 1) — SHARED CONTRACT.
export const handlers = [
  http.post("*/auth/manual", async () => {
    await delay(150);
    return HttpResponse.json({ token: "mock-token", steamId: me.steamId });
  }),

  http.get("*/api/me", async () => {
    await delay(150);
    return HttpResponse.json(me);
  }),

  http.get("*/api/library", async () => {
    await delay(200);
    return HttpResponse.json(buildLibrary());
  }),

  http.get("*/api/game/:appId/roadmap", async ({ params }) => {
    await delay(220);
    const roadmap = buildRoadmap(Number(params.appId));
    if (!roadmap) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(roadmap);
  }),

  http.get("*/api/game/:appId", async ({ params }) => {
    await delay(180);
    const game = buildGame(Number(params.appId));
    if (!game) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(game);
  }),

  // Unlock іде НАПРЯМУ в локальний агент (POST 127.0.0.1:57343/unlock/batch).
  // Тіло контракту агента: { appId, ids }, відповідь: { ok, results:[{id,ok}] }.
  http.post("*/unlock/batch", async ({ request }) => {
    await delay(700);
    const body = (await request.json()) as { appId?: number; ids?: string[] };
    const ids = body?.ids ?? [];

    // Демо-шлях помилки: ачивки з суфіксом "_secret" агент відхиляє.
    const results = ids.map((id) => {
      const ok = !id.endsWith("_secret");
      if (ok) unlockedIds.add(id);
      return { id, ok };
    });

    const response: UnlockResponse = {
      ok: results.every((r) => r.ok),
      results,
      error: results.some((r) => !r.ok)
        ? "Деякі ачивки захищені й не були розблоковані."
        : undefined,
    };
    return HttpResponse.json(response);
  }),

  // Health локального агента: браузер читає його НАПРЯМУ (127.0.0.1:57343/health).
  http.get("*/health", async () => {
    await delay(120);
    return HttpResponse.json({ steamRunning: true, version: "1.4.0" });
  }),

  http.get("*/api/stats", async () => {
    await delay(200);
    return HttpResponse.json(buildStats());
  }),

  http.get("*/api/settings", async () => {
    await delay(120);
    return HttpResponse.json(settings);
  }),

  // PUT зливає тіло з поточними налаштуваннями й повертає збережене.
  http.put("*/api/settings", async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as Partial<Settings>;
    return HttpResponse.json(updateSettings(body ?? {}));
  }),

  http.get("*/api/leaderboard", async () => {
    await delay(200);
    return HttpResponse.json(leaderboard);
  }),

  http.get("*/api/notifications", async () => {
    await delay(160);
    return HttpResponse.json(notifications);
  }),

  // Без ids — позначаємо всі; повертаємо кількість непрочитаних.
  http.post("*/api/notifications/read", async ({ request }) => {
    await delay(150);
    const body = (await request.json().catch(() => ({}))) as {
      ids?: string[];
    };
    const ids = body?.ids;
    for (const n of notifications) {
      if (!ids || ids.includes(n.id)) n.read = true;
    }
    const unread = notifications.filter((n) => !n.read).length;
    return HttpResponse.json({ ok: true, unread });
  }),
];
