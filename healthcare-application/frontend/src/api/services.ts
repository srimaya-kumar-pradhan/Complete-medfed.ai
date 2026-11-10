/**
 * Typed API services for all DORI domains.
 * UI components consume these — never raw fetch.
 */
import { api } from './client';
import type {
  TokenResponse,
  LoginRequest,
  User,
  Patient,
  PatientCreate,
  CuratedXRaySample,
  ChestXRayAnalysisResult,
  ClinicalReviewSubmitPayload,
  CarePassport,
  Credential,
  CredentialVerifyResponse,
  Consent,
  ConsentCreate,
  Referral,
  ReferralCreate,
  ReferralEvent,
  Encounter,
  EncounterCreate,
  Medication,
  CareGap,
  Prediction,
  TimelineEvent,
  PublicHealthSummary,
  Anomaly,
  Notification,
  Alert,
  AuditLog,
  SyncStatus,
  FederatedNode,
  FederatedRound,
  ModelVersion,
  EmergencyAccessRequest,
  EmergencyAccessResponse,
  Facility,
  ReferralStatus,
} from '../types';

// ─── Auth ───────────────────────────────────────────────
export const authApi = {
  login: (data: LoginRequest) =>
    api.post<TokenResponse>('/auth/login', data),
  register: (data: Record<string, unknown>) =>
    api.post<User>('/auth/register', data),
  refresh: (refresh_token: string) =>
    api.post<TokenResponse>('/auth/refresh', { refresh_token }),
  me: () => api.get<User>('/auth/me'),
};

// ─── Patients ───────────────────────────────────────────
export const patientApi = {
  list: (params?: { search?: string; facility_id?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.facility_id) query.set('facility_id', params.facility_id);
    if (params?.page) query.set('page', String(params.page));
    return api.get<Patient[]>(`/patients?${query}`);
  },
  get: (id: string) => api.get<Patient>(`/patients/${id}`),
  create: (data: PatientCreate) => api.post<Patient>('/patients', data),
  update: (id: string, data: Partial<Patient>) => api.put<Patient>(`/patients/${id}`, data),
  timeline: (id: string) => api.get<TimelineEvent[]>(`/patients/${id}/timeline`),
  semanticSearch: (query: string) =>
    api.get<Patient[]>(`/patients/search/semantic?query=${encodeURIComponent(query)}`),
};

// ─── Care Passport ──────────────────────────────────────
export const passportApi = {
  issue: (patient_id: string) =>
    api.post<CarePassport>('/care-passports', { patient_id }),
  get: (id: string) => api.get<CarePassport>(`/care-passports/${id}`),
  getByPatient: (patient_id: string) =>
    api.get<CarePassport>(`/care-passports/patient/${patient_id}`),
  credentials: (passport_id: string) =>
    api.get<Credential[]>(`/care-passports/${passport_id}/credentials`),
  verifyCredential: (credential_id: string) =>
    api.post<CredentialVerifyResponse>('/care-passports/credentials/verify', { credential_id }),
};

// ─── Consent ────────────────────────────────────────────
export const consentApi = {
  list: (patient_id?: string) => {
    const query = patient_id ? `?patient_id=${patient_id}` : '';
    return api.get<Consent[]>(`/consents${query}`);
  },
  get: (id: string) => api.get<Consent>(`/consents/${id}`),
  create: (data: ConsentCreate) => api.post<Consent>('/consents', data),
  revoke: (id: string, reason?: string) =>
    api.post<Consent>(`/consents/${id}/revoke`, { reason }),
};

// ─── Emergency ──────────────────────────────────────────
export const emergencyApi = {
  requestAccess: (data: EmergencyAccessRequest) =>
    api.post<EmergencyAccessResponse>('/emergency-access', data),
};

// ─── Referrals ──────────────────────────────────────────
export const referralApi = {
  list: (params?: { status?: ReferralStatus; patient_id?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.patient_id) query.set('patient_id', params.patient_id);
    if (params?.page) query.set('page', String(params.page));
    return api.get<Referral[]>(`/referrals?${query}`);
  },
  get: (id: string) => api.get<Referral>(`/referrals/${id}`),
  create: (data: ReferralCreate) => api.post<Referral>('/referrals', data),
  updateStatus: (id: string, status: ReferralStatus, notes?: string) =>
    api.put<Referral>(`/referrals/${id}/status`, { status, notes }),
  events: (id: string) => api.get<ReferralEvent[]>(`/referrals/${id}/events`),
};

// ─── Clinical ───────────────────────────────────────────
export const encounterApi = {
  list: (patient_id?: string) => {
    const query = patient_id ? `?patient_id=${patient_id}` : '';
    return api.get<Encounter[]>(`/encounters${query}`);
  },
  get: (id: string) => api.get<Encounter>(`/encounters/${id}`),
  create: (data: EncounterCreate) => api.post<Encounter>('/encounters', data),
  medications: (patient_id: string) =>
    api.get<Medication[]>(`/encounters/medications/${patient_id}`),
  createMedication: (data: Record<string, unknown>) =>
    api.post<Medication>('/encounters/medications', data),
};

// ─── Care Gaps ──────────────────────────────────────────
export const careGapApi = {
  list: (params?: { patient_id?: string; status?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.patient_id) query.set('patient_id', params.patient_id);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    return api.get<CareGap[]>(`/care-gaps?${query}`);
  },
  get: (id: string) => api.get<CareGap>(`/care-gaps/${id}`),
  predict: (patient_id: string, prediction_type = 'anc_dropout_risk') =>
    api.post<Prediction>('/care-gaps/predictions', { patient_id, prediction_type }),
};

