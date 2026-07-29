"""Dataset endpoints: upload, list, inspect, preview, delete.

All routes require authentication and are scoped to the current user through the
parent project. Datasets are addressable both under a project (upload/list) and
directly by id (inspect/preview/delete).
"""

import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.dataset import DatasetDetail, DatasetListItem, DatasetPreview
from app.services import dataset_service, project_service
from app.services.dataset_service import DatasetError

router = APIRouter(tags=["datasets"])

_NOT_FOUND = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")


@router.post(
    "/projects/{project_id}/datasets",
    response_model=DatasetDetail,
    status_code=status.HTTP_201_CREATED,
)
async def upload_dataset(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    name: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DatasetDetail:
    project = project_service.get_project(db, user, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    content = await file.read()
    try:
        return dataset_service.process_upload(db, project, file.filename or "upload", content, name)
    except DatasetError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from None


@router.get("/datasets", response_model=list[DatasetListItem])
def list_datasets(
    project_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[DatasetListItem]:
    return dataset_service.list_datasets(db, user, project_id)


@router.get("/datasets/{dataset_id}", response_model=DatasetDetail)
def get_dataset(
    dataset_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DatasetDetail:
    dataset = dataset_service.get_dataset(db, user, dataset_id)
    if dataset is None:
        raise _NOT_FOUND
    return dataset


@router.get("/datasets/{dataset_id}/preview", response_model=DatasetPreview)
def preview_dataset(
    dataset_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DatasetPreview:
    dataset = dataset_service.get_dataset(db, user, dataset_id)
    if dataset is None:
        raise _NOT_FOUND
    return dataset_service.build_preview(dataset, limit, offset)


@router.delete("/datasets/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    dataset_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    dataset = dataset_service.get_dataset(db, user, dataset_id)
    if dataset is None:
        raise _NOT_FOUND
    dataset_service.delete_dataset(db, dataset)
