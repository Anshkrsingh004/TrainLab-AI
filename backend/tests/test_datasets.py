"""Tests for dataset upload, inspection, preview, deletion, and isolation."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.user import User

CSV = b"age,city,score\n25,NYC,0.9\n30,LA,0.8\n41,NYC,0.7\n"


def _user(db: Session, email: str) -> User:
    user = User(email=email, full_name=email.split("@")[0], provider="google")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(client: TestClient, user: User) -> None:
    client.cookies.set("trainlab_session", create_access_token(str(user.id)))


def _project(client: TestClient, name: str = "DS project") -> str:
    return client.post("/api/v1/projects", json={"name": name}).json()["id"]


def _upload(client: TestClient, project_id: str, content: bytes = CSV, filename: str = "data.csv"):
    return client.post(
        f"/api/v1/projects/{project_id}/datasets",
        files={"file": (filename, content, "text/csv")},
    )


def test_upload_requires_auth(client: TestClient) -> None:
    resp = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/datasets",
        files={"file": ("data.csv", CSV, "text/csv")},
    )
    assert resp.status_code == 401


def test_upload_detects_schema_and_stats(client: TestClient, db_session: Session) -> None:
    _auth(client, _user(db_session, "alice@example.com"))
    pid = _project(client)

    resp = _upload(client, pid)
    assert resp.status_code == 201
    data = resp.json()
    assert data["row_count"] == 3
    assert data["column_count"] == 3
    assert data["file_type"] == "csv"

    schema = {c["name"]: c["dtype"] for c in data["columns"]}
    assert schema == {"age": "integer", "city": "string", "score": "float"}

    stats = data["statistics"]
    assert stats["rows"] == 3
    assert stats["column_stats"]["age"]["max"] == 41


def test_preview_and_list(client: TestClient, db_session: Session) -> None:
    _auth(client, _user(db_session, "alice@example.com"))
    pid = _project(client)
    dataset_id = _upload(client, pid).json()["id"]

    preview = client.get(f"/api/v1/datasets/{dataset_id}/preview")
    assert preview.status_code == 200
    body = preview.json()
    assert body["columns"] == ["age", "city", "score"]
    assert len(body["rows"]) == 3
    assert body["total_rows"] == 3

    listing = client.get("/api/v1/datasets")
    assert listing.status_code == 200
    assert listing.json()[0]["project_name"] == "DS project"

    scoped = client.get(f"/api/v1/datasets?project_id={pid}")
    assert len(scoped.json()) == 1


def test_delete_dataset(client: TestClient, db_session: Session) -> None:
    _auth(client, _user(db_session, "alice@example.com"))
    pid = _project(client)
    dataset_id = _upload(client, pid).json()["id"]

    assert client.delete(f"/api/v1/datasets/{dataset_id}").status_code == 204
    assert client.get(f"/api/v1/datasets/{dataset_id}").status_code == 404


def test_rejects_unsupported_type(client: TestClient, db_session: Session) -> None:
    _auth(client, _user(db_session, "alice@example.com"))
    pid = _project(client)
    resp = _upload(client, pid, content=b"hello", filename="notes.txt")
    assert resp.status_code == 400


def test_rejects_empty_file(client: TestClient, db_session: Session) -> None:
    _auth(client, _user(db_session, "alice@example.com"))
    pid = _project(client)
    resp = _upload(client, pid, content=b"", filename="empty.csv")
    assert resp.status_code == 400


def test_datasets_isolated_per_user(client: TestClient, db_session: Session) -> None:
    alice = _user(db_session, "alice@example.com")
    bob = _user(db_session, "bob@example.com")

    _auth(client, alice)
    pid = _project(client)
    dataset_id = _upload(client, pid).json()["id"]

    _auth(client, bob)
    assert client.get("/api/v1/datasets").json() == []
    assert client.get(f"/api/v1/datasets/{dataset_id}").status_code == 404
    assert client.delete(f"/api/v1/datasets/{dataset_id}").status_code == 404
    # Bob cannot upload into Alice's project either.
    assert _upload(client, pid).status_code == 404
