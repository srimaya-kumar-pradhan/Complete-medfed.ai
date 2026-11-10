"""Care Passport routes: issue, get, verify credentials."""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.security import (
    generate_signing_keypair,
    sign_credential,
    verify_credential_signature,
)
from app.models.audit import AuditLog
from app.models.enums import AuditAction, CredentialStatus, UserRole
from app.models.patient import CarePassport, Credential, CredentialIssuer, Patient
from app.models.user import User
from app.schemas import (
    CarePassportIssueRequest,
    CarePassportResponse,
    CredentialResponse,
    CredentialVerifyRequest,
    CredentialVerifyResponse,
)

router = APIRouter()


@router.post("", response_model=CarePassportResponse, status_code=status.HTTP_201_CREATED)
async def issue_care_passport(
    body: CarePassportIssueRequest,
    request: Request,
    current_user: User = Depends(
        require_roles(UserRole.ASHA, UserRole.ANM, UserRole.MEDICAL_OFFICER, UserRole.SYSTEM_ADMIN)
    ),
    db: Session = Depends(get_db),
):
    """Issue a new Care Passport for a patient."""
    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    existing = db.query(CarePassport).filter(
        CarePassport.patient_id == patient.id, CarePassport.is_active.is_(True)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Patient already has an active Care Passport")

    # Build QR data (contains only pseudonymous ID + verification URL, NOT medical data)
    qr_payload = {
        "pid": patient.pseudonymous_id,
        "ver": 1,
        "iss": datetime.now(UTC).isoformat(),
        "type": "DORI_CARE_PASSPORT",
    }

    passport = CarePassport(
        patient_id=patient.id,
        pseudonymous_id=patient.pseudonymous_id,
        qr_data=json.dumps(qr_payload),
        expires_at=datetime.now(UTC) + timedelta(days=365),
        emergency_blood_group=patient.blood_group.value if patient.blood_group else None,
    )
    db.add(passport)
    db.commit()
    db.refresh(passport)

    # Issue initial identity credential with cryptographic signature
    private_key_pem, public_key_pem = generate_signing_keypair()

    # Get or create issuer
    issuer = db.query(CredentialIssuer).filter(
        CredentialIssuer.name == "DORI System"
    ).first()
    if not issuer:
        issuer = CredentialIssuer(
            name="DORI System",
            issuer_type="system",
            public_key_pem=public_key_pem.decode("utf-8"),
        )
        db.add(issuer)
        db.commit()
        db.refresh(issuer)

    credential_data = {
        "pseudonymous_id": patient.pseudonymous_id,
        "credential_type": "identity",
        "issued_at": datetime.now(UTC).isoformat(),
    }
    data_bytes = json.dumps(credential_data, sort_keys=True).encode("utf-8")
    signature = sign_credential(data_bytes, private_key_pem)

    credential = Credential(
        care_passport_id=passport.id,
        credential_type="identity",
        issuer_id=issuer.id,
        subject_data=credential_data,
        signature=signature,
        public_key_pem=public_key_pem.decode("utf-8"),
        expires_at=datetime.now(UTC) + timedelta(days=365),
    )
    db.add(credential)

    # Audit
    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.CREDENTIAL_ISSUE,
        resource_type="care_passport",
        resource_id=str(passport.id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()

    return CarePassportResponse.model_validate(passport)


@router.get("/{passport_id}", response_model=CarePassportResponse)
async def get_care_passport(
    passport_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get Care Passport details."""
    passport = db.query(CarePassport).filter(CarePassport.id == passport_id).first()
    if not passport:
        raise HTTPException(status_code=404, detail="Care Passport not found")

    # RBAC: patients can only see their own passport
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.id == passport.patient_id).first()
        if not patient or patient.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    return CarePassportResponse.model_validate(passport)


@router.get("/patient/{patient_id}", response_model=CarePassportResponse)
async def get_care_passport_by_patient(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get Care Passport by patient ID."""
    passport = db.query(CarePassport).filter(
        CarePassport.patient_id == patient_id, CarePassport.is_active.is_(True)
    ).first()
    if not passport:
        raise HTTPException(status_code=404, detail="No active Care Passport found")

    return CarePassportResponse.model_validate(passport)


@router.get("/{passport_id}/credentials", response_model=list[CredentialResponse])
async def get_passport_credentials(
    passport_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get credentials attached to a Care Passport."""
    credentials = (
        db.query(Credential)
        .filter(Credential.care_passport_id == passport_id)
        .all()
    )
    return [CredentialResponse.model_validate(c) for c in credentials]


@router.post("/credentials/verify", response_model=CredentialVerifyResponse)
async def verify_credential(
    body: CredentialVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify a credential's cryptographic signature and status."""
    credential = db.query(Credential).filter(Credential.id == body.credential_id).first()
    if not credential:
        return CredentialVerifyResponse(is_valid=False, message="Credential not found")

    # Check status
    if credential.status != CredentialStatus.ACTIVE:
        return CredentialVerifyResponse(
            is_valid=False,
            credential_type=credential.credential_type,
            status=credential.status,
            message=f"Credential is {credential.status.value}",
        )

    # Check expiry
    if credential.expires_at and credential.expires_at < datetime.now(UTC):
        credential.status = CredentialStatus.EXPIRED
        db.commit()
        return CredentialVerifyResponse(
            is_valid=False,
            credential_type=credential.credential_type,
            status=CredentialStatus.EXPIRED,
            message="Credential has expired",
        )

    # Verify cryptographic signature
    if credential.signature and credential.public_key_pem:
        data_bytes = json.dumps(credential.subject_data, sort_keys=True).encode("utf-8")
        is_sig_valid = verify_credential_signature(
            data_bytes, credential.signature, credential.public_key_pem.encode("utf-8")
        )
        if not is_sig_valid:
            return CredentialVerifyResponse(
                is_valid=False,
                credential_type=credential.credential_type,
                message="Signature verification failed",
            )

    # Audit
    issuer_name = None
    if credential.issuer:
        issuer_name = credential.issuer.name
    elif credential.issuer_id:
        issuer = db.query(CredentialIssuer).filter(
            CredentialIssuer.id == credential.issuer_id
        ).first()
        issuer_name = issuer.name if issuer else None

    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.CREDENTIAL_VERIFY,
        resource_type="credential",
        resource_id=str(credential.id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()

    return CredentialVerifyResponse(
        is_valid=True,
        credential_type=credential.credential_type,
        issuer=issuer_name,
        status=credential.status,
        message="Credential is valid and verified",
    )
