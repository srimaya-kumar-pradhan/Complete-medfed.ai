"""Consent and emergency access models."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import ConsentPurpose, ConsentStatus


class Consent(Base):
    """Patient consent record for data sharing."""

    __tablename__ = "consents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), index=True
    )
    purpose: Mapped[ConsentPurpose] = mapped_column(Enum(ConsentPurpose))
    scope: Mapped[str] = mapped_column(Text)  # e.g., "clinical_summary,medications,allergies"
    recipient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    recipient_facility_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=True
    )
    status: Mapped[ConsentStatus] = mapped_column(
        Enum(ConsentStatus), default=ConsentStatus.ACTIVE
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revocation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="consents")


class EmergencyAccessEvent(Base):
    """Record of emergency break-glass access to patient data."""

    __tablename__ = "emergency_access_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), index=True
    )
    accessor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=True
    )
    reason: Mapped[str] = mapped_column(Text)
    data_accessed: Mapped[str] = mapped_column(Text)  # what was disclosed
    accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    notification_sent: Mapped[bool] = mapped_column(Boolean, default=False)
