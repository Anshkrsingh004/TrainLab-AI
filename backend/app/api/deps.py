"""Shared FastAPI dependencies.

A stable import surface for dependencies used across endpoints. Keeping it here
means future cross-cutting dependencies (auth, current-user, pagination) can be
added without touching every route module.
"""

from app.db.session import get_db

__all__ = ["get_db"]
