"""FastAPI application entry point.

Works both as a long-lived server (uvicorn, local/Koyeb) and as a Vercel Python
serverless function. Because Vercel does not run the ASGI lifespan reliably, table
creation + seeding is done lazily on the first request via an init-once guard.
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import async_session, init_db
from .routers import cases, exports, imports, reports
from .seed import seed_if_empty

logger = logging.getLogger("court_cases")

_ready = False
_init_lock = asyncio.Lock()


async def ensure_ready() -> None:
    """Create tables and seed once per process (idempotent, concurrency-safe)."""
    global _ready
    if _ready:
        return
    async with _init_lock:
        if _ready:
            return
        await init_db()
        if settings.seed_on_startup:
            try:
                async with async_session() as db:
                    inserted = await seed_if_empty(db)
                    if inserted:
                        logger.info("Seeded %d sample cases", inserted)
            except Exception as exc:  # another instance may have seeded concurrently
                logger.warning("Seed skipped: %s", exc)
        _ready = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs under uvicorn locally; on Vercel the middleware below handles init.
    try:
        await ensure_ready()
    except Exception as exc:  # don't block startup if the DB is briefly unavailable
        logger.warning("Startup init deferred: %s", exc)
    yield


app = FastAPI(title="Court Cases API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _ensure_initialized(request, call_next):
    await ensure_ready()
    return await call_next(request)


app.include_router(cases.router)
app.include_router(imports.router)
app.include_router(reports.router)
app.include_router(exports.router)


@app.get("/")
async def root() -> dict:
    return {"service": "Court Cases API", "docs": "/docs", "health": "/api/health"}
