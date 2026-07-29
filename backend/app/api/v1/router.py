"""Aggregates all v1 API routers.

New endpoint modules are wired in here as milestones add them, keeping a single
place that defines the shape of the v1 API surface.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, datasets, experiments, health, projects

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(datasets.router)
api_router.include_router(experiments.router)
