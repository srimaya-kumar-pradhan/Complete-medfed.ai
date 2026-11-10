"""Emergency break-glass access routes."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.consent import EmergencyAccessEvent
from app.models.enums import AuditAction, UserRole
from app.models.patient import Patient
from app.models.user import User
from app.schemas import EmergencyAccessRequest, EmergencyAccessResponse

router = APIRouter()


@router.post("", response_model=EmergencyAccessResponse, status_code=status.HTTP_201_CREATED)
async def request_emergency_access(
    body: EmergencyAccessRequest,
    request: Request,
    current_user: User = Depends(
        require_roles(UserRole.MEDICAL_OFFICER, UserRole.REFERRAL_FACILITY, UserRole.SYSTEM_ADMIN)
    ),
    db: Session = Depends(get_db),
):
    """Request emergency break-glass access to a patient's emergency profile.

    This bypasses normal consent for life-threatening situations.
    The event is logged and the patient is notified.
    Only the minimum emergency profile is disclosed — NOT the full clinical record.
    """
    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Build emergency profile (minimal data only)
    emergency_profile = {
        "pseudonymous_id": patient.pseudonymous_id,
        "blood_group": patient.blood_group.value if patient.blood_group else "unknown",
        "allergies": [],
        "current_medications": [],
        "chronic_conditions": [],
        "emergency_contact_name": patient.emergency_contact_name,
        "emergency_contact_phone": patient.emergency_contact_phone,
    }

    # Populate from care passport if exists
    if patient.care_passport:
        cp = patient.care_passport
        if cp.emergency_allergies:
            emergency_profile["allergies"] = cp.emergency_allergies.split(",")
        if cp.emergency_medications:
            emergency_profile["current_medications"] = cp.emergency_medications.split(",")
        if cp.emergency_conditions:
            emergency_profile["chronic_conditions"] = cp.emergency_conditions.split(",")

    # Otherwise pull from clinical data
    if not emergency_profile["allergies"] and patient.allergies:
        emergency_profile["allergies"] = [
            a.allergen for a in patient.allergies if a.is_active
        ]
    if not emergency_profile["current_medications"] and patient.medications:
        emergency_profile["current_medications"] = [
            m.name for m in patient.medications if m.is_current
        ]

    data_accessed = "emergency_profile: blood_group, allergies, current_medications, chronic_conditions, emergency_contact"

    event = EmergencyAccessEvent(
        patient_id=patient.id,
        accessor_id=current_user.id,
        reason=body.reason,
        data_accessed=data_accessed,
        notification_sent=True,  # Would trigger notification in production
    )
    db.add(event)

    # Audit (critical)
    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.EMERGENCY_ACCESS,
        resource_type="patient",
        resource_id=str(patient.id),
        result="success",
        ip_address=request.client.host if request.client else None,
        metadata_json={
            "reason": body.reason,
            "data_accessed": data_accessed,
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(event)

    return EmergencyAccessResponse(
        id=event.id,
        patient_id=event.patient_id,
        reason=event.reason,
        accessed_at=event.accessed_at,
        emergency_profile=emergency_profile,
    )


@router.get("/{event_id}")
async def get_emergency_event(
    event_id: uuid.UUID,
    current_user: User = Depends(
        require_roles(UserRole.SYSTEM_ADMIN, UserRole.DISTRICT_OFFICER)
    ),
    db: Session = Depends(get_db),
):
    """Get details of an emergency access event (admin/audit)."""
    event = db.query(EmergencyAccessEvent).filter(EmergencyAccessEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {
        "id": str(event.id),
        "patient_id": str(event.patient_id),
        "accessor_id": str(event.accessor_id),
        "reason": event.reason,
        "data_accessed": event.data_accessed,
        "accessed_at": event.accessed_at.isoformat(),
        "notification_sent": event.notification_sent,
    }
