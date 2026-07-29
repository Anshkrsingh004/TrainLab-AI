"""Project CRUD endpoints.

All routes require authentication and operate only on the current user's
projects. A project owned by another user is indistinguishable from a
non-existent one (404), so ownership is never leaked.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["projects"])

_NAME_CONFLICT = HTTPException(
    status_code=status.HTTP_409_CONFLICT,
    detail="You already have a project with this name",
)
_NOT_FOUND = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


@router.get("", response_model=list[ProjectRead])
def list_projects(
    include_archived: bool = Query(False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProjectRead]:
    return project_service.list_projects(db, user, include_archived)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectRead:
    try:
        return project_service.create_project(db, user, payload)
    except IntegrityError:
        db.rollback()
        raise _NAME_CONFLICT from None


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectRead:
    project = project_service.get_project(db, user, project_id)
    if project is None:
        raise _NOT_FOUND
    return project


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectRead:
    project = project_service.get_project(db, user, project_id)
    if project is None:
        raise _NOT_FOUND
    try:
        return project_service.update_project(db, project, payload)
    except IntegrityError:
        db.rollback()
        raise _NAME_CONFLICT from None


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    project = project_service.get_project(db, user, project_id)
    if project is None:
        raise _NOT_FOUND
    project_service.delete_project(db, project)
