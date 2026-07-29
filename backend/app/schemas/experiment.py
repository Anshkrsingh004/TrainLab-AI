"""Experiment (training run) schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ExperimentCreate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    task_type: str  # classification | regression
    algorithm: str
    target_column: str
    feature_columns: list[str] | None = None
    test_size: float = Field(default=0.2, ge=0.05, le=0.5)
    hyperparameters: dict[str, Any] = Field(default_factory=dict)


class ExperimentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    task_type: str
    algorithm: str
    target_column: str
    status: str
    progress: int
    project_id: uuid.UUID
    project_name: str | None = None
    dataset_id: uuid.UUID
    dataset_name: str | None = None
    primary_metric_name: str | None = None
    primary_metric: float | None = None
    created_at: datetime


class ExperimentDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    task_type: str
    algorithm: str
    target_column: str
    feature_columns: list[str]
    hyperparameters: dict[str, Any]
    test_size: float
    status: str
    progress: int
    stage: str | None
    metrics: dict[str, Any] | None
    error_message: str | None
    project_id: uuid.UUID
    dataset_id: uuid.UUID
    started_at: datetime | None
    finished_at: datetime | None
    duration_ms: int | None
    created_at: datetime
