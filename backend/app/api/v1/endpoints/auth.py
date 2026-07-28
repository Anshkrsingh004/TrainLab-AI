"""Authentication endpoints (OAuth login, callback, logout, current user).

The OAuth flow is owned entirely by the backend: it redirects to the provider,
handles the callback, upserts the user, and issues a stateless JWT session
cookie. Requests reach these routes through the Next.js proxy, so callback URLs
are built from the public frontend origin (see settings.oauth_callback_url).
"""

from urllib.parse import urlencode

from authlib.integrations.starlette_client import OAuthError
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.oauth import oauth
from app.core.security import (
    clear_session_cookie,
    create_access_token,
    set_session_cookie,
)
from app.models.user import User
from app.schemas.user import OAuthUserInfo, UserRead
from app.services.auth_service import get_or_create_user_from_oauth

router = APIRouter(prefix="/auth", tags=["auth"])

SUPPORTED_PROVIDERS = {"google", "github"}


def _provider_enabled(provider: str) -> bool:
    return {
        "google": settings.google_enabled,
        "github": settings.github_enabled,
    }.get(provider, False)


def _redirect_to_login(error: str) -> RedirectResponse:
    query = urlencode({"error": error})
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?{query}")


@router.get("/providers")
def providers() -> dict[str, bool]:
    """Which OAuth providers are configured (used by the login page)."""
    return {"google": settings.google_enabled, "github": settings.github_enabled}


@router.get("/{provider}/login")
async def login(provider: str, request: Request):
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown provider")
    if not _provider_enabled(provider):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"{provider} login is not configured",
        )
    client = oauth.create_client(provider)
    redirect_uri = settings.oauth_callback_url(provider)
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/{provider}/callback")
async def callback(provider: str, request: Request, db: Session = Depends(get_db)):
    if provider not in SUPPORTED_PROVIDERS or not _provider_enabled(provider):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown provider")

    client = oauth.create_client(provider)
    try:
        token = await client.authorize_access_token(request)
    except OAuthError:
        return _redirect_to_login(error="oauth_failed")

    info = await _extract_userinfo(provider, client, token)
    if info is None:
        return _redirect_to_login(error="no_email")

    user = get_or_create_user_from_oauth(db, info)
    access_token = create_access_token(str(user.id))

    response = RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard")
    set_session_cookie(response, access_token)
    return response


@router.post("/logout")
def logout() -> JSONResponse:
    response = JSONResponse({"status": "logged_out"})
    clear_session_cookie(response)
    return response


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


async def _extract_userinfo(provider: str, client, token) -> OAuthUserInfo | None:
    """Normalize provider-specific userinfo into OAuthUserInfo, or None."""
    if provider == "google":
        userinfo = token.get("userinfo")
        if userinfo is None:
            resp = await client.get(
                "https://openidconnect.googleapis.com/v1/userinfo", token=token
            )
            userinfo = resp.json()
        email = userinfo.get("email")
        if not email:
            return None
        sub = userinfo.get("sub")
        return OAuthUserInfo(
            email=email,
            full_name=userinfo.get("name"),
            avatar_url=userinfo.get("picture"),
            provider="google",
            provider_account_id=str(sub) if sub else None,
        )

    if provider == "github":
        data = (await client.get("user", token=token)).json()
        email = data.get("email")
        if not email:
            # GitHub hides email by default; fetch the primary verified one.
            for entry in (await client.get("user/emails", token=token)).json():
                if entry.get("primary") and entry.get("verified"):
                    email = entry.get("email")
                    break
        if not email:
            return None
        account_id = data.get("id")
        return OAuthUserInfo(
            email=email,
            full_name=data.get("name") or data.get("login"),
            avatar_url=data.get("avatar_url"),
            provider="github",
            provider_account_id=str(account_id) if account_id else None,
        )

    return None
