"""Federated learning architecture routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.federated import FederatedNode, FederatedRound, ModelVersion
from app.models.user import User
from app.schemas import FederatedNodeResponse, FederatedRoundResponse, ModelVersionResponse

router = APIRouter()


@router.get("/nodes", response_model=list[FederatedNodeResponse])
async def list_federated_nodes(
    current_user: User = Depends(
        require_roles(UserRole.SYSTEM_ADMIN, UserRole.STATE_ADMIN, UserRole.DISTRICT_OFFICER)
    ),
    db: Session = Depends(get_db),
):
    """List registered federated learning nodes."""
    nodes = db.query(FederatedNode).all()
    return [FederatedNodeResponse.model_validate(n) for n in nodes]


@router.get("/rounds", response_model=list[FederatedRoundResponse])
async def list_federated_rounds(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(
        require_roles(UserRole.SYSTEM_ADMIN, UserRole.STATE_ADMIN)
    ),
    db: Session = Depends(get_db),
):
    """List federated training rounds. Simulation rounds are clearly labelled."""
    offset = (page - 1) * page_size
    rounds = (
        db.query(FederatedRound)
        .order_by(FederatedRound.round_number.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return [FederatedRoundResponse.model_validate(r) for r in rounds]


@router.get("/models", response_model=list[ModelVersionResponse])
async def list_model_versions(
    current_user: User = Depends(
        require_roles(UserRole.SYSTEM_ADMIN, UserRole.STATE_ADMIN, UserRole.DISTRICT_OFFICER)
    ),
    db: Session = Depends(get_db),
):
    """List model versions. Simulation models are clearly labelled."""
    models = db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).all()
    return [ModelVersionResponse.model_validate(m) for m in models]


@router.get("/models/{model_id}", response_model=ModelVersionResponse)
async def get_model_version(
    model_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    """Get model version details."""
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model version not found")
    return ModelVersionResponse.model_validate(model)
