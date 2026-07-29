"""Experiment (training run) endpoints: launch, list, poll, cancel, delete.

All routes are owner-scoped through the parent project. Training is launched in
a background thread; clients poll GET /experiments/{id} for live progress.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.experiment import (
    ExperimentCreate,
    ExperimentDetail,
    ExperimentListItem,
)
from app.services import dataset_service, ml, project_service, training_service
from app.services.training_service import TrainingError

router = APIRouter(tags=["experiments"])

_NOT_FOUND = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")


@router.post(
    "/datasets/{dataset_id}/experiments",
    response_model=ExperimentDetail,
    status_code=status.HTTP_201_CREATED,
)
def launch_experiment(
    dataset_id: uuid.UUID,
    payload: ExperimentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExperimentDetail:
    dataset = dataset_service.get_dataset(db, user, dataset_id)
    if dataset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dataset not found")
    project = project_service.get_project(db, user, dataset.project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    try:
        return training_service.create_experiment(db, project, dataset, payload)
    except TrainingError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from None


@router.get("/experiments", response_model=list[ExperimentListItem])
def list_experiments(
    project_id: uuid.UUID | None = Query(None),
    dataset_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ExperimentListItem]:
    return training_service.list_experiments(db, user, project_id, dataset_id)


@router.get("/experiments/algorithms")
def list_algorithms() -> dict:
    """Available algorithms and their hyperparameters, per task type."""
    return ml.ALGO_SPECS


@router.get("/experiments/transformer-models")
def list_transformer_models() -> list[dict]:
    """Fine-tunable transformer models (static; no torch import)."""
    from app.services import transformer_service

    return [{"key": k, "label": v["label"]} for k, v in transformer_service.MODELS.items()]


@router.get("/experiments/hardware")
def hardware(user: User = Depends(get_current_user)) -> dict:
    """Detected training device (GPU/CPU). Lazily loads torch."""
    from app.services import transformer_service

    return transformer_service.hardware_info()


@router.get("/experiments/{experiment_id}", response_model=ExperimentDetail)
def get_experiment(
    experiment_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExperimentDetail:
    exp = training_service.get_experiment(db, user, experiment_id)
    if exp is None:
        raise _NOT_FOUND
    return exp


@router.post("/experiments/{experiment_id}/cancel", response_model=ExperimentDetail)
def cancel_experiment(
    experiment_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExperimentDetail:
    exp = training_service.get_experiment(db, user, experiment_id)
    if exp is None:
        raise _NOT_FOUND
    if exp.status in ("queued", "running"):
        training_service.request_cancel(exp.id)
    return exp


@router.delete("/experiments/{experiment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experiment(
    experiment_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    exp = training_service.get_experiment(db, user, experiment_id)
    if exp is None:
        raise _NOT_FOUND
    if exp.status == "running":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Cancel the run before deleting it.",
        )
    training_service.delete_experiment(db, exp)
