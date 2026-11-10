"""Referral lifecycle models."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
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
from app.models.enums import ReferralPriority, ReferralStatus


class Referral(Base):
    """A patient referral between facilities."""

    __tablename__ = "referrals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    referral_token: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), index=True
    )
    referring_facility_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("facilities.id")
    )
    receiving_facility_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=True
    )
    referred_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    consent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consents.id"), nullable=True
    )
    status: Mapped[ReferralStatus] = mapped_column(
        Enum(ReferralStatus), default=ReferralStatus.CREATED, index=True
    )
    priority: Mapped[ReferralPriority] = mapped_column(
        Enum(ReferralPriority), default=ReferralPriority.ROUTINE
    )
    reason: Mapped[str] = mapped_column(Text)
    clinical_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="referrals_as_patient")
    events: Mapped[list[ReferralEvent]] = relationship(
        "ReferralEvent", back_populates="referral", order_by="ReferralEvent.created_at"
    )


class ReferralEvent(Base):
    """An event in the referral lifecycle (audit trail)."""

    __tablename__ = "referral_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    referral_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("referrals.id"), index=True
    )
    from_status: Mapped[ReferralStatus | None] = mapped_column(
        Enum(ReferralStatus), nullable=True
    )
    to_status: Mapped[ReferralStatus] = mapped_column(Enum(ReferralStatus))
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    referral: Mapped[Referral] = relationship("Referral", back_populates="events")
