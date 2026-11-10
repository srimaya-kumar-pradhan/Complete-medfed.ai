"""Clinical encounter, medication, allergy, immunization, lab result models."""
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
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EncounterType


class ClinicalEncounter(Base):
    """A clinical encounter / visit."""

    __tablename__ = "clinical_encounters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), index=True
    )
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=True
    )
    provider_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    encounter_type: Mapped[EncounterType] = mapped_column(Enum(EncounterType))
    encounter_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    chief_complaint: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    treatment_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    vitals: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # ANC-specific fields
    anc_visit_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gestational_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expected_delivery_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    risk_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # TB-specific fields
    tb_treatment_phase: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tb_treatment_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Chronic disease fields
    chronic_condition_type: Mapped[str | None] = mapped_column(String(100), nullable=True)

    is_offline_created: Mapped[bool] = mapped_column(Boolean, default=False)
    sync_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="encounters")


class Medication(Base):
    """Patient medication record."""

    __tablename__ = "medications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), index=True
    )
    encounter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clinical_encounters.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255))
    dosage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    route: Mapped[str | None] = mapped_column(String(50), nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    prescribed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="medications")


class Allergy(Base):
    """Patient allergy record."""

    __tablename__ = "allergies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), index=True
    )
    allergen: Mapped[str] = mapped_column(String(255))
    reaction: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="allergies")


class Immunization(Base):
    """Patient immunization record."""

    __tablename__ = "immunizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), index=True
    )
    vaccine_name: Mapped[str] = mapped_column(String(255))
    dose_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    administered_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    next_due_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=True
    )
    administered_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="immunizations")


class LabResult(Base):
    """Patient laboratory result."""

    __tablename__ = "lab_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), index=True
    )
    encounter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clinical_encounters.id"), nullable=True
    )
    test_name: Mapped[str] = mapped_column(String(255))
    test_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    result_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    result_unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_abnormal: Mapped[bool] = mapped_column(Boolean, default=False)
    test_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    reported_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="lab_results")
