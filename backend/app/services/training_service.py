"""Training orchestration.

``execute_training`` is the pure, testable core (takes a session, runs the
pipeline through stages, updates the experiment). ``launch`` wraps it in a
background thread with its own session and a cancel Event. Release 2 replaces
the thread with a Celery task — the core logic is unchanged.
"""

from __future__ import annotations

import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import storage
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.dataset import Dataset
from app.models.experiment import Experiment
from app.models.project import Project
from app.models.user import User
from app.schemas.experiment import ExperimentCreate, ExperimentListItem
from app.services import ml

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="train")
_cancel_events: dict[str, threading.Event] = {}

VALID_TASKS = {"classification", "regression"}


class TrainingError(ValueError):
    """Raised for invalid training configuration."""


# ── creation ──────────────────────────────────────────────────────


def create_experiment(
    db: Session, project: Project, dataset: Dataset, data: ExperimentCreate
) -> Experiment:
    if data.task_type not in VALID_TASKS:
        raise TrainingError("Task type must be 'classification' or 'regression'.")
    if data.algorithm not in ml.algorithm_keys(data.task_type):
        raise TrainingError("That algorithm is not available for this task type.")

    all_columns = [c["name"] for c in dataset.schema_json]
    if data.target_column not in all_columns:
        raise TrainingError("Target column not found in the dataset.")

    features = data.feature_columns or [c for c in all_columns if c != data.target_column]
    features = [f for f in features if f != data.target_column]
    unknown = [f for f in features if f not in all_columns]
    if unknown:
        raise TrainingError(f"Unknown feature column: {unknown[0]}")
    if not features:
        raise TrainingError("Select at least one feature column.")

    experiment = Experiment(
        project_id=project.id,
        dataset_id=dataset.id,
        name=(data.name or "").strip() or f"{data.algorithm} on {dataset.name}",
        task_type=data.task_type,
        algorithm=data.algorithm,
        target_column=data.target_column,
        feature_columns=features,
        hyperparameters=data.hyperparameters or {},
        test_size=data.test_size,
        status="queued",
        progress=0,
    )
    db.add(experiment)
    db.commit()
    db.refresh(experiment)

    if settings.TRAINING_AUTOLAUNCH:
        _executor.submit(launch, experiment.id)

    return experiment


# ── execution (testable core) ─────────────────────────────────────


def execute_training(
    db: Session, exp: Experiment, cancel_event: threading.Event | None = None
) -> None:
    start = time.time()

    def cancelled() -> bool:
        return cancel_event is not None and cancel_event.is_set()

    def stage(name: str, progress: int) -> None:
        exp.stage = name
        exp.progress = progress
        db.commit()

    try:
        exp.status = "running"
        exp.started_at = datetime.now(UTC)
        stage("Loading data", 5)
        if cancelled():
            return _mark_cancelled(db, exp)

        dataset = db.get(Dataset, exp.dataset_id)
        path = storage.full_path(dataset.file_path)
        df = pd.read_csv(path) if dataset.file_type == "csv" else pd.read_json(path)

        stage("Preprocessing", 25)
        if cancelled():
            return _mark_cancelled(db, exp)

        df = df.dropna(subset=[exp.target_column])
        if df.empty:
            raise TrainingError("No rows remain after removing missing target values.")

        X = df[exp.feature_columns]
        y_raw = df[exp.target_column]

        schema_types = {c["name"]: c["dtype"] for c in dataset.schema_json}
        numeric = [f for f in exp.feature_columns if schema_types.get(f) in ("integer", "float")]
        categorical = [f for f in exp.feature_columns if f not in numeric]
        preprocessor = ml.build_preprocessor(numeric, categorical)

        label_encoder: LabelEncoder | None = None
        if exp.task_type == "classification":
            label_encoder = LabelEncoder()
            y = label_encoder.fit_transform(y_raw.astype(str))
            if len(label_encoder.classes_) < 2:
                raise TrainingError("The target needs at least two classes.")
        else:
            y_num = pd.to_numeric(y_raw, errors="coerce")
            mask = ~y_num.isna()
            X = X[mask.to_numpy()]
            y = y_num[mask].to_numpy(dtype=float)
            if len(y) < 5:
                raise TrainingError("The target is not numeric enough for regression.")

        stratify = y if (exp.task_type == "classification" and _can_stratify(y)) else None
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=exp.test_size, random_state=42, stratify=stratify
        )

        estimator = ml.build_estimator(exp.task_type, exp.algorithm, exp.hyperparameters)
        pipeline = Pipeline([("pre", preprocessor), ("est", estimator)])

        stage("Training", 55)
        if cancelled():
            return _mark_cancelled(db, exp)
        pipeline.fit(X_train, y_train)

        stage("Evaluating", 85)
        if cancelled():
            return _mark_cancelled(db, exp)
        y_pred = pipeline.predict(X_test)

        if exp.task_type == "classification":
            labels = list(range(len(label_encoder.classes_)))
            metrics = ml.classification_metrics(y_test, y_pred, labels)
            metrics["labels"] = [str(c) for c in label_encoder.classes_]
        else:
            metrics = ml.regression_metrics(y_test, y_pred)

        importances = ml.feature_importances(pipeline)
        if importances:
            metrics["feature_importances"] = importances
        metrics["n_train"] = int(len(X_train))
        metrics["n_test"] = int(len(X_test))

        stage("Saving model", 95)
        model_file = storage.experiment_model_path(exp.id)
        joblib.dump(
            {
                "pipeline": pipeline,
                "label_encoder": label_encoder,
                "task_type": exp.task_type,
                "features": exp.feature_columns,
                "target": exp.target_column,
            },
            model_file,
        )
        exp.model_path = storage.experiment_model_relpath(exp.id)

        exp.metrics = metrics
        exp.status = "completed"
        exp.progress = 100
        exp.stage = "Done"
        exp.finished_at = datetime.now(UTC)
        exp.duration_ms = int((time.time() - start) * 1000)
        db.commit()
    except TrainingError as exc:
        _mark_failed(db, exp, str(exc), start)
    except Exception as exc:  # noqa: BLE001 — surface any training failure
        _mark_failed(db, exp, f"Training failed: {type(exc).__name__}", start)


