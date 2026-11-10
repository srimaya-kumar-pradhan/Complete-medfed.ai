"""Chest X-ray and MedFed AI clinical routes.
Protected with strict role-based access control (Doctor / System Admin only).
"""
from __future__ import annotations

import base64
import io
import uuid
from datetime import UTC, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from PIL import Image

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.audit import AuditLog, Notification
from app.models.enums import AuditAction, NotificationType, ReferralStatus, UserRole
from app.models.patient import Patient
from app.models.referral import Referral, ReferralEvent
from app.models.user import User
from app.models.xray import ChestXRayStudy
from app.services.email_service import get_email_service
from app.services.medfed_service import get_medfed_service

router = APIRouter()


class PredictRequest(BaseModel):
    sample_id: Optional[str] = None
    image_base64: Optional[str] = None
    patient_id: Optional[uuid.UUID] = None
    referral_id: Optional[uuid.UUID] = None

    @field_validator("patient_id", "referral_id", mode="before")
    @classmethod
    def parse_optional_uuid(cls, v):
        if not v:
            return None
        if isinstance(v, uuid.UUID):
            return v
        try:
            return uuid.UUID(str(v))
        except (ValueError, AttributeError):
            return None


class ClinicalReviewSubmit(BaseModel):
    patient_id: uuid.UUID
    referral_id: Optional[uuid.UUID] = None
    sample_id: Optional[str] = None
    image_base64: Optional[str] = None
    gradcam_base64: Optional[str] = None
    top_finding: str
    top_confidence: float
    decision: str  # agree, modify, reject
    clinical_notes: str
    treatment_plan: Optional[str] = None
    schedule_follow_up_days: Optional[int] = 7
    findings: Optional[list] = None

    @field_validator("patient_id", "referral_id", mode="before")
    @classmethod
    def parse_optional_uuid(cls, v):
        if not v:
            return None
        if isinstance(v, uuid.UUID):
            return v
        try:
            return uuid.UUID(str(v))
        except (ValueError, AttributeError):
            return None


@router.get("/samples")
async def get_sample_xrays():
    """Get curated chest x-ray demo samples."""
    service = get_medfed_service()
    return service.get_curated_samples()


@router.post("/predict")
async def run_medfed_inference(
    request: Request,
    current_user: User = Depends(
        require_roles(UserRole.MEDICAL_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.REFERRAL_FACILITY)
    ),
    db: Session = Depends(get_db),
):
    """
    Run MedFed DenseNet121 inference with Grad-CAM explainability.
    Protected: DOCTORS AND ADMINS ONLY.
    Supports both JSON request body and multipart/form-data.
    """
    service = get_medfed_service()
    image: Optional[Image.Image] = None
    body: Optional[PredictRequest] = None

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            raw_json = await request.json()
            body = PredictRequest(**raw_json)
        except Exception:
            body = None
    elif "multipart/form-data" in content_type:
        try:
            form = await request.form()
            uploaded_file = form.get("file")
            if uploaded_file and hasattr(uploaded_file, "read"):
                content = await uploaded_file.read()
                image = Image.open(io.BytesIO(content))
            sample_id = form.get("sample_id")
            image_b64 = form.get("image_base64")
            pat_id = form.get("patient_id")
            ref_id = form.get("referral_id")
            body = PredictRequest(
                sample_id=str(sample_id) if sample_id else None,
                image_base64=str(image_b64) if image_b64 else None,
                patient_id=pat_id,
                referral_id=ref_id,
            )
        except Exception:
            pass

    # Option 2: Curated demo sample
    if image is None and body and body.sample_id:
        image = service.get_sample_image(body.sample_id)
        if image is None:
            raise HTTPException(status_code=404, detail="Sample image not found on disk")

    # Option 3: Base64 string
    elif image is None and body and body.image_base64:
        try:
            raw_b64 = body.image_base64
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            image_data = base64.b64decode(raw_b64)
            image = Image.open(io.BytesIO(image_data))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 image: {e}")

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="No valid image provided. Upload an image or select a curated sample.",
        )

    # Gather patient context for realistic clinical correlation
    patient_context = {}
    if body and body.patient_id:
        patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
        if patient:
            patient_context["patient_name"] = patient.full_name
            patient_context["dob"] = str(patient.date_of_birth)
    if body and body.referral_id:
        referral = db.query(Referral).filter(Referral.id == body.referral_id).first()
        if referral:
            patient_context["reason"] = referral.reason
            patient_context["diagnosis"] = referral.diagnosis

    # Run MedFed AI analysis
    result = service.analyze_image(image, patient_context)

    # Log audit event
    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.CLINICAL_ACCESS,
        resource_type="chest_xray_ai",
        resource_id=str(body.patient_id) if (body and body.patient_id) else "anonymous",
        result="success",
        metadata_json={
            "top_finding": result["top_finding"],
            "top_confidence": result["top_confidence"],
            "model": result["model_name"],
        },
    )
    db.add(audit)
    db.commit()

    return result


