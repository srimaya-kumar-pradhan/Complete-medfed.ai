"""Patient routes: CRUD, search, timeline."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.security import generate_pseudonymous_id
from app.models.audit import AuditLog
from app.models.clinical import ClinicalEncounter
from app.models.enums import AuditAction, UserRole
from app.models.patient import Patient
from app.models.user import User
from app.schemas import (
    PatientCreate,
    PatientResponse,
    PatientUpdate,
    TimelineEvent,
)

router = APIRouter()


@router.get("", response_model=list[PatientResponse])
async def list_patients(
    search: str | None = Query(None, description="Search by name or pseudonymous ID"),
    facility_id: uuid.UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(
        require_roles(
            UserRole.ASHA, UserRole.ANM, UserRole.MEDICAL_OFFICER,
            UserRole.DISTRICT_OFFICER, UserRole.SYSTEM_ADMIN,
        )
    ),
    db: Session = Depends(get_db),
):
    """List patients accessible to the current user."""
    query = db.query(Patient).filter(Patient.is_active.is_(True))

    if search:
        query = query.filter(
            (Patient.full_name.ilike(f"%{search}%"))
            | (Patient.pseudonymous_id.ilike(f"%{search}%"))
        )
    if facility_id:
        query = query.filter(Patient.facility_id == facility_id)

    # Role-based filtering
    if current_user.role in (UserRole.ASHA, UserRole.ANM, UserRole.MEDICAL_OFFICER):
        # Only patients at assigned facilities
        facility_ids = [f.id for f in current_user.facilities]
        if facility_ids:
            query = query.filter(Patient.facility_id.in_(facility_ids))

    offset = (page - 1) * page_size
    patients = query.offset(offset).limit(page_size).all()
    return [PatientResponse.model_validate(p) for p in patients]


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    body: PatientCreate,
    request: Request,
    current_user: User = Depends(
        require_roles(
            UserRole.ASHA, UserRole.ANM, UserRole.MEDICAL_OFFICER, UserRole.SYSTEM_ADMIN,
        )
    ),
    db: Session = Depends(get_db),
):
    """Register a new patient, issue Care Passport, index vectors, and trigger alerts."""
    import json
    from datetime import UTC, datetime, timedelta
    from app.models.patient import CarePassport
    from app.models.clinical import ClinicalEncounter
    from app.models.enums import EncounterType, NotificationType
    from app.models.audit import Notification
    from app.services.email_service import get_email_service
    from app.services.vector_store import get_vector_store

    now = datetime.now(UTC)
    patient = Patient(
        pseudonymous_id=generate_pseudonymous_id(),
        full_name=body.full_name,
        date_of_birth=body.date_of_birth,
        gender=body.gender,
        blood_group=body.blood_group,
        phone=body.phone,
        email=body.email,
        address=body.address,
        village=body.village,
        district_id=body.district_id,
        facility_id=body.facility_id,
        abha_id=body.abha_id,
        emergency_contact_name=body.emergency_contact_name,
        emergency_contact_phone=body.emergency_contact_phone,
    )
    db.add(patient)
    db.flush()

    # Automatically issue cryptographic Care Passport
    passport = CarePassport(
        patient_id=patient.id,
        pseudonymous_id=patient.pseudonymous_id,
        qr_data=json.dumps({
            "pid": patient.pseudonymous_id,
            "name": patient.full_name,
            "bg": patient.blood_group.value,
            "vlg": patient.village or "N/A",
            "conditions": body.existing_conditions or "None recorded",
            "type": "DORI_CARE_PASSPORT_V1",
        }),
        expires_at=now + timedelta(days=365),
        emergency_blood_group=patient.blood_group.value,
        emergency_conditions=body.existing_conditions or "None recorded",
        emergency_allergies="None recorded",
    )
    db.add(passport)

    # If clinical notes or existing conditions provided, create initial encounter
    if body.clinical_notes or body.existing_conditions:
        enc = ClinicalEncounter(
            patient_id=patient.id,
            facility_id=body.facility_id,
            provider_id=current_user.id,
            encounter_type=EncounterType.CONSULTATION,
            encounter_date=now,
            chief_complaint=body.existing_conditions or "Initial intake and enrollment",
            notes=body.clinical_notes,
        )
        db.add(enc)

    # In-app notification for frontline worker & patient
    notif = Notification(
        user_id=current_user.id,
        notification_type=NotificationType.IN_APP,
        title=f"New Patient Registered: {patient.full_name}",
        message=f"Patient record {patient.pseudonymous_id} created with verified Care Passport.",
        is_sent=True,
        metadata_json={"patient_id": str(patient.id), "pid": patient.pseudonymous_id},
    )
    db.add(notif)

    # Audit log
    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.PATIENT_CREATE,
        resource_type="patient",
        resource_id=str(patient.id),
        ip_address=request.client.host if request.client else None,
        metadata_json={"pid": patient.pseudonymous_id, "name": patient.full_name},
    )
    db.add(audit)
    db.commit()
    db.refresh(patient)

    # Index in local vector store for instant semantic retrieval
    vector_store = get_vector_store()
    vector_text = f"{patient.full_name} {patient.pseudonymous_id} {body.existing_conditions or ''} {body.clinical_notes or ''} {patient.village or ''}"
    vector_store.index_record(
        record_id=str(patient.id),
        patient_id=str(patient.id),
        patient_name=patient.full_name,
        text_content=vector_text,
        record_type="patient_demographic",
        metadata={"pid": patient.pseudonymous_id, "village": patient.village},
    )

    # Dispatch confirmation email via SMTP
    target_email = patient.email or "sihdori7@gmail.com"
    email_service = get_email_service()
    try:
        age_str = f"{now.year - patient.date_of_birth.year} yrs" if patient.date_of_birth else "Adult"
        email_service.send_template_email(
            template_name="PATIENT_REGISTRATION_CONFIRMATION",
            to_email=target_email,
            context={
                "recipient_name": patient.full_name,
                "patient_name": patient.full_name,
                "patient_id": patient.pseudonymous_id,
                "age": age_str,
                "gender": patient.gender.value.capitalize(),
                "village": patient.village or "Rural Block",
                "district": "Shivpuri District",
                "facility_name": "Karera PHC / Sub-Centre",
            },
        )
    except Exception as em_err:
        pass  # Graceful fallback without failing registration

    return PatientResponse.model_validate(patient)


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get patient details."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # RBAC: patients can only see their own data
    if current_user.role == UserRole.PATIENT:
        if not patient.user_id or patient.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Audit
    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.PATIENT_LOOKUP,
        resource_type="patient",
        resource_id=str(patient.id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()

    return PatientResponse.model_validate(patient)


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: uuid.UUID,
    body: PatientUpdate,
    current_user: User = Depends(
        require_roles(
            UserRole.ASHA, UserRole.ANM, UserRole.MEDICAL_OFFICER,
            UserRole.PATIENT, UserRole.SYSTEM_ADMIN,
        )
    ),
    db: Session = Depends(get_db),
):
    """Update patient information."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Patients can only update their own data
    if current_user.role == UserRole.PATIENT:
        if not patient.user_id or patient.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    return PatientResponse.model_validate(patient)


