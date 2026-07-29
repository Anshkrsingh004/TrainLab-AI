"""Application configuration.

All settings are typed and loaded from environment variables (or a local .env
file) via pydantic-settings. Sensible localhost defaults keep local dev and the
test suite working with zero configuration.
"""

from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


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

    # Optional full connection-string override. When set it wins over the
    # POSTGRES_* parts above (e.g. a local sqlite:/// URL for quick testing).
    # Postgres remains the default everywhere it is not set.
    DATABASE_URL: str | None = None

    # ── Redis ─────────────────────────────────────────────────────
    # PLACEHOLDER: provisioned and configured for Release 2 (Celery / task
    # queue / caching). It is intentionally NOT used anywhere in Release 1.
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Storage / uploads ─────────────────────────────────────────
    # Local filesystem storage for uploaded datasets. Abstracted behind
    # app.core.storage so object storage can replace it in a later release.
    STORAGE_DIR: str = "storage"
    MAX_UPLOAD_MB: int = 50

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024

    # ── Training ──────────────────────────────────────────────────
    # When True, creating an experiment launches its training thread. Tests set
    # this False and drive the training function directly. Release 2 replaces
    # the in-process thread with a Celery task.
    TRAINING_AUTOLAUNCH: bool = True

    # ── CORS ──────────────────────────────────────────────────────
    # NoDecode: keep pydantic-settings from JSON-parsing the env value so a
    # plain comma-separated string is accepted (handled by the validator below).
    BACKEND_CORS_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    # ── Frontend ──────────────────────────────────────────────────
    # Public origin of the web app. Used as the post-login redirect target and
    # as the base for building OAuth callback URLs (requests reach the backend
    # through the Next.js proxy, so the public origin must be explicit).
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Security / session ────────────────────────────────────────
    # MUST be overridden with a strong random value in any real deployment.
    SECRET_KEY: str = "dev-insecure-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    SESSION_COOKIE_NAME: str = "trainlab_session"
    COOKIE_SECURE: bool = False  # set True behind HTTPS in production
    COOKIE_SAMESITE: str = "lax"

    # ── OAuth providers ───────────────────────────────────────────
    # Populated from environment. Empty by default so the app still boots
    # without credentials; a provider is only enabled when its pair is set.
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    def oauth_callback_url(self, provider: str) -> str:
        return f"{self.FRONTEND_URL}{self.API_V1_PREFIX}/auth/{provider}/callback"

    @property
    def google_enabled(self) -> bool:
        return bool(self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET)

    @property
    def github_enabled(self) -> bool:
        return bool(self.GITHUB_CLIENT_ID and self.GITHUB_CLIENT_SECRET)

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors(cls, v: object) -> object:
        # Allow a comma-separated string in env vars in addition to a JSON list.
        if isinstance(v, str) and not v.startswith("["):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def sqlalchemy_uri(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
