/**
 * DORI Domain Types — strict TypeScript definitions.
 * Mirrors backend Pydantic schemas and database models.
 */

// ─── Enums ──────────────────────────────────────────────
export type UserRole =
  | 'patient'
  | 'asha'
  | 'anm'
  | 'medical_officer'
  | 'district_officer'
  | 'state_admin'
  | 'national_admin'
  | 'referral_facility'
  | 'system_admin';

export type Gender = 'male' | 'female' | 'other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';

export type ConsentStatus = 'active' | 'revoked' | 'expired';
export type ConsentPurpose = 'treatment' | 'referral' | 'emergency' | 'research' | 'public_health';

export type ReferralStatus =
  | 'created' | 'issued' | 'accepted' | 'in_transit'
  | 'arrived' | 'received' | 'completed' | 'cancelled' | 'failed';

export type ReferralPriority = 'routine' | 'urgent' | 'emergency';
export type CareGapSeverity = 'low' | 'medium' | 'high' | 'critical';
export type CareGapStatus = 'detected' | 'alerted' | 'assigned' | 'intervened' | 'resolved' | 'expired';
export type EncounterType =
  | 'consultation' | 'anc_visit' | 'delivery' | 'postnatal'
  | 'immunization' | 'tb_visit' | 'chronic_disease' | 'lab'
  | 'emergency' | 'outreach' | 'follow_up';

export type SyncStatusType = 'online' | 'offline' | 'syncing' | 'synced' | 'sync_failed' | 'pending';

// ─── Auth ───────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// ─── User ───────────────────────────────────────────────
export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  language: string;
  created_at: string;
}

// ─── Facility ───────────────────────────────────────────
export interface Facility {
  id: string;
  name: string;
  facility_type: string;
  code: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  is_active: boolean;
  district_id: string;
}