@router.get("/{patient_id}/timeline", response_model=list[TimelineEvent])
async def get_patient_timeline(
    patient_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get chronological care timeline for a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # RBAC check
    if current_user.role == UserRole.PATIENT:
        if not patient.user_id or patient.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Audit clinical access
    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.CLINICAL_ACCESS,
        resource_type="patient_timeline",
        resource_id=str(patient.id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()

    # Build timeline from encounters
    encounters = (
        db.query(ClinicalEncounter)
        .filter(ClinicalEncounter.patient_id == patient_id)
        .order_by(ClinicalEncounter.encounter_date.desc())
        .all()
    )

    events = []
    for enc in encounters:
        events.append(
            TimelineEvent(
                id=enc.id,
                event_type=enc.encounter_type.value,
                event_date=enc.encounter_date,
                title=f"{enc.encounter_type.value.replace('_', ' ').title()}",
                description=enc.chief_complaint or enc.diagnosis,
                metadata={
                    "vitals": enc.vitals,
                    "risk_category": enc.risk_category,
                    "anc_visit_number": enc.anc_visit_number,
                },
            )
        )

    return events


@router.get("/search/semantic")
async def semantic_patient_search(
    query: str = Query(..., min_length=2, description="Clinical query or symptoms"),
    top_k: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Semantic vector search across local patient records and clinical encounters."""
    from app.services.vector_store import get_vector_store

    store = get_vector_store()
    if not store._is_initialized:
        store.sync_from_db(db)

    results = store.search(query, top_k=top_k)
    return {
        "query": query,
        "results_count": len(results),
        "data_source": "Local Vector Store (SQLite Embedding Index)",
        "results": results,
    }

