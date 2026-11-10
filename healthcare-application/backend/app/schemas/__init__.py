"""Pydantic schemas for API request/response validation."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import (
    BloodGroup,
    CareGapSeverity,
    CareGapStatus,
    ConsentPurpose,
    ConsentStatus,
    CredentialStatus,
    EncounterType,
    Gender,
    ReferralPriority,
    ReferralStatus,
    UserRole,
)


# ─── Auth ────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


# ─── User ────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    email: str | None = None
    phone: str | None = None
    role: UserRole
    language: str = "en"
    facility_ids: list[uuid.UUID] = []
    assigned_district_id: uuid.UUID | None = None
    assigned_state_id: uuid.UUID | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    full_name: str
    email: str | None
    phone: str | None
    role: UserRole
    is_active: bool
    language: str
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    language: str | None = None
    is_active: bool | None = None


# ─── Facility ────────────────────────────────────────────────────────
class FacilityCreate(BaseModel):
    name: str
    facility_type: str
    code: str
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    district_id: uuid.UUID


class FacilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    facility_type: str
    code: str
    address: str | None
    latitude: float | None
    longitude: float | None
    phone: str | None
    is_active: bool
    district_id: uuid.UUID


# ─── Patient ─────────────────────────────────────────────────────────
class PatientCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    date_of_birth: datetime | None = None
    gender: Gender
    blood_group: BloodGroup = BloodGroup.UNKNOWN
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    village: str | None = None
    district_id: uuid.UUID | None = None
    facility_id: uuid.UUID | None = None
    abha_id: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    existing_conditions: str | None = None
    clinical_notes: str | None = None

    @field_validator("district_id", "facility_id", mode="before")
    @classmethod
    def parse_optional_uuid(cls, v):
        if not v:
            return None
        if isinstance(v, uuid.UUID):
            return v
        try:
            return uuid.UUID(str(v))
        except (ValueError, AttributeError):
            return None


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pseudonymous_id: str
    full_name: str
    date_of_birth: datetime | None
    gender: Gender
    blood_group: BloodGroup
    phone: str | None
    email: str | None = None
    village: str | None
    district_id: uuid.UUID | None
    facility_id: uuid.UUID | None
    abha_id: str | None
    is_active: bool
    created_at: datetime


class PatientUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    address: str | None = None
    village: str | None = None
    blood_group: BloodGroup | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None


# ─── Care Passport ───────────────────────────────────────────────────
class CarePassportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    pseudonymous_id: str
    qr_data: str | None
    issued_at: datetime
    expires_at: datetime | None
    is_active: bool
    version: int
    emergency_blood_group: str | None
    emergency_allergies: str | None
    emergency_medications: str | None
    emergency_conditions: str | None


class CarePassportIssueRequest(BaseModel):
    patient_id: uuid.UUID


# ─── Credential ──────────────────────────────────────────────────────
class CredentialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    care_passport_id: uuid.UUID
    credential_type: str
    status: CredentialStatus
    issued_at: datetime
    expires_at: datetime | None
    subject_data: dict


class CredentialVerifyRequest(BaseModel):
    credential_id: uuid.UUID


class CredentialVerifyResponse(BaseModel):
    is_valid: bool
    credential_type: str | None = None
    issuer: str | None = None
    status: CredentialStatus | None = None
    message: str


# ─── Consent ─────────────────────────────────────────────────────────
class ConsentCreate(BaseModel):
    patient_id: uuid.UUID
    purpose: ConsentPurpose
    scope: str
    recipient_id: uuid.UUID | None = None
    recipient_facility_id: uuid.UUID | None = None
    expires_at: datetime | None = None


class ConsentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    purpose: ConsentPurpose
    scope: str
    recipient_id: uuid.UUID | None
    recipient_facility_id: uuid.UUID | None
    status: ConsentStatus
    granted_at: datetime
    expires_at: datetime | None
    revoked_at: datetime | None


class ConsentRevokeRequest(BaseModel):
    reason: str | None = None


# ─── Emergency ───────────────────────────────────────────────────────
class EmergencyAccessRequest(BaseModel):
    patient_id: uuid.UUID
    reason: str = Field(min_length=10)


class EmergencyAccessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    reason: str
    accessed_at: datetime
    emergency_profile: dict


# ─── Referral ────────────────────────────────────────────────────────
class ReferralCreate(BaseModel):
    patient_id: uuid.UUID
    receiving_facility_id: uuid.UUID | None = None
    priority: ReferralPriority = ReferralPriority.ROUTINE
    reason: str
    clinical_summary: str | None = None
    diagnosis: str | None = None


class ReferralResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    referral_token: str
    patient_id: uuid.UUID
    referring_facility_id: uuid.UUID
    receiving_facility_id: uuid.UUID | None
    status: ReferralStatus
    priority: ReferralPriority
    reason: str
    clinical_summary: str | None
    diagnosis: str | None
    created_at: datetime
    completed_at: datetime | None


class ReferralStatusUpdate(BaseModel):
    status: ReferralStatus
    notes: str | None = None


class ReferralEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    referral_id: uuid.UUID
    from_status: ReferralStatus | None
    to_status: ReferralStatus
    actor_id: uuid.UUID
    notes: str | None
    created_at: datetime


# ─── Clinical ────────────────────────────────────────────────────────
class EncounterCreate(BaseModel):
    patient_id: uuid.UUID
    encounter_type: EncounterType
    encounter_date: datetime
    chief_complaint: str | None = None
    diagnosis: str | None = None
    diagnosis_code: str | None = None
    treatment_plan: str | None = None
    notes: str | None = None
    vitals: dict | None = None
    anc_visit_number: int | None = None
    gestational_weeks: int | None = None
    expected_delivery_date: datetime | None = None
    risk_category: str | None = None
    tb_treatment_phase: str | None = None
    tb_treatment_month: int | None = None
    chronic_condition_type: str | None = None


class EncounterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    facility_id: uuid.UUID | None
    provider_id: uuid.UUID | None
    encounter_type: EncounterType
    encounter_date: datetime
    chief_complaint: str | None
    diagnosis: str | None
    treatment_plan: str | None
    vitals: dict | None
    anc_visit_number: int | None
    gestational_weeks: int | None
    risk_category: str | None
    created_at: datetime


class MedicationCreate(BaseModel):
    patient_id: uuid.UUID
    name: str
    dosage: str | None = None
    frequency: str | None = None
    route: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class MedicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    name: str
    dosage: str | None
    frequency: str | None
    is_current: bool
    start_date: datetime | None
    end_date: datetime | None


# ─── Care Gap ────────────────────────────────────────────────────────
class CareGapResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    gap_type: str
    description: str
    severity: CareGapSeverity
    status: CareGapStatus
    detected_at: datetime
    due_date: datetime | None
    resolved_at: datetime | None
    assigned_worker_id: uuid.UUID | None


class PredictionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    prediction_type: str
    risk_probability: float
    threshold: float
    is_above_threshold: bool
    explanation: str | None
    predicted_at: datetime
    # DECISION SUPPORT ONLY label
    disclaimer: str = "This is decision support only. Clinical decisions remain the responsibility of the treating clinician."


class PredictionRequest(BaseModel):
    patient_id: uuid.UUID
    prediction_type: str = "anc_dropout_risk"


# ─── Sync ────────────────────────────────────────────────────────────
class SyncPushRequest(BaseModel):
    device_id: uuid.UUID
    records: list[dict]


class SyncPushResponse(BaseModel):
    accepted: int
    rejected: int
    conflicts: list[dict] = []


class SyncPullRequest(BaseModel):
    device_id: uuid.UUID
    last_sync_at: datetime | None = None
    entity_types: list[str] = []


class SyncPullResponse(BaseModel):
    records: list[dict]
    sync_timestamp: datetime


class SyncStatusResponse(BaseModel):
    device_id: uuid.UUID
    last_sync_at: datetime | None
    pending_count: int
    status: str


# ─── Audit ───────────────────────────────────────────────────────────
class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_id: uuid.UUID | None
    action: str
    resource_type: str
    resource_id: str | None
    result: str
    created_at: datetime


# ─── Public Health ───────────────────────────────────────────────────
class PublicHealthSummary(BaseModel):
    district_id: uuid.UUID | None = None
    total_patients: int = 0
    active_care_gaps: int = 0
    pending_referrals: int = 0
    completed_referrals: int = 0
    active_anomalies: int = 0
    care_gap_trends: list[dict] = []
    referral_completion_rate: float = 0.0


class AnomalyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    anomaly_type: str
    description: str
    severity: str
    indicator_name: str
    expected_value: str | None
    observed_value: str | None
    confidence: float | None
    detected_at: datetime
    is_active: bool


# ─── Notification ────────────────────────────────────────────────────
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime


# ─── Federated ───────────────────────────────────────────────────────
class FederatedNodeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    node_name: str
    is_active: bool
    last_heartbeat: datetime | None
    local_data_count: int


class FederatedRoundResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    round_number: int
    status: str
    participating_nodes: int
    completed_nodes: int
    is_simulation: bool
    started_at: datetime | None
    completed_at: datetime | None


class ModelVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    model_name: str
    version: str
    model_type: str
    is_active: bool
    is_simulation: bool
    metrics: dict | None
    created_at: datetime


# ─── Common ──────────────────────────────────────────────────────────
class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int


class ErrorResponse(BaseModel):
    detail: str
    error_code: str | None = None


class TimelineEvent(BaseModel):
    id: uuid.UUID
    event_type: str
    event_date: datetime
    title: str
    description: str | None = None
    facility_name: str | None = None
    provider_name: str | None = None
    metadata: dict | None = None
