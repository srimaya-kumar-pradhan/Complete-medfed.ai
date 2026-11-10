"""Public health intelligence routes (aggregated, privacy-preserving)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.audit import Anomaly, PublicHealthEvent
from app.models.care_gap import CareGap
from app.models.enums import CareGapStatus, ReferralStatus, UserRole
from app.models.patient import Patient
from app.models.referral import Referral
from app.models.user import User
from app.schemas import AnomalyResponse, PublicHealthSummary

router = APIRouter()


@router.get("/summary", response_model=PublicHealthSummary)
async def get_public_health_summary(
    district_id: uuid.UUID | None = None,
    current_user: User = Depends(
        require_roles(
            UserRole.DISTRICT_OFFICER, UserRole.STATE_ADMIN,
            UserRole.NATIONAL_ADMIN, UserRole.SYSTEM_ADMIN,
        )
    ),
    db: Session = Depends(get_db),
):
    """Get aggregated public health summary. No individual patient data exposed."""
    patient_query = db.query(func.count(Patient.id))
    gap_query = db.query(func.count(CareGap.id)).filter(
        CareGap.status.in_([CareGapStatus.DETECTED, CareGapStatus.ALERTED, CareGapStatus.ASSIGNED])
    )
    pending_ref = db.query(func.count(Referral.id)).filter(
        Referral.status.in_([
            ReferralStatus.CREATED, ReferralStatus.ISSUED,
            ReferralStatus.ACCEPTED, ReferralStatus.IN_TRANSIT,
        ])
    )
    completed_ref = db.query(func.count(Referral.id)).filter(
        Referral.status == ReferralStatus.COMPLETED
    )
    anomaly_count = db.query(func.count(Anomaly.id)).filter(Anomaly.is_active.is_(True))

    if district_id:
        patient_query = patient_query.filter(Patient.district_id == district_id)

    total_patients = patient_query.scalar() or 0
    active_gaps = gap_query.scalar() or 0
    pending_referrals = pending_ref.scalar() or 0
    completed_referrals = completed_ref.scalar() or 0
    total_referrals = pending_referrals + completed_referrals
    completion_rate = (
        round(completed_referrals / total_referrals * 100, 1) if total_referrals > 0 else 0.0
    )

    return PublicHealthSummary(
        district_id=district_id,
        total_patients=total_patients,
        active_care_gaps=active_gaps,
        pending_referrals=pending_referrals,
        completed_referrals=completed_referrals,
        active_anomalies=anomaly_count.scalar() or 0,
        referral_completion_rate=completion_rate,
    )


@router.get("/anomalies", response_model=list[AnomalyResponse])
async def list_anomalies(
    district_id: uuid.UUID | None = None,
    current_user: User = Depends(
        require_roles(
            UserRole.DISTRICT_OFFICER, UserRole.STATE_ADMIN,
            UserRole.NATIONAL_ADMIN, UserRole.SYSTEM_ADMIN,
        )
    ),
    db: Session = Depends(get_db),
):
    """List detected anomalies (aggregated indicators only)."""
    query = db.query(Anomaly).filter(Anomaly.is_active.is_(True))
    if district_id:
        query = query.filter(Anomaly.district_id == district_id)
    anomalies = query.order_by(Anomaly.detected_at.desc()).limit(50).all()
    return [AnomalyResponse.model_validate(a) for a in anomalies]


@router.get("/trends")
async def get_trends(
    district_id: uuid.UUID | None = None,
    current_user: User = Depends(
        require_roles(
            UserRole.DISTRICT_OFFICER, UserRole.STATE_ADMIN,
            UserRole.NATIONAL_ADMIN, UserRole.SYSTEM_ADMIN,
        )
    ),
    db: Session = Depends(get_db),
):
    """Get aggregated trend data. Privacy-preserving — no individual identifiers."""
    # Aggregate care gap trends by type
    gap_trends = (
        db.query(CareGap.gap_type, func.count(CareGap.id))
        .group_by(CareGap.gap_type)
        .all()
    )

    return {
        "care_gap_by_type": [
            {"gap_type": t, "count": c} for t, c in gap_trends
        ],
        "note": "All data is aggregated. No individual patient identifiers are included.",
    }
