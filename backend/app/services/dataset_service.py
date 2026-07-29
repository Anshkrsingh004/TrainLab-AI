"""Dataset processing and access.

Uploads are processed synchronously (Release 1): parse the file with pandas,
detect a schema, compute per-column statistics and distributions, and capture a
preview — all stored on the record so the inspector reads from the DB. Owner
scoping is enforced through the parent project.
"""

from __future__ import annotations

import io
import math
import uuid
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import storage
from app.core.config import settings
from app.models.dataset import Dataset
from app.models.project import Project
from app.models.user import User
from app.schemas.dataset import DatasetListItem, DatasetPreview

ALLOWED_EXTENSIONS = {"csv", "json"}
PREVIEW_ROWS = 100
MAX_CATEGORIES = 10
HIST_BINS = 20


class DatasetError(ValueError):
    """Raised for invalid uploads (bad type, too large, unparseable)."""


# ── analysis helpers ──────────────────────────────────────────────


def _friendly_dtype(series: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_integer_dtype(series):
        return "integer"
    if pd.api.types.is_float_dtype(series):
        return "float"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    return "string"


def _num(value: Any) -> float | None:
    v = float(value)
    return None if math.isnan(v) else round(v, 4)


def _cell(value: Any) -> Any:
    """Convert a single dataframe cell to a JSON-safe Python value."""
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        f = float(value)
        return None if math.isnan(f) else f
    if isinstance(value, np.bool_):
        return bool(value)
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, str | int | bool):
        return value
    if isinstance(value, float):
        return None if math.isnan(value) else value
    return str(value)


def _fmt(x: float) -> str:
    x = float(x)
    if math.isnan(x):
        return "0"
    return f"{x:.2f}".rstrip("0").rstrip(".")


def _histogram(series: pd.Series) -> list[dict[str, Any]]:
    values = series.astype(float)
    bins = min(HIST_BINS, max(1, int(series.nunique())))
    counts, edges = np.histogram(values, bins=bins)
    return [
        {"label": f"{_fmt(edges[i])}–{_fmt(edges[i + 1])}", "count": int(counts[i])}
        for i in range(len(counts))
    ]


def _analyze(df: pd.DataFrame) -> tuple[list, dict, dict]:
    n_rows, n_cols = int(df.shape[0]), int(df.shape[1])
    schema: list[dict[str, Any]] = []
    columns_stats: dict[str, Any] = {}
    total_missing = 0

    for col in df.columns:
        s = df[col]
        dtype = _friendly_dtype(s)
        missing = int(s.isna().sum())
        total_missing += missing
        schema.append(
            {
                "name": str(col),
                "dtype": dtype,
                "null_count": missing,
                "null_pct": round(missing / n_rows * 100, 2) if n_rows else 0.0,
            }
        )

        stat: dict[str, Any] = {
            "dtype": dtype,
            "count": int(s.notna().sum()),
            "missing": missing,
        }

        if dtype in ("integer", "float"):
            clean = s.dropna()
            if len(clean):
                stat.update(
                    {
                        "mean": _num(clean.mean()),
                        "std": _num(clean.std()),
                        "min": _num(clean.min()),
                        "p25": _num(clean.quantile(0.25)),
                        "median": _num(clean.quantile(0.5)),
                        "p75": _num(clean.quantile(0.75)),
                        "max": _num(clean.max()),
                        "distribution": _histogram(clean),
                    }
                )
        else:
            vc = s.astype("string").dropna().value_counts()
            stat["unique"] = int(s.nunique(dropna=True))
            stat["top"] = str(vc.index[0]) if len(vc) else None
            stat["distribution"] = [
                {"label": str(k), "count": int(v)} for k, v in vc.head(MAX_CATEGORIES).items()
            ]

        columns_stats[str(col)] = stat

    type_breakdown: dict[str, int] = {}
    for c in schema:
        type_breakdown[c["dtype"]] = type_breakdown.get(c["dtype"], 0) + 1

    statistics = {
        "rows": n_rows,
        "columns": n_cols,
        "missing_cells": total_missing,
        "missing_pct": (
            round(total_missing / (n_rows * n_cols) * 100, 2) if n_rows and n_cols else 0.0
        ),
        "column_types": [{"type": k, "count": v} for k, v in type_breakdown.items()],
        "column_stats": columns_stats,
    }

    head = df.head(PREVIEW_ROWS)
    preview = {
        "columns": [str(c) for c in head.columns],
        "rows": [[_cell(v) for v in row] for row in head.itertuples(index=False)],
    }
    return schema, statistics, preview


# ── operations ────────────────────────────────────────────────────


def process_upload(
    db: Session,
    project: Project,
    filename: str,
    content: bytes,
    name: str | None = None,
) -> Dataset:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise DatasetError("Only .csv and .json files are supported.")
    if not content:
        raise DatasetError("The file is empty.")
    if len(content) > settings.max_upload_bytes:
        raise DatasetError(f"File exceeds the {settings.MAX_UPLOAD_MB} MB limit.")

    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_json(io.BytesIO(content))
    except Exception as exc:  # noqa: BLE001 — surface any parse failure cleanly
        raise DatasetError(f"Could not parse the {ext.upper()} file.") from exc

    if df.shape[0] == 0 or df.shape[1] == 0:
        raise DatasetError("The file has no rows or no columns.")

    schema, statistics, preview = _analyze(df)

    dataset_id = uuid.uuid4()
    rel_path = storage.save_dataset_file(dataset_id, filename, content)
    dataset = Dataset(
        id=dataset_id,
        project_id=project.id,
        name=(name or "").strip() or filename.rsplit(".", 1)[0],
        original_filename=filename,
        file_path=rel_path,
        file_type=ext,
        size_bytes=len(content),
        row_count=int(df.shape[0]),
        column_count=int(df.shape[1]),
        schema_json=schema,
        statistics_json=statistics,
        preview_json=preview,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


def list_datasets(
    db: Session, owner: User, project_id: uuid.UUID | None = None
) -> list[DatasetListItem]:
    stmt = (
        select(Dataset, Project.name)
        .join(Project, Dataset.project_id == Project.id)
        .where(Project.owner_id == owner.id)
    )
    if project_id is not None:
        stmt = stmt.where(Dataset.project_id == project_id)
    stmt = stmt.order_by(Dataset.created_at.desc())

    items: list[DatasetListItem] = []
    for dataset, project_name in db.execute(stmt).all():
        item = DatasetListItem.model_validate(dataset)
        item.project_name = project_name
        items.append(item)
    return items


def get_dataset(db: Session, owner: User, dataset_id: uuid.UUID) -> Dataset | None:
    stmt = (
        select(Dataset)
        .join(Project, Dataset.project_id == Project.id)
        .where(Dataset.id == dataset_id, Project.owner_id == owner.id)
    )
    return db.execute(stmt).scalar_one_or_none()


def build_preview(dataset: Dataset, limit: int, offset: int) -> DatasetPreview:
    preview = dataset.preview_json or {"columns": [], "rows": []}
    rows = preview.get("rows", [])
    return DatasetPreview(
        columns=preview.get("columns", []),
        rows=rows[offset : offset + limit],
        total_rows=dataset.row_count,
        preview_rows=len(rows),
    )


def delete_dataset(db: Session, dataset: Dataset) -> None:
    storage.delete_dataset_dir(dataset.id)
    db.delete(dataset)
    db.commit()
