"""FastAPI application entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import async_session, init_db
from .routers import cases, exports, imports, reports
from .seed import seed_if_empty

logger = logging.getLogger("court_cases")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (idempotent) on startup.
    await init_db()

    if settings.seed_on_startup:
        async with async_session() as db:
            inserted = await seed_if_empty(db)
            if inserted:
                logger.info("Seeded %d sample cases", inserted)
    yield


app = FastAPI(title="Court Cases API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases.router)
app.include_router(imports.router)
app.include_router(reports.router)
app.include_router(exports.router)


@app.get("/")
async def root() -> dict:
    return {"service": "Court Cases API", "docs": "/docs", "health": "/api/health"}
