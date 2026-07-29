"""Dataset model.

A dataset belongs to a project and holds an uploaded tabular file (CSV/JSON)
plus the schema, statistics, and a capped preview computed at upload time, so
the inspector loads quickly without re-reading the file.
"""

import uuid

from sqlalchemy import JSON, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class Dataset(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "datasets"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_type: Mapped[str] = mapped_column(String(16), nullable=False)  # csv | json
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    row_count: Mapped[int] = mapped_column(Integer, nullable=False)
    column_count: Mapped[int] = mapped_column(Integer, nullable=False)

    # Computed at upload: column descriptors, per-column statistics +
    # distributions, and the first N rows for preview.
    schema_json: Mapped[list] = mapped_column(JSON, nullable=False)
    statistics_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    preview_json: Mapped[dict] = mapped_column(JSON, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Dataset {self.name!r} project={self.project_id}>"
