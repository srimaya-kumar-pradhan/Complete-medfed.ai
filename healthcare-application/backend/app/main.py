"""DORI FastAPI application entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import Base, engine
from app.api.router import api_router

logger = logging.getLogger("dori.api")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: initialize database, run safe synthetic seed, and pre-warm ML service."""
    logger.info("Initializing DORI Healthcare & MedFed.ai platform...")

    # 1. Initialize Database Tables if not exist
    try:
        import app.models  # noqa: F401 - ensure all ORM models are registered
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema verified / created successfully.")

        # 2. Seed synthetic demonstration data if fresh database
        try:
            from app.seed.seed_data import seed
            seed(force=False)
            logger.info("Synthetic demonstration records verified.")
        except Exception as seed_err:
            logger.warning("Synthetic seeding notice: %s", seed_err)
    except Exception as db_err:
        logger.error("Database initialization notice: %s", db_err)

    # 3. Pre-warm ML Inference Service (load DenseNet121 model weights once)
    try:
        from app.services.ml_inference_service import get_inference_service
        ml_service = get_inference_service()
        if ml_service.is_initialized and ml_service.is_available:
            logger.info("MedFed DenseNet121 model pre-warmed successfully on %s.", ml_service.device)
        else:
            logger.warning("ML inference service pre-warm notice: %s", ml_service.error_message)
    except Exception as ml_err:
        logger.warning("ML service pre-warm notice: %s", ml_err)

    yield

    logger.info("DORI Healthcare & MedFed.ai platform shutting down.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="DORI & MedFed.ai API",
        description=(
            "Integrated Healthcare Continuity & Privacy-Preserving Federated Medical Imaging System. "
            "All ML predictions are clinical decision support outputs requiring qualified physician review."
        ),
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Robust CORS for Cloudflare Pages, Hugging Face Spaces, and Local Dev
    origins = settings.cors_origin_list
    allow_origin_regex = r"^https:\/\/.*\.pages\.dev$|^https:\/\/.*\.hf\.space$"

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins if "*" not in origins else ["*"],
        allow_origin_regex=allow_origin_regex if "*" not in origins else None,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        max_age=600,
    )

    if settings.environment == "production":
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

    # Include API routes
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health")
    async def health_check():
        db_ok = False
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                db_ok = True
        except Exception:
            db_ok = False

        ml_ok = False
        try:
            from app.services.ml_inference_service import get_inference_service
            ml_ok = get_inference_service().is_available
        except Exception:
            ml_ok = False

        return {
            "status": "healthy" if db_ok else "degraded",
            "service": "dori-medfed-unified-api",
            "version": settings.app_version,
            "database_connected": db_ok,
            "ml_model_loaded": ml_ok,
        }

    @app.get("/ready")
    async def readiness_check():
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return {"status": "ready"}
        except Exception as e:
            return {"status": "not_ready", "error": str(e)}

    return app


app = create_app()