def _mark_cancelled(db: Session, exp: Experiment) -> None:
    exp.status = "cancelled"
    exp.stage = "Cancelled"
    exp.finished_at = datetime.now(UTC)
    db.commit()


def _mark_failed(db: Session, exp: Experiment, message: str, start: float) -> None:
    exp.status = "failed"
    exp.error_message = message[:1000]
    exp.finished_at = datetime.now(UTC)
    exp.duration_ms = int((time.time() - start) * 1000)
    db.commit()


def _can_stratify(y: np.ndarray) -> bool:
    _, counts = np.unique(y, return_counts=True)
    return len(counts) >= 2 and counts.min() >= 2


# ── threaded launch + cancellation ────────────────────────────────


def launch(experiment_id: uuid.UUID) -> None:
    event = threading.Event()
    _cancel_events[str(experiment_id)] = event
    db = SessionLocal()
    try:
        exp = db.get(Experiment, experiment_id)
        if exp is not None:
            execute_training(db, exp, event)
    finally:
        db.close()
        _cancel_events.pop(str(experiment_id), None)


def request_cancel(experiment_id: uuid.UUID) -> None:
    event = _cancel_events.get(str(experiment_id))
    if event is not None:
        event.set()


# ── queries ───────────────────────────────────────────────────────


def list_experiments(
    db: Session,
    owner: User,
    project_id: uuid.UUID | None = None,
    dataset_id: uuid.UUID | None = None,
) -> list[ExperimentListItem]:
    stmt = (
        select(Experiment, Project.name, Dataset.name)
        .join(Project, Experiment.project_id == Project.id)
        .join(Dataset, Experiment.dataset_id == Dataset.id)
        .where(Project.owner_id == owner.id)
    )
    if project_id is not None:
        stmt = stmt.where(Experiment.project_id == project_id)
    if dataset_id is not None:
        stmt = stmt.where(Experiment.dataset_id == dataset_id)
    stmt = stmt.order_by(Experiment.created_at.desc())

    items: list[ExperimentListItem] = []
    for exp, project_name, dataset_name in db.execute(stmt).all():
        item = ExperimentListItem.model_validate(exp)
        item.project_name = project_name
        item.dataset_name = dataset_name
        name, value = _primary_metric(exp)
        item.primary_metric_name = name
        item.primary_metric = value
        items.append(item)
    return items


def _primary_metric(exp: Experiment) -> tuple[str | None, float | None]:
    if exp.status != "completed" or not exp.metrics:
        return None, None
    if exp.task_type == "classification":
        return "accuracy", exp.metrics.get("accuracy")
    return "r2", exp.metrics.get("r2")


def get_experiment(db: Session, owner: User, experiment_id: uuid.UUID) -> Experiment | None:
    stmt = (
        select(Experiment)
        .join(Project, Experiment.project_id == Project.id)
        .where(Experiment.id == experiment_id, Project.owner_id == owner.id)
    )
    return db.execute(stmt).scalar_one_or_none()


def delete_experiment(db: Session, exp: Experiment) -> None:
    storage.delete_experiment_dir(exp.id)
    db.delete(exp)
    db.commit()
