"""Model registry for Alembic autogenerate.

Import ``Base`` plus every ORM model here so that Alembic can discover their
metadata. No models exist yet in Milestone 1 — future models get added below.
"""

from app.db.base_class import Base  # noqa: F401
from app.models.project import Project  # noqa: F401
from app.models.user import User  # noqa: F401
