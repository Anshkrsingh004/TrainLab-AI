"""File storage abstraction.

Release 1 stores uploaded files on the local filesystem under STORAGE_DIR.
Everything goes through this module so a later release can swap in object
storage (S3/GCS) without touching callers.
"""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from app.core.config import settings


def _base_dir() -> Path:
    # Read from settings on each call so tests can redirect storage.
    base = Path(settings.STORAGE_DIR)
    base.mkdir(parents=True, exist_ok=True)
    return base


def save_dataset_file(dataset_id: uuid.UUID, filename: str, content: bytes) -> str:
    """Persist bytes for a dataset and return a storage-relative path."""
    rel = Path("datasets") / str(dataset_id) / filename
    dest = _base_dir() / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content)
    return str(rel).replace("\\", "/")


def full_path(relative: str) -> Path:
    return _base_dir() / relative


def delete_dataset_dir(dataset_id: uuid.UUID) -> None:
    target = _base_dir() / "datasets" / str(dataset_id)
    if target.exists():
        shutil.rmtree(target, ignore_errors=True)


def experiment_model_path(experiment_id: uuid.UUID) -> Path:
    """Absolute path where an experiment's serialized model is stored."""
    d = _base_dir() / "experiments" / str(experiment_id)
    d.mkdir(parents=True, exist_ok=True)
    return d / "model.joblib"


def experiment_model_relpath(experiment_id: uuid.UUID) -> str:
    return f"experiments/{experiment_id}/model.joblib"


def delete_experiment_dir(experiment_id: uuid.UUID) -> None:
    target = _base_dir() / "experiments" / str(experiment_id)
    if target.exists():
        shutil.rmtree(target, ignore_errors=True)
