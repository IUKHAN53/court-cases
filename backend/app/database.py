"""Async database engine, session factory, declarative base and helpers."""
from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def _normalize_database_url(raw: str) -> tuple[str, dict]:
    """Return an async-driver SQLAlchemy URL and connect args.

    - ``postgres://`` / ``postgresql://`` -> ``postgresql+asyncpg://`` and enable
      SSL (required by Neon and most managed Postgres providers).
    - ``sqlite://`` -> ``sqlite+aiosqlite://`` if a sync driver was supplied.
    - Anything already specifying an async driver is left untouched.

    asyncpg does not understand libpq-style query params such as ``sslmode``,
    so we strip them and translate to a connect-arg instead.
    """
    url = raw.strip()
    connect_args: dict = {}

    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]

    if url.startswith("postgresql+asyncpg://"):
        # Detect SSL intent from libpq-style params, then strip them because
        # asyncpg rejects unknown query keys.
        wants_ssl = True  # Neon/managed PG effectively always need SSL.
        if "?" in url:
            base, query = url.split("?", 1)
            params = [p for p in query.split("&") if p]
            kept = []
            for p in params:
                key = p.split("=", 1)[0].lower()
                if key in {"sslmode", "ssl", "channel_binding"}:
                    val = p.split("=", 1)[1].lower() if "=" in p else ""
                    if val in {"disable", "false", "0", "allow"}:
                        wants_ssl = False
                    continue
                kept.append(p)
            url = base + (("?" + "&".join(kept)) if kept else "")
        if wants_ssl:
            connect_args["ssl"] = "require"

    elif url.startswith("sqlite://") and "+aiosqlite" not in url:
        url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    return url, connect_args


DATABASE_URL, _CONNECT_ARGS = _normalize_database_url(settings.database_url)

engine = create_async_engine(DATABASE_URL, echo=False, connect_args=_CONNECT_ARGS)

async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async session."""
    async with async_session() as session:
        yield session


async def init_db() -> None:
    """Create all tables. Import models so they are registered on ``Base``."""
    from . import models  # noqa: F401  (ensures model metadata is loaded)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
