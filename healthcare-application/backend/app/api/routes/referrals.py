"""Referral lifecycle routes."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.enums import AuditAction, ReferralStatus, UserRole
from app.models.referral import Referral, ReferralEvent
from app.models.user import User
from app.schemas import (
    ReferralCreate,
    ReferralEventResponse,
    ReferralResponse,
    ReferralStatusUpdate,
)

router = APIRouter()

# Valid referral state transitions
VALID_TRANSITIONS: dict[ReferralStatus, list[ReferralStatus]] = {
    ReferralStatus.CREATED: [ReferralStatus.ISSUED, ReferralStatus.CANCELLED],
    ReferralStatus.ISSUED: [ReferralStatus.ACCEPTED, ReferralStatus.CANCELLED],
    ReferralStatus.ACCEPTED: [ReferralStatus.IN_TRANSIT, ReferralStatus.CANCELLED],
    ReferralStatus.IN_TRANSIT: [ReferralStatus.ARRIVED, ReferralStatus.FAILED],
    ReferralStatus.ARRIVED: [ReferralStatus.RECEIVED],
    ReferralStatus.RECEIVED: [ReferralStatus.COMPLETED, ReferralStatus.FAILED],
}


def _generate_referral_token() -> str:
    """Generate a human-readable referral token."""
    return f"REF-{uuid.uuid4().hex[:8].upper()}"


@router.post("", response_model=ReferralResponse, status_code=status.HTTP_201_CREATED)
async def create_referral(
    body: ReferralCreate,
    request: Request,
    current_user: User = Depends(
        require_roles(
            UserRole.ASHA, UserRole.ANM, UserRole.MEDICAL_OFFICER, UserRole.SYSTEM_ADMIN,
        )
    ),
    db: Session = Depends(get_db),
):
    """Create a new referral."""
    # Determine referring facility
    facility_ids = [f.id for f in current_user.facilities]
    if not facility_ids:
        raise HTTPException(status_code=400, detail="User is not assigned to any facility")

    referral = Referral(
        referral_token=_generate_referral_token(),
        patient_id=body.patient_id,
        referring_facility_id=facility_ids[0],
        receiving_facility_id=body.receiving_facility_id,
        referred_by_id=current_user.id,
        priority=body.priority,
        reason=body.reason,
        clinical_summary=body.clinical_summary,
        diagnosis=body.diagnosis,
        status=ReferralStatus.CREATED,
    )
    db.add(referral)
    db.flush()

    # Initial event
    event = ReferralEvent(
        referral_id=referral.id,
        from_status=None,
        to_status=ReferralStatus.CREATED,
        actor_id=current_user.id,
        notes="Referral created",
    )
    db.add(event)

    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.REFERRAL_CREATE,
        resource_type="referral",
        resource_id=str(referral.id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(referral)

    return ReferralResponse.model_validate(referral)


@router.get("", response_model=list[ReferralResponse])
async def list_referrals(
    status_filter: ReferralStatus | None = Query(None, alias="status"),
    patient_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List referrals visible to the current user."""
    query = db.query(Referral)

    if status_filter:
        query = query.filter(Referral.status == status_filter)
    if patient_id:
        query = query.filter(Referral.patient_id == patient_id)

    # Role-based filtering
    if current_user.role in (UserRole.ASHA, UserRole.ANM, UserRole.MEDICAL_OFFICER):
        facility_ids = [f.id for f in current_user.facilities]
        if facility_ids:
            query = query.filter(
                (Referral.referring_facility_id.in_(facility_ids))
                | (Referral.receiving_facility_id.in_(facility_ids))
            )
    elif current_user.role == UserRole.REFERRAL_FACILITY:
        facility_ids = [f.id for f in current_user.facilities]
        if facility_ids:
            query = query.filter(Referral.receiving_facility_id.in_(facility_ids))
    elif current_user.role == UserRole.PATIENT:
        from app.models.patient import Patient
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient:
            query = query.filter(Referral.patient_id == patient.id)
        else:
            return []

    offset = (page - 1) * page_size
    referrals = query.order_by(Referral.created_at.desc()).offset(offset).limit(page_size).all()
    return [ReferralResponse.model_validate(r) for r in referrals]


@router.get("/{referral_id}", response_model=ReferralResponse)
async def get_referral(
    referral_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get referral details."""
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    return ReferralResponse.model_validate(referral)


@router.put("/{referral_id}/status", response_model=ReferralResponse)
async def update_referral_status(
    referral_id: uuid.UUID,
    body: ReferralStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update referral status with lifecycle validation."""
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    # Validate state transition
    allowed = VALID_TRANSITIONS.get(referral.status, [])
    if body.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from {referral.status.value} to {body.status.value}. "
                   f"Allowed: {[s.value for s in allowed]}",
        )

    old_status = referral.status
    referral.status = body.status

    if body.status == ReferralStatus.COMPLETED:
        referral.completed_at = datetime.now(UTC)

    event = ReferralEvent(
        referral_id=referral.id,
        from_status=old_status,
        to_status=body.status,
        actor_id=current_user.id,
        notes=body.notes,
    )
    db.add(event)

    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.REFERRAL_UPDATE,
        resource_type="referral",
        resource_id=str(referral.id),
        ip_address=request.client.host if request.client else None,
        metadata_json={"from": old_status.value, "to": body.status.value},
    )
    db.add(audit)
    db.commit()
    db.refresh(referral)

    return ReferralResponse.model_validate(referral)


@router.get("/{referral_id}/events", response_model=list[ReferralEventResponse])
async def get_referral_events(
    referral_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the audit trail of a referral's lifecycle events."""
    events = (
        db.query(ReferralEvent)
        .filter(ReferralEvent.referral_id == referral_id)
        .order_by(ReferralEvent.created_at)
        .all()
    )
    return [ReferralEventResponse.model_validate(e) for e in events]
