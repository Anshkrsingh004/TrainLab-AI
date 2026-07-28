"""Shared FastAPI dependencies.

A stable import surface for dependencies used across endpoints, so cross-cutting
concerns (DB session, current user) live in one place.
"""

import uuid

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

__all__ = ["get_db", "get_current_user"]

_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Resolve the authenticated user from the session cookie.

    Raises 401 if the cookie is missing, malformed, expired, or references a
    user that no longer exists / is inactive. Depend on this in any route that
    must be protected.
    """
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        raise _UNAUTHENTICATED

    subject = decode_access_token(token)
    if subject is None:
        raise _UNAUTHENTICATED

    try:
        user_id = uuid.UUID(subject)
    except ValueError:
        raise _UNAUTHENTICATED from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _UNAUTHENTICATED

    return user
