"""Application configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings.

    Values are read from the environment (and a local ``.env`` file if present).
    Sensible demo-friendly defaults let the app boot with zero configuration.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Raw database URL as provided by the environment. Normalization to an async
    # driver happens in ``database.py`` so this stays a faithful copy of the env.
    database_url: str = "sqlite+aiosqlite:///./court_cases.db"

    # Comma-separated origins. The "*" entry keeps the demo painless.
    cors_origins: str = "http://localhost:3000,*"

    # Whether to seed sample/synthetic data on startup if the table is empty.
    # Off by default so a real dataset is never mixed with demo rows; set
    # SEED_ON_STARTUP=true (e.g. locally) to populate sample data.
    seed_on_startup: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse the comma-separated CORS origins into a clean list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor."""
    return Settings()


settings = get_settings()
