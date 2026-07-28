"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Signed-cookie session used only to hold the OAuth state/nonce between the
    # login redirect and the provider callback (no server-side store).
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.SECRET_KEY,
        same_site=settings.COOKIE_SAMESITE,
        https_only=settings.COOKIE_SECURE,
    )

    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @app.get("/", tags=["root"])
    def root() -> dict[str, str]:
        return {
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "docs": "/docs",
            "health": f"{settings.API_V1_PREFIX}/health",
        }

    return app


app = create_app()
