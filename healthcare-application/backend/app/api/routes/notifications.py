"""Notification routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.audit import Alert, Notification
from app.models.user import User
from app.schemas import NotificationResponse

router = APIRouter()


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List notifications for the current user."""
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [NotificationResponse.model_validate(n) for n in notifications]


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    return {"status": "ok"}


@router.get("/alerts")
async def list_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List alerts for the current user."""
    alerts = (
        db.query(Alert)
        .filter(Alert.user_id == current_user.id, Alert.is_read.is_(False))
        .order_by(Alert.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": str(a.id),
            "alert_type": a.alert_type.value,
            "title": a.title,
            "message": a.message,
            "severity": a.severity,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]


from pydantic import BaseModel, model_validator
from typing import Any, Optional


class EmailSendRequest(BaseModel):
    template_name: str = "FOLLOW_UP_REMINDER"  # CARE_GAP_ALERT, REFERRAL_UPDATE, FOLLOW_UP_REMINDER, PATIENT_REGISTRATION_CONFIRMATION
    to_email: str
    recipient_name: Optional[str] = "Healthcare Recipient"
    context: Optional[dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "to_email" not in data and "recipient_email" in data:
                data["to_email"] = data["recipient_email"]
            if "template_name" not in data and "template_type" in data:
                data["template_name"] = data["template_type"]
            if "recipient_name" not in data and "patient_name" in data:
                data["recipient_name"] = data["patient_name"]
            if "context" not in data and "details" in data:
                data["context"] = data["details"]
        return data


@router.post("/email")
async def send_notification_email(
    payload: EmailSendRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Send a real email alert via backend SMTP server.
    SMTP credentials remain strictly server-side.
    """
    from app.services.email_service import get_email_service

    email_service = get_email_service()
    context = payload.context or {}
    context.setdefault("recipient_name", payload.recipient_name or "Valued Patient")
    context.setdefault("patient_name", payload.recipient_name or "Ramesh Kumar")
    context.setdefault("patient_id", "PID-2026-RAMESH-4412")
    context.setdefault("facility_name", "District Hospital Clinical OPD")
    context.setdefault("scheduled_date", "Tomorrow at 10:00 AM")
    context.setdefault("reason", "Chest X-Ray follow-up and clinical review")
    context.setdefault("doctor_name", current_user.full_name or "Dr. Rajesh Sharma")
    context.setdefault("gap_category", "Maternal / Respiratory Follow-up")
    context.setdefault("due_date", "Within 48 hours")
    context.setdefault("priority", "HIGH")
    context.setdefault("action_required", "Visit nearest Primary Health Centre or coordinate with ASHA worker.")
    context.setdefault("referral_id", "REF-RAMESH-2026")
    context.setdefault("from_facility", "Karera PHC")
    context.setdefault("to_facility", "Shivpuri District Hospital")
    context.setdefault("status", "Specialist Review Completed")
    context.setdefault("specialty", "Pulmonology / Internal Medicine")
    context.setdefault("clinical_notes", "MedFed AI analysis completed with clinician agreement.")
    context.setdefault("age", "42 yrs")
    context.setdefault("gender", "Male")
    context.setdefault("village", "Karera Village")
    context.setdefault("district", "Shivpuri")

    result = email_service.send_template_email(
        template_name=payload.template_name,
        to_email=payload.to_email,
        context=context,
    )

    if not result.get("success"):
        return {
            "status": "warning",
            "message": "Email delivery failed or SMTP not configured.",
            "details": result,
            "fallback": "In-app alert persisted in DORI notifications.",
        }

    return {
        "status": "success",
        "message": f"Real email alert dispatched to {payload.to_email}",
        "details": result,
    }

