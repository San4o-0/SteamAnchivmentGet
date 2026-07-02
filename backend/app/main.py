"""Точка входу FastAPI: CORS, роутери, ініціалізація БД, /health."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import init_db
from .routers import agent, auth, game, library, me


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="SAM Tracker API",
        version="0.1.0",
        description="Бекенд трекінгу Steam-ачивок (Потік 1: мозок + roadmap).",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(me.router)
    app.include_router(library.router)
    app.include_router(game.router)
    app.include_router(agent.router)

    @app.get("/health", tags=["health"])
    async def health():
        return {"ok": True, "service": "sam-tracker-api"}

    return app


app = create_app()
