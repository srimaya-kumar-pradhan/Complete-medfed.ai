"""Consent routes: create, list, revoke."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.consent import Consent
from app.models.enums import AuditAction, ConsentStatus, UserRole
from app.models.patient import Patient
from app.models.user import User
from app.schemas import ConsentCreate, ConsentResponse, ConsentRevokeRequest

router = APIRouter()


@router.post("", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
async def create_consent(
    body: ConsentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a consent grant. Patients grant consent; staff can request on behalf with patient presence."""
    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Only patient themselves or authorized staff can create consent
    if current_user.role == UserRole.PATIENT:
        if not patient.user_id or patient.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only manage your own consent")

    consent = Consent(
        patient_id=body.patient_id,
        purpose=body.purpose,
        scope=body.scope,
        recipient_id=body.recipient_id,
        recipient_facility_id=body.recipient_facility_id,
        expires_at=body.expires_at,
    )
    db.add(consent)

    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.CONSENT_CREATE,
        resource_type="consent",
        resource_id=str(consent.id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(consent)

    return ConsentResponse.model_validate(consent)


@router.get("", response_model=list[ConsentResponse])
async def list_consents(
    patient_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List consents. Patients see only their own."""
    query = db.query(Consent)

    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(Consent.patient_id == patient.id)
    elif patient_id:
        query = query.filter(Consent.patient_id == patient_id)

    return [ConsentResponse.model_validate(c) for c in query.all()]


@router.get("/{consent_id}", response_model=ConsentResponse)
async def get_consent(
    consent_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get consent details."""
    consent = db.query(Consent).filter(Consent.id == consent_id).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")

    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or consent.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Access denied")

    return ConsentResponse.model_validate(consent)


@router.post("/{consent_id}/revoke", response_model=ConsentResponse)
async def revoke_consent(
    consent_id: uuid.UUID,
    body: ConsentRevokeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a consent grant."""
    consent = db.query(Consent).filter(Consent.id == consent_id).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")

    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or consent.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="You can only revoke your own consent")

    if consent.status == ConsentStatus.REVOKED:
        raise HTTPException(status_code=400, detail="Consent already revoked")

    consent.status = ConsentStatus.REVOKED
    consent.revoked_at = datetime.now(UTC)
    consent.revocation_reason = body.reason

    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.CONSENT_REVOKE,
        resource_type="consent",
        resource_id=str(consent.id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(consent)

    return ConsentResponse.model_validate(consent)
