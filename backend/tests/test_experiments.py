"""Tests for training runs: end-to-end training, cancellation, validation, isolation."""

import threading
import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.experiment import Experiment
from app.models.user import User
from app.services import training_service


def _csv() -> bytes:
    lines = ["x1,x2,category,label"]
    for i in range(40):
        cat = "A" if i % 2 == 0 else "B"
        label = i % 2  # perfectly correlated with category -> easy to learn
        lines.append(f"{i},{(i * 3) % 11},{cat},{label}")
    return ("\n".join(lines) + "\n").encode()


def _user(db: Session, email: str) -> User:
    user = User(email=email, full_name=email.split("@")[0], provider="google")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(client: TestClient, user: User) -> None:
    client.cookies.set("trainlab_session", create_access_token(str(user.id)))


def _project(client: TestClient) -> str:
    return client.post("/api/v1/projects", json={"name": "ML project"}).json()["id"]


def _dataset(client: TestClient, project_id: str) -> str:
    return client.post(
        f"/api/v1/projects/{project_id}/datasets",
        files={"file": ("train.csv", _csv(), "text/csv")},
    ).json()["id"]


def _run(db: Session, experiment_id: str, cancel: threading.Event | None = None) -> Experiment:
    exp = db.get(Experiment, uuid.UUID(experiment_id))
    training_service.execute_training(db, exp, cancel)
    db.refresh(exp)
    return exp


def test_algorithms_metadata(client: TestClient) -> None:
    resp = client.get("/api/v1/experiments/algorithms")
    assert resp.status_code == 200
    body = resp.json()
    assert {"classification", "regression"} <= set(body.keys())
    keys = {a["key"] for a in body["classification"]}
    assert {
        "logistic_regression",
        "random_forest",
        "xgboost",
        "svm",
        "knn",
        "decision_tree",
    } <= keys


def test_launch_requires_auth(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/datasets/00000000-0000-0000-0000-000000000000/experiments",
        json={"task_type": "classification", "algorithm": "knn", "target_column": "label"},
    )
    assert resp.status_code == 401


def test_train_classification_end_to_end(client: TestClient, db_session: Session) -> None:
    _auth(client, _user(db_session, "alice@example.com"))
    dataset_id = _dataset(client, _project(client))

    created = client.post(
        f"/api/v1/datasets/{dataset_id}/experiments",
        json={
            "task_type": "classification",
            "algorithm": "decision_tree",
            "target_column": "label",
        },
    )
    assert created.status_code == 201
    assert created.json()["status"] == "queued"

    exp = _run(db_session, created.json()["id"])
    assert exp.status == "completed"
    assert exp.progress == 100
    assert 0.0 <= exp.metrics["accuracy"] <= 1.0
    assert exp.model_path is not None

    detail = client.get(f"/api/v1/experiments/{exp.id}")
    assert detail.json()["status"] == "completed"


def test_train_regression_end_to_end(client: TestClient, db_session: Session) -> None:
    _auth(client, _user(db_session, "alice@example.com"))
    dataset_id = _dataset(client, _project(client))

    created = client.post(
        f"/api/v1/datasets/{dataset_id}/experiments",
        json={
            "task_type": "regression",
            "algorithm": "random_forest",
            "target_column": "x2",
            "feature_columns": ["x1", "category"],
        },
    )
    assert created.status_code == 201

    exp = _run(db_session, created.json()["id"])
    assert exp.status == "completed"
    assert "r2" in exp.metrics


def test_cancellation(client: TestClient, db_session: Session) -> None:
    _auth(client, _user(db_session, "alice@example.com"))
    dataset_id = _dataset(client, _project(client))
    created = client.post(
        f"/api/v1/datasets/{dataset_id}/experiments",
        json={"task_type": "classification", "algorithm": "knn", "target_column": "label"},
    )
    event = threading.Event()
    event.set()  # request cancel before it starts

    exp = _run(db_session, created.json()["id"], cancel=event)
    assert exp.status == "cancelled"


def test_validation_errors(client: TestClient, db_session: Session) -> None:
    _auth(client, _user(db_session, "alice@example.com"))
    dataset_id = _dataset(client, _project(client))

    bad_algo = client.post(
        f"/api/v1/datasets/{dataset_id}/experiments",
        json={"task_type": "classification", "algorithm": "not_real", "target_column": "label"},
    )
    assert bad_algo.status_code == 400

    bad_target = client.post(
        f"/api/v1/datasets/{dataset_id}/experiments",
        json={"task_type": "classification", "algorithm": "knn", "target_column": "nope"},
    )
    assert bad_target.status_code == 400

    # A regression algorithm is not valid for a classification task.
    wrong_task = client.post(
        f"/api/v1/datasets/{dataset_id}/experiments",
        json={
            "task_type": "classification",
            "algorithm": "linear_regression",
            "target_column": "label",
        },
    )
    assert wrong_task.status_code == 400


def test_experiments_isolated_per_user(client: TestClient, db_session: Session) -> None:
    alice = _user(db_session, "alice@example.com")
    bob = _user(db_session, "bob@example.com")

    _auth(client, alice)
    dataset_id = _dataset(client, _project(client))
    exp_id = client.post(
        f"/api/v1/datasets/{dataset_id}/experiments",
        json={"task_type": "classification", "algorithm": "knn", "target_column": "label"},
    ).json()["id"]

    _auth(client, bob)
    assert client.get("/api/v1/experiments").json() == []
    assert client.get(f"/api/v1/experiments/{exp_id}").status_code == 404
    assert client.post(f"/api/v1/experiments/{exp_id}/cancel").status_code == 404
    assert client.delete(f"/api/v1/experiments/{exp_id}").status_code == 404
    # Bob cannot launch on Alice's dataset either.
    assert (
        client.post(
            f"/api/v1/datasets/{dataset_id}/experiments",
            json={"task_type": "classification", "algorithm": "knn", "target_column": "label"},
        ).status_code
        == 404
    )
