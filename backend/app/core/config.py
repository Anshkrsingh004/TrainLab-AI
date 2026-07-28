"""Application configuration.

All settings are typed and loaded from environment variables (or a local .env
file) via pydantic-settings. Sensible localhost defaults keep local dev and the
test suite working with zero configuration.
"""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # ── Application ───────────────────────────────────────────────
    PROJECT_NAME: str = "TrainLab AI"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # ── Database (PostgreSQL) ─────────────────────────────────────
    POSTGRES_USER: str = "trainlab"
    POSTGRES_PASSWORD: str = "trainlab"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "trainlab"

    # ── Redis ─────────────────────────────────────────────────────
    # PLACEHOLDER: provisioned and configured for Release 2 (Celery / task
    # queue / caching). It is intentionally NOT used anywhere in Release 1.
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── CORS ──────────────────────────────────────────────────────
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors(cls, v: object) -> object:
        # Allow a comma-separated string in env vars in addition to a JSON list.
        if isinstance(v, str) and not v.startswith("["):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
