"""Dataset schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class DatasetListItem(BaseModel):
    """Lightweight row for dataset lists (no heavy schema/stats payload)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    original_filename: str
    file_type: str
    size_bytes: int
    row_count: int
    column_count: int
    project_id: uuid.UUID
    project_name: str | None = None
    created_at: datetime


class DatasetDetail(BaseModel):
    """Full dataset metadata: schema + statistics for the inspector."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    original_filename: str
    file_type: str
    size_bytes: int
    row_count: int
    column_count: int
    project_id: uuid.UUID
    created_at: datetime
    # Read from the ORM's schema_json / statistics_json, exposed under clean
    # API names (avoids shadowing pydantic BaseModel attributes).
    columns: list[Any] = Field(
        validation_alias="schema_json", serialization_alias="columns"
    )
    statistics: dict[str, Any] = Field(
        validation_alias="statistics_json", serialization_alias="statistics"
    )


class DatasetPreview(BaseModel):
    columns: list[str]
    rows: list[list[Any]]
    total_rows: int
    preview_rows: int
