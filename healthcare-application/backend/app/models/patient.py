"""Patient, Care Passport, and Credential models."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    JSON,
    LargeBinary,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import BloodGroup, CredentialStatus, Gender


class Patient(Base):
    """Patient demographic and identity record."""

    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=True
    )
    pseudonymous_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    date_of_birth: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    gender: Mapped[Gender] = mapped_column(Enum(Gender))
    blood_group: Mapped[BloodGroup] = mapped_column(
        Enum(BloodGroup), default=BloodGroup.UNKNOWN
    )
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    village: Mapped[str | None] = mapped_column(String(255), nullable=True)
    district_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("districts.id"), nullable=True
    )
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=True
    )
    abha_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships
    user: Mapped["User | None"] = relationship("User", back_populates="patient_profile")
    care_passport: Mapped[CarePassport | None] = relationship(
        "CarePassport", back_populates="patient", uselist=False
    )
    encounters: Mapped[list["ClinicalEncounter"]] = relationship(
        "ClinicalEncounter", back_populates="patient"
    )
    medications: Mapped[list["Medication"]] = relationship(
        "Medication", back_populates="patient"
    )
    allergies: Mapped[list["Allergy"]] = relationship(
        "Allergy", back_populates="patient"
    )
    immunizations: Mapped[list["Immunization"]] = relationship(
        "Immunization", back_populates="patient"
    )
    lab_results: Mapped[list["LabResult"]] = relationship(
        "LabResult", back_populates="patient"
    )
    care_gaps: Mapped[list["CareGap"]] = relationship(
        "CareGap", back_populates="patient"
    )
    referrals_as_patient: Mapped[list["Referral"]] = relationship(
        "Referral", back_populates="patient"
    )
    consents: Mapped[list["Consent"]] = relationship(
        "Consent", back_populates="patient"
    )
    xray_studies: Mapped[list["ChestXRayStudy"]] = relationship(
        "ChestXRayStudy", back_populates="patient"
    )


class CarePassport(Base):
    """Care Passport — patient-controlled health credential carrier."""

    __tablename__ = "care_passports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), unique=True
    )
    pseudonymous_id: Mapped[str] = mapped_column(String(50), index=True)
    qr_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(default=1)

    # Emergency summary (minimal data, NOT full clinical record)
    emergency_blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    emergency_allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    emergency_medications: Mapped[str | None] = mapped_column(Text, nullable=True)
    emergency_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)

    patient: Mapped[Patient] = relationship("Patient", back_populates="care_passport")
    credentials: Mapped[list[Credential]] = relationship(
        "Credential", back_populates="care_passport"
    )


class Credential(Base):
    """Signed verifiable credential attached to a Care Passport."""

    __tablename__ = "credentials"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    care_passport_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("care_passports.id")
    )
    credential_type: Mapped[str] = mapped_column(String(100))
    issuer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("credential_issuers.id"), nullable=True
    )
    subject_data: Mapped[dict] = mapped_column(JSON, default=dict)
    signature: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    public_key_pem: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[CredentialStatus] = mapped_column(
        Enum(CredentialStatus), default=CredentialStatus.ACTIVE
    )
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    care_passport: Mapped[CarePassport] = relationship(
        "CarePassport", back_populates="credentials"
    )
    issuer: Mapped[CredentialIssuer | None] = relationship("CredentialIssuer")


class CredentialIssuer(Base):
    """Entity that issues credentials (facility, authority)."""

    __tablename__ = "credential_issuers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255))
    issuer_type: Mapped[str] = mapped_column(String(100))
    public_key_pem: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


# Forward references
from app.models.clinical import ClinicalEncounter, Medication, Allergy, Immunization, LabResult  # noqa: E402
from app.models.care_gap import CareGap  # noqa: E402
from app.models.referral import Referral  # noqa: E402
from app.models.consent import Consent  # noqa: E402
