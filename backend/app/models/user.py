"""User model.

A user is created the first time they sign in via an OAuth provider. Accounts
are keyed by email so signing in with either Google or GitHub for the same
address resolves to one user. The originating provider is recorded for display
and auditing.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    # OAuth provider that most recently authenticated this user ("google" /
    # "github") and the account id reported by that provider.
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    provider_account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User {self.email} ({self.provider})>"