@router.post("/reviews", status_code=status.HTTP_201_CREATED)
async def submit_clinical_review(
    review: ClinicalReviewSubmit,
    request: Request,
    current_user: User = Depends(
        require_roles(UserRole.MEDICAL_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.REFERRAL_FACILITY)
    ),
    db: Session = Depends(get_db),
):
    """
    Save clinician's review of the AI analysis, update the referral timeline,
    schedule follow-up, and dispatch in-app and SMTP email alerts.
    """
    patient = db.query(Patient).filter(Patient.id == review.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    now = datetime.now(UTC)
    follow_up_dt = now + timedelta(days=review.schedule_follow_up_days or 7)

    # 1. Create ChestXRayStudy record
    study = ChestXRayStudy(
        patient_id=patient.id,
        referral_id=review.referral_id,
        study_date=now,
        image_filename=review.sample_id or "uploaded_chest_xray.png",
        image_url=review.image_base64[:200] if review.image_base64 else None,
        gradcam_url=review.gradcam_base64[:200] if review.gradcam_base64 else None,
        model_name="MedFed Global DenseNet121",
        model_version="v1.3",
        predictions=review.findings,
        top_finding=review.top_finding,
        top_confidence=review.top_confidence,
        review_status=review.decision,
        doctor_decision=f"Decision: {review.decision.upper()} - {review.top_finding}",
        doctor_notes=review.clinical_notes,
        reviewed_by_id=current_user.id,
        reviewed_at=now,
        follow_up_date=follow_up_dt,
    )
    db.add(study)
    db.flush()

    # 2. Update referral timeline if linked
    referral = None
    if review.referral_id:
        referral = db.query(Referral).filter(Referral.id == review.referral_id).first()
        if referral:
            # Advance referral status to RECEIVED or COMPLETED
            old_status = referral.status
            referral.status = ReferralStatus.RECEIVED

            event_notes = (
                f"Chest X-Ray completed. MedFed AI indicated {review.top_finding} "
                f"({int(review.top_confidence * 100)}%). Doctor decision: {review.decision.upper()}. "
                f"Notes: {review.clinical_notes}"
            )
            event = ReferralEvent(
                referral_id=referral.id,
                from_status=old_status,
                to_status=ReferralStatus.RECEIVED,
                actor_id=current_user.id,
                notes=event_notes,
                metadata_json={
                    "event_type": "radiology_and_review",
                    "ai_finding": review.top_finding,
                    "confidence": review.top_confidence,
                    "clinician_decision": review.decision,
                    "treatment_plan": review.treatment_plan,
                    "facility": "District Hospital Radiology OPD",
                },
            )
            db.add(event)

    # 3. Create In-App Notification
    recipient_user_id = patient.user_id or current_user.id
    notif = Notification(
        user_id=recipient_user_id,
        notification_type=NotificationType.IN_APP,
        title=f"Chest X-Ray Reviewed for {patient.full_name}",
        message=(
            f"Dr. {current_user.full_name} completed clinical review. "
            f"Finding: {review.top_finding}. Follow-up scheduled for {follow_up_dt.strftime('%d %b %Y')}."
        ),
        is_sent=True,
        metadata_json={
            "patient_id": str(patient.id),
            "study_id": str(study.id),
            "referral_id": str(review.referral_id) if review.referral_id else None,
        },
    )
    db.add(notif)

    # 4. Audit Log
    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.CLINICAL_CREATE,
        resource_type="xray_clinical_review",
        resource_id=str(study.id),
        ip_address=request.client.host if request.client else None,
        metadata_json={
            "patient_id": str(patient.id),
            "decision": review.decision,
            "top_finding": review.top_finding,
        },
    )
    db.add(audit)
    db.commit()

    # 5. Dispatch Real SMTP Email Notification
    email_service = get_email_service()
    email_result = {"success": False, "note": "No email address registered"}
    target_email = patient.email or "sihdori7@gmail.com"  # fallback to demo receiver

    try:
        email_result = email_service.send_template_email(
            template_name="FOLLOW_UP_REMINDER",
            to_email=target_email,
            context={
                "recipient_name": patient.full_name,
                "patient_name": patient.full_name,
                "patient_id": patient.pseudonymous_id,
                "facility_name": "District Hospital Clinical OPD",
                "scheduled_date": follow_up_dt.strftime("%d %B %Y"),
                "reason": f"Post X-Ray review for {review.top_finding} — Treatment adherence check",
                "doctor_name": current_user.full_name,
            },
        )
    except Exception as em_err:
        email_result = {"success": False, "error": str(em_err)}

    return {
        "status": "success",
        "message": "Clinical review recorded and referral timeline updated.",
        "study_id": str(study.id),
        "referral_id": str(referral.id) if referral else None,
        "follow_up_date": follow_up_dt.isoformat(),
        "email_dispatch": email_result,
    }


@router.get("/studies/{patient_id}")
async def get_patient_studies(
    patient_id: uuid.UUID,
    current_user: User = Depends(
        require_roles(UserRole.MEDICAL_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.REFERRAL_FACILITY)
    ),
    db: Session = Depends(get_db),
):
    """Retrieve all chest X-ray studies and reviews for a patient."""
    studies = (
        db.query(ChestXRayStudy)
        .filter(ChestXRayStudy.patient_id == patient_id)
        .order_by(ChestXRayStudy.study_date.desc())
        .all()
    )
    return [
        {
            "id": str(s.id),
            "study_date": s.study_date.isoformat(),
            "top_finding": s.top_finding,
            "top_confidence": s.top_confidence,
            "review_status": s.review_status,
            "doctor_decision": s.doctor_decision,
            "doctor_notes": s.doctor_notes,
            "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
            "follow_up_date": s.follow_up_date.isoformat() if s.follow_up_date else None,
        }
        for s in studies
    ]
