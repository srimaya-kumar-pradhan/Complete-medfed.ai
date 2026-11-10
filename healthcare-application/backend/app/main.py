"""DORI FastAPI application entry point."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import get_settings
from app.api.router import api_router

settings = get_settings()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="DORI API",
        description=(
            "Predictive Continuity of Care Infrastructure for Rural India. "
            "All ML outputs are decision support only — never autonomous medical decisions."
        ),
        version=settings.app_version,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["*"],
        max_age=600,
    )

    if settings.environment == "production":
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

    # Include API routes
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "service": "dori-api", "version": settings.app_version}

    @app.get("/ready")
    async def readiness_check():
        # In production, check DB connectivity here
        return {"status": "ready"}

    return app


app = create_app()
