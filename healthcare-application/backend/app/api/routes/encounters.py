"""Clinical encounter routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.clinical import ClinicalEncounter, Medication
from app.models.enums import AuditAction, UserRole
from app.models.user import User
from app.schemas import (
    EncounterCreate,
    EncounterResponse,
    MedicationCreate,
    MedicationResponse,
)

router = APIRouter()


@router.post("", response_model=EncounterResponse, status_code=status.HTTP_201_CREATED)
async def create_encounter(
    body: EncounterCreate,
    request: Request,
    current_user: User = Depends(
        require_roles(UserRole.ASHA, UserRole.ANM, UserRole.MEDICAL_OFFICER, UserRole.SYSTEM_ADMIN)
    ),
    db: Session = Depends(get_db),
):
    """Record a clinical encounter."""
    facility_ids = [f.id for f in current_user.facilities]
    encounter = ClinicalEncounter(
        patient_id=body.patient_id,
        facility_id=facility_ids[0] if facility_ids else None,
        provider_id=current_user.id,
        encounter_type=body.encounter_type,
        encounter_date=body.encounter_date,
        chief_complaint=body.chief_complaint,
        diagnosis=body.diagnosis,
        diagnosis_code=body.diagnosis_code,
        treatment_plan=body.treatment_plan,
        notes=body.notes,
        vitals=body.vitals,
        anc_visit_number=body.anc_visit_number,
        gestational_weeks=body.gestational_weeks,
        expected_delivery_date=body.expected_delivery_date,
        risk_category=body.risk_category,
        tb_treatment_phase=body.tb_treatment_phase,
        tb_treatment_month=body.tb_treatment_month,
        chronic_condition_type=body.chronic_condition_type,
    )
    db.add(encounter)

    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.CLINICAL_CREATE,
        resource_type="encounter",
        resource_id=str(encounter.id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(encounter)

    return EncounterResponse.model_validate(encounter)


@router.get("", response_model=list[EncounterResponse])
async def list_encounters(
    patient_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List clinical encounters."""
    query = db.query(ClinicalEncounter)
    if patient_id:
        query = query.filter(ClinicalEncounter.patient_id == patient_id)

    offset = (page - 1) * page_size
    encounters = (
        query.order_by(ClinicalEncounter.encounter_date.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return [EncounterResponse.model_validate(e) for e in encounters]


@router.get("/{encounter_id}", response_model=EncounterResponse)
async def get_encounter(
    encounter_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get encounter details."""
    encounter = db.query(ClinicalEncounter).filter(
        ClinicalEncounter.id == encounter_id
    ).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return EncounterResponse.model_validate(encounter)


@router.post("/medications", response_model=MedicationResponse, status_code=status.HTTP_201_CREATED)
async def create_medication(
    body: MedicationCreate,
    current_user: User = Depends(
        require_roles(UserRole.MEDICAL_OFFICER, UserRole.SYSTEM_ADMIN)
    ),
    db: Session = Depends(get_db),
):
    """Record a medication for a patient."""
    med = Medication(
        patient_id=body.patient_id,
        name=body.name,
        dosage=body.dosage,
        frequency=body.frequency,
        route=body.route,
        start_date=body.start_date,
        end_date=body.end_date,
        prescribed_by=current_user.id,
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return MedicationResponse.model_validate(med)


@router.get("/medications/{patient_id}", response_model=list[MedicationResponse])
async def list_medications(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List medications for a patient."""
    meds = db.query(Medication).filter(Medication.patient_id == patient_id).all()
    return [MedicationResponse.model_validate(m) for m in meds]
