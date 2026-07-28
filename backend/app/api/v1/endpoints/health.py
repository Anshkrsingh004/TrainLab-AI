"""Health-check endpoint.

Reports service metadata plus a live database connectivity check. The DB ping
is best-effort: the endpoint still returns 200 if the database is unreachable,
surfacing the state via the ``database`` field so it is usable as a lightweight
liveness probe even before Postgres is up.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)) -> HealthResponse:
    try:
        db.execute(text("SELECT 1"))
        database = "ok"
    except Exception:
        database = "down"

    return HealthResponse(
        status="ok",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database=database,
    )
