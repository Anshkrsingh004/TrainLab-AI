"""add family column to experiments

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-30
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "experiments",
        sa.Column(
            "family",
            sa.String(length=20),
            nullable=False,
            server_default="classical",
        ),
    )


def downgrade() -> None:
    op.drop_column("experiments", "family")
