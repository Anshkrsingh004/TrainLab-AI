"""Authentication business logic."""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import OAuthUserInfo


def get_or_create_user_from_oauth(db: Session, info: OAuthUserInfo) -> User:
    """Resolve an OAuth identity to a User, creating one if needed.

    Accounts are keyed by email, so the same address arriving via a different
    provider maps to the same user; profile fields and the originating provider
    are refreshed on every login.
    """
    user = db.execute(
        select(User).where(User.email == info.email)
    ).scalar_one_or_none()
    now = datetime.now(UTC)

    if user is None:
        user = User(
            email=info.email,
            full_name=info.full_name,
            avatar_url=info.avatar_url,
            provider=info.provider,
            provider_account_id=info.provider_account_id,
            last_login_at=now,
        )
        db.add(user)
    else:
        user.full_name = info.full_name or user.full_name
        user.avatar_url = info.avatar_url or user.avatar_url
        user.provider = info.provider
        user.provider_account_id = (
            info.provider_account_id or user.provider_account_id
        )
        user.last_login_at = now

    db.commit()
    db.refresh(user)
    return user