// ─── Public Health ──────────────────────────────────────
export const publicHealthApi = {
  summary: (district_id?: string) => {
    const query = district_id ? `?district_id=${district_id}` : '';
    return api.get<PublicHealthSummary>(`/public-health/summary${query}`);
  },
  anomalies: (district_id?: string) => {
    const query = district_id ? `?district_id=${district_id}` : '';
    return api.get<Anomaly[]>(`/public-health/anomalies${query}`);
  },
  trends: (district_id?: string) => {
    const query = district_id ? `?district_id=${district_id}` : '';
    return api.get<Record<string, unknown>>(`/public-health/trends${query}`);
  },
};

// ─── Federated ──────────────────────────────────────────
export const federatedApi = {
  nodes: () => api.get<FederatedNode[]>('/federated/nodes'),
  rounds: () => api.get<FederatedRound[]>('/federated/rounds'),
  models: () => api.get<ModelVersion[]>('/federated/models'),
};

// ─── Sync ───────────────────────────────────────────────
export const syncApi = {
  push: (device_id: string, records: unknown[]) =>
    api.post('/sync/push', { device_id, records }),
  pull: (device_id: string, last_sync_at?: string, entity_types?: string[]) =>
    api.post('/sync/pull', { device_id, last_sync_at, entity_types }),
  status: (device_id: string) =>
    api.get<SyncStatus>(`/sync/status?device_id=${device_id}`),
};

// ─── Audit ──────────────────────────────────────────────
export const auditApi = {
  list: (params?: { action?: string; resource_type?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.resource_type) query.set('resource_type', params.resource_type);
    if (params?.page) query.set('page', String(params.page));
    return api.get<AuditLog[]>(`/audit-logs?${query}`);
  },
};

// ─── MedFed Chest X-Ray AI & ML Inference ─────────────
export const mlApi = {
  status: () =>
    api.get<{
      available: boolean;
      model_name: string;
      model_version: string;
      device: string;
      classes: string[];
      num_classes: number;
      checkpoint_metadata: Record<string, unknown>;
      error?: string;
    }>('/ml/status'),
  classes: () =>
    api.get<{
      classes: string[];
      num_classes: number;
      task: string;
      reference_standard: string;
    }>('/ml/classes'),
  predict: (data: {
    image_base64?: string;
    sample_id?: string;
    target_class?: string;
    patient_id?: string;
    generate_gradcam?: boolean;
  }) =>
    api.post<{
      request_id: string;
      model_name: string;
      model_version: string;
      device: string;
      prediction: { labels: string[]; scores: number[] };
      findings: Array<{ finding: string; confidence: number; percentage: number; is_positive: boolean }>;
      top_finding: string;
      top_confidence: number;
      explainability: {
        method: string;
        available: boolean;
        target_layer?: string;
        explained_class?: string;
        visualization?: string;
      };
      status: string;
      requires_clinician_review: boolean;
      safety_disclaimer: string;
      patient_id?: string;
    }>('/ml/predict', data),
};

export const xrayApi = {
  getSamples: () => api.get<CuratedXRaySample[]>('/xray/samples'),
  predict: (data: { sample_id?: string; image_base64?: string; patient_id?: string }) =>
    api.post<ChestXRayAnalysisResult>('/xray/predict', data),
  submitReview: (data: ClinicalReviewSubmitPayload) =>
    api.post<{ status: string; study_id: string; decision: string; follow_up_scheduled?: string; referral_event_created?: boolean }>('/xray/reviews', data),
  getStudies: (patientId: string) =>
    api.get<Array<{
      id: string;
      patient_id: string;
      referral_id?: string;
      top_finding: string;
      top_confidence: number;
      findings: Array<{ finding: string; confidence: number; percentage: number }>;
      doctor_decision: string;
      doctor_notes?: string;
      treatment_plan?: string;
      has_gradcam: boolean;
      created_at: string;
    }>>(`/xray/studies/${patientId}`),
};

// ─── Notifications & Email ──────────────────────────────
export const notificationApi = {
  list: () => api.get<Notification[]>('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  alerts: () => api.get<Alert[]>('/notifications/alerts'),
  sendEmail: (data: {
    recipient_email: string;
    template_type: string;
    patient_name: string;
    details?: Record<string, string>;
  }) => api.post<{ success: boolean; message: string; recipient: string; simulation?: boolean }>('/notifications/email', data),
};

// ─── Admin ──────────────────────────────────────────────
export const adminApi = {
  users: (role?: string) => {
    const query = role ? `?role=${role}` : '';
    return api.get<User[]>(`/admin/users${query}`);
  },
  createUser: (data: Record<string, unknown>) =>
    api.post<User>('/admin/users', data),
  updateUser: (id: string, data: Record<string, unknown>) =>
    api.put<User>(`/admin/users/${id}`, data),
  facilities: (district_id?: string) => {
    const query = district_id ? `?district_id=${district_id}` : '';
    return api.get<Facility[]>(`/admin/facilities${query}`);
  },
  createFacility: (data: Record<string, unknown>) =>
    api.post<Facility>('/admin/facilities', data),
  districts: () => api.get<Array<Record<string, string>>>('/admin/districts'),
  states: () => api.get<Array<Record<string, string>>>('/admin/states'),
  storageStatus: () =>
    api.get<{
      status: string;
      patients_stored: number;
      clinical_records_stored: number;
      vector_index_records: number;
      engine: string;
      last_indexed_at: string;
      notice: string;
    }>('/admin/storage-status'),
  resetDemo: () =>
    api.post<{
      status: string;
      message: string;
      seeded_patient_id: string;
      seeded_referral_id: string;
      timestamp: string;
    }>('/admin/reset-demo', {}),
};

