"""Tests for project CRUD, archiving, and cross-user isolation."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.user import User


def _make_user(db: Session, email: str) -> User:
    user = User(email=email, full_name=email.split("@")[0], provider="google")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(client: TestClient, user: User) -> None:
    client.cookies.set("trainlab_session", create_access_token(str(user.id)))


def test_project_requires_auth(client: TestClient) -> None:
    assert client.get("/api/v1/projects").status_code == 401
    assert client.post("/api/v1/projects", json={"name": "X"}).status_code == 401


def test_create_list_get_project(client: TestClient, db_session: Session) -> None:
    _auth(client, _make_user(db_session, "alice@example.com"))

    created = client.post(
        "/api/v1/projects",
        json={"name": "Churn model", "description": "predict churn"},
    )
    assert created.status_code == 201
    pid = created.json()["id"]
    assert created.json()["is_archived"] is False

    listed = client.get("/api/v1/projects")
    assert listed.status_code == 200
    assert [p["id"] for p in listed.json()] == [pid]

    one = client.get(f"/api/v1/projects/{pid}")
    assert one.status_code == 200
    assert one.json()["name"] == "Churn model"


def test_duplicate_name_conflicts(client: TestClient, db_session: Session) -> None:
    _auth(client, _make_user(db_session, "alice@example.com"))
    client.post("/api/v1/projects", json={"name": "Dup"})
    again = client.post("/api/v1/projects", json={"name": "Dup"})
    assert again.status_code == 409


def test_update_and_archive(client: TestClient, db_session: Session) -> None:
    _auth(client, _make_user(db_session, "alice@example.com"))
    pid = client.post("/api/v1/projects", json={"name": "Old"}).json()["id"]

    renamed = client.patch(f"/api/v1/projects/{pid}", json={"name": "New"})
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "New"

    archived = client.patch(f"/api/v1/projects/{pid}", json={"is_archived": True})
    assert archived.json()["is_archived"] is True

    # Archived projects are hidden by default, shown when requested.
    assert client.get("/api/v1/projects").json() == []
    assert len(client.get("/api/v1/projects?include_archived=true").json()) == 1


def test_delete_project(client: TestClient, db_session: Session) -> None:
    _auth(client, _make_user(db_session, "alice@example.com"))
    pid = client.post("/api/v1/projects", json={"name": "Temp"}).json()["id"]

    assert client.delete(f"/api/v1/projects/{pid}").status_code == 204
    assert client.get(f"/api/v1/projects/{pid}").status_code == 404


def test_projects_are_isolated_per_user(client: TestClient, db_session: Session) -> None:
    alice = _make_user(db_session, "alice@example.com")
    bob = _make_user(db_session, "bob@example.com")

    _auth(client, alice)
    pid = client.post("/api/v1/projects", json={"name": "Alice's"}).json()["id"]

    # Bob cannot see, fetch, edit, or delete Alice's project.
    _auth(client, bob)
    assert client.get("/api/v1/projects").json() == []
    assert client.get(f"/api/v1/projects/{pid}").status_code == 404
    assert client.patch(f"/api/v1/projects/{pid}", json={"name": "x"}).status_code == 404
    assert client.delete(f"/api/v1/projects/{pid}").status_code == 404
