"""Care gap and prediction routes."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.care_gap import CareGap, HealthWorkerTask, RiskPrediction
from app.models.clinical import ClinicalEncounter
from app.models.enums import (
    CareGapSeverity,
    CareGapStatus,
    EncounterType,
    UserRole,
)
from app.models.patient import Patient
from app.models.user import User
from app.schemas import CareGapResponse, PredictionRequest, PredictionResponse

router = APIRouter()


def _run_care_gap_prediction(
    patient: Patient, db: Session
) -> RiskPrediction:
    """Run deterministic care-gap prediction for a patient.

    This is a rule-based model for the initial implementation.
    NOT a random number generator. Uses actual clinical data to compute risk.
    """
    encounters = (
        db.query(ClinicalEncounter)
        .filter(ClinicalEncounter.patient_id == patient.id)
        .order_by(ClinicalEncounter.encounter_date.desc())
        .all()
    )

    # Feature extraction
    features = {
        "total_encounters": len(encounters),
        "has_anc_visits": any(e.encounter_type == EncounterType.ANC_VISIT for e in encounters),
        "anc_visit_count": sum(1 for e in encounters if e.encounter_type == EncounterType.ANC_VISIT),
        "has_high_risk_category": any(
            e.risk_category in ("high", "very_high") for e in encounters if e.risk_category
        ),
        "days_since_last_visit": 0,
        "has_tb_treatment": any(e.encounter_type == EncounterType.TB_VISIT for e in encounters),
    }

    if encounters:
        last_visit = encounters[0].encounter_date
        if last_visit.tzinfo:
            days_delta = (datetime.now(UTC) - last_visit).days
        else:
            days_delta = (datetime.now(UTC).replace(tzinfo=None) - last_visit).days
        features["days_since_last_visit"] = days_delta

    # Deterministic risk calculation
    risk = 0.1  # Base risk

    # ANC dropout risk factors
    if features["has_anc_visits"]:
        if features["anc_visit_count"] < 4:
            risk += 0.2  # Below recommended 4 ANC visits
        if features["days_since_last_visit"] > 60:
            risk += 0.25  # >2 months since last visit
        if features["has_high_risk_category"]:
            risk += 0.15  # High-risk pregnancy
    elif features["total_encounters"] == 0:
        risk += 0.3  # No encounters at all

    # TB treatment compliance
    if features["has_tb_treatment"]:
        tb_visits = [e for e in encounters if e.encounter_type == EncounterType.TB_VISIT]
        if tb_visits and features["days_since_last_visit"] > 30:
            risk += 0.2  # Missing TB follow-up

    # General follow-up risk
    if features["days_since_last_visit"] > 90:
        risk += 0.1

    risk = min(risk, 1.0)
    threshold = 0.5

    prediction = RiskPrediction(
        patient_id=patient.id,
        prediction_type="care_gap_risk",
        risk_probability=round(risk, 3),
        threshold=threshold,
        is_above_threshold=risk >= threshold,
        input_features=features,
        explanation=_generate_explanation(features, risk),
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return prediction


def _generate_explanation(features: dict, risk: float) -> str:
    """Generate human-readable explanation for the prediction."""
    factors = []
    if features.get("days_since_last_visit", 0) > 60:
        factors.append(f"No visit in {features['days_since_last_visit']} days")
    if features.get("has_anc_visits") and features.get("anc_visit_count", 0) < 4:
        factors.append(f"Only {features['anc_visit_count']}/4 recommended ANC visits completed")
    if features.get("has_high_risk_category"):
        factors.append("High-risk pregnancy category")
    if features.get("total_encounters", 0) == 0:
        factors.append("No clinical encounters recorded")
    if features.get("has_tb_treatment") and features.get("days_since_last_visit", 0) > 30:
        factors.append("TB treatment follow-up overdue")

    if not factors:
        factors.append("Low baseline risk")

    return "DECISION SUPPORT ONLY. Risk factors: " + "; ".join(factors)


@router.post("/predictions", response_model=PredictionResponse)
async def generate_prediction(
    body: PredictionRequest,
    current_user: User = Depends(
        require_roles(
            UserRole.ASHA, UserRole.ANM, UserRole.MEDICAL_OFFICER, UserRole.SYSTEM_ADMIN,
        )
    ),
    db: Session = Depends(get_db),
):
    """Generate a care-gap risk prediction for a patient.

    This is DECISION SUPPORT ONLY. The treating clinician remains
    responsible for all clinical decisions.
    """
    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    prediction = _run_care_gap_prediction(patient, db)

    # If above threshold, auto-create care gap and task
    if prediction.is_above_threshold:
        care_gap = CareGap(
            patient_id=patient.id,
            gap_type="predicted_dropout_risk",
            description=prediction.explanation or "Predicted care gap detected",
            severity=(
                CareGapSeverity.HIGH
                if prediction.risk_probability >= 0.7
                else CareGapSeverity.MEDIUM
            ),
            status=CareGapStatus.DETECTED,
            prediction_id=prediction.id,
        )
        db.add(care_gap)
        db.commit()
        db.refresh(care_gap)

        # Create outreach task for assigned ASHA/ANM
        if current_user.role in (UserRole.ASHA, UserRole.ANM):
            task = HealthWorkerTask(
                worker_id=current_user.id,
                patient_id=patient.id,
                care_gap_id=care_gap.id,
                task_type="outreach",
                title=f"Follow up with {patient.full_name}",
                description=prediction.explanation,
                priority="high" if prediction.risk_probability >= 0.7 else "medium",
            )
            db.add(task)
            db.commit()

    return PredictionResponse.model_validate(prediction)


@router.get("", response_model=list[CareGapResponse])
async def list_care_gaps(
    patient_id: uuid.UUID | None = None,
    status_filter: CareGapStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List care gaps."""
    query = db.query(CareGap)
    if patient_id:
        query = query.filter(CareGap.patient_id == patient_id)
    if status_filter:
        query = query.filter(CareGap.status == status_filter)

    # Workers see only their assigned gaps
    if current_user.role in (UserRole.ASHA, UserRole.ANM):
        query = query.filter(CareGap.assigned_worker_id == current_user.id)

    offset = (page - 1) * page_size
    gaps = query.order_by(CareGap.detected_at.desc()).offset(offset).limit(page_size).all()
    return [CareGapResponse.model_validate(g) for g in gaps]


@router.get("/{care_gap_id}", response_model=CareGapResponse)
async def get_care_gap(
    care_gap_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get care gap details."""
    gap = db.query(CareGap).filter(CareGap.id == care_gap_id).first()
    if not gap:
        raise HTTPException(status_code=404, detail="Care gap not found")
    return CareGapResponse.model_validate(gap)
