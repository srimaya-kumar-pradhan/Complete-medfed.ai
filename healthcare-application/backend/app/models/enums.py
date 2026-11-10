"""Enumerations used across the domain model."""
from __future__ import annotations

import enum


class UserRole(str, enum.Enum):
    """System user roles for RBAC."""

    PATIENT = "patient"
    ASHA = "asha"
    ANM = "anm"
    MEDICAL_OFFICER = "medical_officer"
    DISTRICT_OFFICER = "district_officer"
    STATE_ADMIN = "state_admin"
    NATIONAL_ADMIN = "national_admin"
    REFERRAL_FACILITY = "referral_facility"
    SYSTEM_ADMIN = "system_admin"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class BloodGroup(str, enum.Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"
    UNKNOWN = "unknown"


class ConsentStatus(str, enum.Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"


class ConsentPurpose(str, enum.Enum):
    TREATMENT = "treatment"
    REFERRAL = "referral"
    EMERGENCY = "emergency"
    RESEARCH = "research"
    PUBLIC_HEALTH = "public_health"


class ReferralStatus(str, enum.Enum):
    CREATED = "created"
    ISSUED = "issued"
    ACCEPTED = "accepted"
    IN_TRANSIT = "in_transit"
    ARRIVED = "arrived"
    RECEIVED = "received"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class ReferralPriority(str, enum.Enum):
    ROUTINE = "routine"
    URGENT = "urgent"
    EMERGENCY = "emergency"


class EncounterType(str, enum.Enum):
    CONSULTATION = "consultation"
    ANC_VISIT = "anc_visit"
    DELIVERY = "delivery"
    POSTNATAL = "postnatal"
    IMMUNIZATION = "immunization"
    TB_VISIT = "tb_visit"
    CHRONIC_DISEASE = "chronic_disease"
    LAB = "lab"
    EMERGENCY = "emergency"
    OUTREACH = "outreach"
    FOLLOW_UP = "follow_up"


class CareGapSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CareGapStatus(str, enum.Enum):
    DETECTED = "detected"
    ALERTED = "alerted"
    ASSIGNED = "assigned"
    INTERVENED = "intervened"
    RESOLVED = "resolved"
    EXPIRED = "expired"


class SyncStatus(str, enum.Enum):
    PENDING = "pending"
    SYNCING = "syncing"
    SYNCED = "synced"
    FAILED = "failed"
    CONFLICT = "conflict"


class SyncPriority(int, enum.Enum):
    URGENT_ALERT = 1
    CONSENT = 2
    CLINICAL = 3
    ANALYTICS = 4


class FacilityType(str, enum.Enum):
    SUB_CENTRE = "sub_centre"
    PHC = "phc"
    CHC = "chc"
    DISTRICT_HOSPITAL = "district_hospital"
    STATE_HOSPITAL = "state_hospital"
    PRIVATE = "private"


class AlertType(str, enum.Enum):
    CARE_GAP = "care_gap"
    REFERRAL = "referral"
    EMERGENCY = "emergency"
    OUTBREAK = "outbreak"
    SYSTEM = "system"
    TASK = "task"


class TrainingStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    AGGREGATED = "aggregated"


class CredentialStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    SUSPENDED = "suspended"


class NotificationType(str, enum.Enum):
    IN_APP = "in_app"
    SMS = "sms"
    VOICE = "voice"
    PUSH = "push"


class AuditAction(str, enum.Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PATIENT_LOOKUP = "patient_lookup"
    PATIENT_CREATE = "patient_create"
    CREDENTIAL_VERIFY = "credential_verify"
    CREDENTIAL_ISSUE = "credential_issue"
    CONSENT_CREATE = "consent_create"
    CONSENT_REVOKE = "consent_revoke"
    CLINICAL_ACCESS = "clinical_access"
    CLINICAL_CREATE = "clinical_create"
    EMERGENCY_ACCESS = "emergency_access"
    REFERRAL_CREATE = "referral_create"
    REFERRAL_UPDATE = "referral_update"
    ADMIN_CHANGE = "admin_change"
    MODEL_DEPLOY = "model_deploy"
    FEDERATED_ACTIVITY = "federated_activity"
    SYNC_PUSH = "sync_push"
    SYNC_PULL = "sync_pull"
