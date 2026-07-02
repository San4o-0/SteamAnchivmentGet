import { http, HttpResponse, delay } from "msw";
import type { UnlockResponse } from "@/api/types";
import {
  buildGame,
  buildLibrary,
  buildRoadmap,
  me,
  unlockedIds,
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

  http.post("*/api/game/:appId/unlock", async ({ request }) => {
    await delay(700);
    const body = (await request.json()) as { ids: string[] };
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

  // Бекенд проксіює це з GET http://127.0.0.1:57343/health локального агента.
  http.get("*/api/agent/health", async () => {
    await delay(120);
    return HttpResponse.json({ steamRunning: true, version: "1.4.0" });
  }),
];
