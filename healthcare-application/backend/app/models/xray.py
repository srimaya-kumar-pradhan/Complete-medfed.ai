"""Chest X-ray and MedFed AI clinical models."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ChestXRayStudy(Base):
    """A chest X-ray image study with MedFed AI analysis and doctor review."""

    __tablename__ = "chest_xray_studies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), index=True
    )
    referral_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("referrals.id"), nullable=True, index=True
    )
    encounter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clinical_encounters.id"), nullable=True
    )

    study_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    image_filename: Mapped[str] = mapped_column(String(255))
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    gradcam_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # MedFed AI outputs
    model_name: Mapped[str] = mapped_column(String(100), default="MedFed Global DenseNet121")
    model_version: Mapped[str] = mapped_column(String(50), default="v1.3")
    predictions: Mapped[list | dict | None] = mapped_column(JSON, nullable=True)
    top_finding: Mapped[str | None] = mapped_column(String(100), nullable=True)
    top_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Doctor review
    review_status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, agreed, modified, rejected
    doctor_decision: Mapped[str | None] = mapped_column(String(100), nullable=True)
    doctor_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    follow_up_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="xray_studies")
    referral: Mapped["Referral | None"] = relationship("Referral")
    reviewed_by: Mapped["User | None"] = relationship("User")
