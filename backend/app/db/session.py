"""Database engine and session management."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

_uri = settings.sqlalchemy_uri
# SQLite (used for local smoke tests) needs this to allow use across threads.
_connect_args = {"check_same_thread": False} if _uri.startswith("sqlite") else {}

engine = create_engine(_uri, pool_pre_ping=True, future=True, connect_args=_connect_args)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
