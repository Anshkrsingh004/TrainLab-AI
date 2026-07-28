"""User schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    avatar_url: str | None
    provider: str
    created_at: datetime


class OAuthUserInfo(BaseModel):
    """Normalized identity extracted from an OAuth provider's userinfo."""

    email: EmailStr
    full_name: str | None = None
    avatar_url: str | None = None
    provider: str
    provider_account_id: str | None = None
