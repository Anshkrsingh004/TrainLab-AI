"""Project business logic.

Every function is owner-scoped: callers pass the authenticated user, and reads
never cross user boundaries. Endpoints stay thin and never build queries.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate


def list_projects(db: Session, owner: User, include_archived: bool = False) -> list[Project]:
    stmt = select(Project).where(Project.owner_id == owner.id)
    if not include_archived:
        stmt = stmt.where(Project.is_archived.is_(False))
    stmt = stmt.order_by(Project.updated_at.desc())
    return list(db.execute(stmt).scalars().all())


def get_project(db: Session, owner: User, project_id: uuid.UUID) -> Project | None:
    stmt = select(Project).where(Project.id == project_id, Project.owner_id == owner.id)
    return db.execute(stmt).scalar_one_or_none()


def create_project(db: Session, owner: User, data: ProjectCreate) -> Project:
    project = Project(
        name=data.name,
        description=data.description,
        owner_id=owner.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_project(db: Session, project: Project, data: ProjectUpdate) -> Project:
    changes = data.model_dump(exclude_unset=True)
    # Guard against clearing the required name via an explicit null.
    if changes.get("name") is None:
        changes.pop("name", None)
    for field, value in changes.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project: Project) -> None:
    db.delete(project)
    db.commit()