// ─── Patient ────────────────────────────────────────────
export interface Patient {
  id: string;
  pseudonymous_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: Gender;
  blood_group: BloodGroup;
  phone: string | null;
  email?: string | null;
  village: string | null;
  district_id: string | null;
  facility_id: string | null;
  abha_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PatientCreate {
  full_name: string;
  date_of_birth?: string;
  gender: Gender;
  blood_group?: BloodGroup;
  phone?: string;
  email?: string;
  address?: string;
  village?: string;
  district_id?: string;
  facility_id?: string;
  abha_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  existing_conditions?: string;
  clinical_notes?: string;
}

// ─── MedFed Chest X-Ray AI & Grad-CAM Types ────────────
export interface ChestXRayPrediction {
  finding: string;
  confidence: number;
  percentage: number;
  is_positive: boolean;
}

export interface ChestXRayAnalysisResult {
  model_name: string;
  model_version: string;
  target_nodes: number;
  differential_privacy_epsilon: number;
  findings: ChestXRayPrediction[];
  top_finding: string;
  top_confidence: number;
  original_image_base64: string;
  gradcam_overlay_base64: string;
  explanation_notes: string;
  safety_disclaimer: string;
  status: string;
}

export interface CuratedXRaySample {
  id: string;
  title: string;
  category: string;
  filename: string;
  description: string;
  expected_top: string;
  has_physical_file: boolean;
  thumbnail_base64?: string;
}

export interface ClinicalReviewSubmitPayload {
  patient_id: string;
  referral_id?: string;
  sample_id?: string;
  image_base64?: string;
  gradcam_base64?: string;
  top_finding: string;
  top_confidence: number;
  decision: 'agree' | 'modify' | 'reject';
  clinical_notes: string;
  treatment_plan?: string;
  schedule_follow_up_days?: number;
  findings?: ChestXRayPrediction[];
}


// ─── Care Passport ──────────────────────────────────────
export interface CarePassport {
  id: string;
  patient_id: string;
  pseudonymous_id: string;
  qr_data: string | null;
  issued_at: string;
  expires_at: string | null;
  is_active: boolean;
  version: number;
  emergency_blood_group: string | null;
  emergency_allergies: string | null;
  emergency_medications: string | null;
  emergency_conditions: string | null;
}

// ─── Credential ─────────────────────────────────────────
export interface Credential {
  id: string;
  care_passport_id: string;
  credential_type: string;
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  issued_at: string;
  expires_at: string | null;
  subject_data: Record<string, unknown>;
}

export interface CredentialVerifyResponse {
  is_valid: boolean;
  credential_type: string | null;
  issuer: string | null;
  status: string | null;
  message: string;
}

// ─── Consent ────────────────────────────────────────────
export interface Consent {
  id: string;
  patient_id: string;
  purpose: ConsentPurpose;
  scope: string;
  recipient_id: string | null;
  recipient_facility_id: string | null;
  status: ConsentStatus;
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface ConsentCreate {
  patient_id: string;
  purpose: ConsentPurpose;
  scope: string;
  recipient_id?: string;
  recipient_facility_id?: string;
  expires_at?: string;
}

// ─── Referral ───────────────────────────────────────────
export interface Referral {
  id: string;
  referral_token: string;
  patient_id: string;
  referring_facility_id: string;
  receiving_facility_id: string | null;
  status: ReferralStatus;
  priority: ReferralPriority;
  reason: string;
  clinical_summary: string | null;
  diagnosis: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ReferralCreate {
  patient_id: string;
  receiving_facility_id?: string;
  priority?: ReferralPriority;
  reason: string;
  clinical_summary?: string;
  diagnosis?: string;
}

export interface ReferralEvent {
  id: string;
  referral_id: string;
  from_status: ReferralStatus | null;
  to_status: ReferralStatus;
  actor_id: string;
  notes: string | null;
  created_at: string;
}

// ─── Clinical ───────────────────────────────────────────
export interface Encounter {
  id: string;
  patient_id: string;
  facility_id: string | null;
  provider_id: string | null;
  encounter_type: EncounterType;
  encounter_date: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  vitals: Record<string, unknown> | null;
  anc_visit_number: number | null;
  gestational_weeks: number | null;
  risk_category: string | null;
  created_at: string;
}

export interface EncounterCreate {
  patient_id: string;
  encounter_type: EncounterType;
  encounter_date: string;
  chief_complaint?: string;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
  vitals?: Record<string, unknown>;
  anc_visit_number?: number;
  gestational_weeks?: number;
  expected_delivery_date?: string;
  risk_category?: string;
  tb_treatment_phase?: string;
  tb_treatment_month?: number;
  chronic_condition_type?: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  is_current: boolean;
  start_date: string | null;
  end_date: string | null;
}

// ─── Care Gap ───────────────────────────────────────────
export interface CareGap {
  id: string;
  patient_id: string;
  gap_type: string;
  description: string;
  severity: CareGapSeverity;
  status: CareGapStatus;
  detected_at: string;
  due_date: string | null;
  resolved_at: string | null;
  assigned_worker_id: string | null;
}

export interface Prediction {
  id: string;
  patient_id: string;
  prediction_type: string;
  risk_probability: number;
  threshold: number;
  is_above_threshold: boolean;
  explanation: string | null;
  predicted_at: string;
  disclaimer: string;
}

// ─── Timeline ───────────────────────────────────────────
export interface TimelineEvent {
  id: string;
  event_type: string;
  event_date: string;
  title: string;
  description: string | null;
  facility_name: string | null;
  provider_name: string | null;
  metadata: Record<string, unknown> | null;
}

// ─── Public Health ──────────────────────────────────────
export interface PublicHealthSummary {
  district_id: string | null;
  total_patients: number;
  active_care_gaps: number;
  pending_referrals: number;
  completed_referrals: number;
  active_anomalies: number;
  care_gap_trends: Array<Record<string, unknown>>;
  referral_completion_rate: number;
}

export interface Anomaly {
  id: string;
  anomaly_type: string;
  description: string;
  severity: string;
  indicator_name: string;
  expected_value: string | null;
  observed_value: string | null;
  confidence: number | null;
  detected_at: string;
  is_active: boolean;
}

// ─── Notification ───────────────────────────────────────
export interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Alert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  severity: string;
  created_at: string;
}

// ─── Audit ──────────────────────────────────────────────
export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  result: string;
  created_at: string;
}

// ─── Sync ───────────────────────────────────────────────
export interface SyncStatus {
  device_id: string;
  last_sync_at: string | null;
  pending_count: number;
  status: string;
}

// ─── Federated ──────────────────────────────────────────
export interface FederatedNode {
  id: string;
  node_name: string;
  is_active: boolean;
  last_heartbeat: string | null;
  local_data_count: number;
}

export interface FederatedRound {
  id: string;
  round_number: number;
  status: string;
  participating_nodes: number;
  completed_nodes: number;
  is_simulation: boolean;
  started_at: string | null;
  completed_at: string | null;
}

export interface ModelVersion {
  id: string;
  model_name: string;
  version: string;
  model_type: string;
  is_active: boolean;
  is_simulation: boolean;
  metrics: Record<string, unknown> | null;
  created_at: string;
}

// ─── Emergency ──────────────────────────────────────────
export interface EmergencyAccessRequest {
  patient_id: string;
  reason: string;
}

export interface EmergencyAccessResponse {
  id: string;
  patient_id: string;
  reason: string;
  accessed_at: string;
  emergency_profile: {
    pseudonymous_id: string;
    blood_group: string;
    allergies: string[];
    current_medications: string[];
    chronic_conditions: string[];
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
  };
}
