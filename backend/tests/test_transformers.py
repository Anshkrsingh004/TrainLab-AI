"""Tests for transformer training: metadata, hardware, and config validation.

Actual fine-tuning is verified live (too slow/heavy for the unit suite); these
tests exercise everything up to launch without loading torch (except the
hardware endpoint, which intentionally detects the device).
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.user import User

CSV = b"text,label\ngreat product,positive\nawful thing,negative\nit is fine,neutral\n"


def _user(db: Session, email: str) -> User:
    user = User(email=email, full_name=email.split("@")[0], provider="google")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(client: TestClient, user: User) -> None:
    client.cookies.set("trainlab_session", create_access_token(str(user.id)))


def _project(client: TestClient) -> str:
    return client.post("/api/v1/projects", json={"name": "NLP"}).json()["id"]


def _dataset(client: TestClient, project_id: str) -> str:
    return client.post(
        f"/api/v1/projects/{project_id}/datasets",
        files={"file": ("reviews.csv", CSV, "text/csv")},
    ).json()["id"]


def _launch(client: TestClient, dataset_id: str, **overrides):
    body = {
        "family": "transformer",
        "task_type": "classification",
        "algorithm": "distilbert",
        "target_column": "label",
        "feature_columns": ["text"],
    }
    body.update(overrides)
    return client.post(f"/api/v1/datasets/{dataset_id}/experiments", json=body)


def test_transformer_models_metadata(client: TestClient) -> None:
    resp = client.get("/api/v1/experiments/transformer-models")
    assert resp.status_code == 200
    keys = {m["key"] for m in resp.json()}
    assert {"distilbert", "bert", "roberta"} <= keys


def test_hardware_requires_auth(client: TestClient) -> None:
    assert client.get("/api/v1/experiments/hardware").status_code == 401


def test_hardware_endpoint(client: TestClient, db_session: Session) -> None:
    _auth(client, _user(db_session, "a@b.com"))
    resp = client.get("/api/v1/experiments/hardware")
    assert resp.status_code == 200
    body = resp.json()
    assert "gpu" in body
    assert body["device"] in {"cpu", "cuda"}


def test_transformer_validation(client: TestClient, db_session: Session) -> None:
    _auth(client, _user(db_session, "a@b.com"))
    dataset_id = _dataset(client, _project(client))

    assert _launch(client, dataset_id, algorithm="gpt").status_code == 400
    assert _launch(client, dataset_id, target_column="nope").status_code == 400
    assert _launch(client, dataset_id, feature_columns=["text", "label"]).status_code == 400
    assert _launch(client, dataset_id, feature_columns=["label"]).status_code == 400


def test_transformer_launch_queues(client: TestClient, db_session: Session) -> None:
    _auth(client, _user(db_session, "a@b.com"))
    dataset_id = _dataset(client, _project(client))

    resp = _launch(client, dataset_id, name="DistilBERT run")
    assert resp.status_code == 201
    data = resp.json()
    assert data["family"] == "transformer"
    assert data["algorithm"] == "distilbert"
    assert data["status"] == "queued"
