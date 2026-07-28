"""Tests for authentication: session dependency, /auth/me, logout, providers."""

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.user import User
from app.schemas.user import OAuthUserInfo
from app.services.auth_service import get_or_create_user_from_oauth


def _make_user(db: Session, email: str = "alice@example.com") -> User:
    user = User(email=email, full_name="Alice", provider="google")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_me_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_returns_current_user_with_valid_cookie(
    client: TestClient, db_session: Session
) -> None:
    user = _make_user(db_session)
    client.cookies.set("trainlab_session", create_access_token(str(user.id)))

    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 200

    data = resp.json()
    assert data["email"] == "alice@example.com"
    assert data["provider"] == "google"
    assert data["id"] == str(user.id)


def test_me_rejects_invalid_token(client: TestClient) -> None:
    client.cookies.set("trainlab_session", "not-a-valid-jwt")
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_rejects_token_for_missing_user(client: TestClient) -> None:
    # Valid signature, but no such user in the database.
    token = create_access_token("00000000-0000-0000-0000-000000000000")
    client.cookies.set("trainlab_session", token)
    assert client.get("/api/v1/auth/me").status_code == 401


def test_logout_clears_session_cookie(client: TestClient) -> None:
    resp = client.post("/api/v1/auth/logout")
    assert resp.status_code == 200
    assert resp.json()["status"] == "logged_out"
    # The response instructs the browser to delete the cookie.
    assert "trainlab_session" in resp.headers.get("set-cookie", "")


def test_providers_endpoint_lists_both(client: TestClient) -> None:
    resp = client.get("/api/v1/auth/providers")
    assert resp.status_code == 200
    assert set(resp.json().keys()) == {"google", "github"}


def test_login_unknown_provider_is_404(client: TestClient) -> None:
    resp = client.get("/api/v1/auth/twitter/login", follow_redirects=False)
    assert resp.status_code == 404


def test_get_or_create_user_is_idempotent(db_session: Session) -> None:
    info = OAuthUserInfo(
        email="bob@example.com",
        full_name="Bob",
        provider="github",
        provider_account_id="42",
    )
    first = get_or_create_user_from_oauth(db_session, info)
    second = get_or_create_user_from_oauth(db_session, info)

    assert first.id == second.id
    count = db_session.scalar(select(func.count()).select_from(User))
    assert count == 1
