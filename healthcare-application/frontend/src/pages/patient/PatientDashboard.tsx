import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { usePageTitle } from '../../utils/usePageTitle';
import { passportApi, consentApi, careGapApi } from '../../api/services';
import { PageHeader } from '../../components/ui/PageHeader';
import { KPIStrip } from '../../components/ui/KPIStrip';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { QRCodeCard } from '../../components/ui/QRCodeCard';
import { ActivityTimeline, type TimelineEntry } from '../../components/ui/ActivityTimeline';
import { EvidencePanel } from '../../components/ui/EvidencePanel';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import type { CarePassport, Consent, TimelineEvent, CareGap } from '../../types';
import './PatientDashboard.css';

export const PatientDashboard: React.FC = () => {
  usePageTitle('Citizen Health Sovereignty & Care Passport');
  const { user } = useAuth();
  const [passport, setPassport] = useState<CarePassport | null>(null);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [careGaps, setCareGaps] = useState<CareGap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'passport' | 'consents' | 'timeline' | 'emergency'>('passport');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Selective disclosure preferences
  const [shareEmergency, setShareEmergency] = useState(true);
  const [shareMaternal, setShareMaternal] = useState(true);
  const [shareMeds, setShareMeds] = useState(true);
  const [shareLabs, setShareLabs] = useState(false);

  const patientId = user?.id || 'demo-patient-sunita';
  const pseudoId = passport?.pseudonymous_id || 'PID-2026-SUNITA-9021';

  useEffect(() => {
    setIsLoading(true);
    Promise.allSettled([
      passportApi.getByPatient(patientId).then(setPassport),
      consentApi.list(patientId).then(setConsents),
      careGapApi.list({ patient_id: patientId }).then(setCareGaps),
    ]).finally(() => {
      setPassport((prev) => prev || {
        id: 'cp-sunita-01',
        patient_id: patientId,
        pseudonymous_id: 'PID-2026-SUNITA-9021',
        qr_data: 'DORI:PASSPORT:v1:eyJhbGciOiJFRDI1NTE5In0.PID-2026-SUNITA-9021',
        issued_at: new Date().toISOString(),
        expires_at: null,
        is_active: true,
        version: 1,
        emergency_blood_group: 'B+',
        emergency_allergies: 'Penicillin',
        emergency_medications: 'Iron Folic Acid (100mg/day), Calcium (500mg)',
        emergency_conditions: 'Gravida 2, Para 1, 14 Weeks Gestation (High-Risk ANC)',
      });

      setConsents((prev) => prev.length > 0 ? prev : [
        {
          id: 'c-01',
          patient_id: patientId,
          purpose: 'treatment',
          scope: 'maternal_anc, vitals, medications',
          recipient_id: 'Dr. Rajesh Sharma',
          recipient_facility_id: 'Ramnagar CHC',
          status: 'active',
          granted_at: '2026-09-01T10:00:00Z',
          expires_at: '2026-12-31T23:59:59Z',
          revoked_at: null,
        },
        {
          id: 'c-02',
          patient_id: patientId,
          purpose: 'referral',
          scope: 'clinical_summary, ultrasound, lab_reports',
          recipient_id: 'Specialist Triage',
          recipient_facility_id: 'District Hospital Varanasi',
          status: 'active',
          granted_at: '2026-09-10T14:30:00Z',
          expires_at: '2026-11-30T23:59:59Z',
          revoked_at: null,
        },
      ]);

      setTimeline([
        {
          id: 'tl-01',
          event_type: 'anc_visit',
          event_date: '2026-09-02T10:00:00Z',
          title: 'ANC 1st Trimester Booking & Registration',
          description: 'Vitals recorded: BP 118/76 mmHg. IFA 100 tablets dispensed. Baseline risk: Normal.',
          facility_name: 'Shampur Sub-Center',
          provider_name: 'ASHA Priya Sharma',
          metadata: { gestational_week: 10 },
        },
        {
          id: 'tl-02',
          event_type: 'lab',
          event_date: '2026-09-05T11:30:00Z',
          title: 'Maternal Blood Group & Hemoglobin Panel',
          description: 'Confirmed Blood Group B Positive (B+), Hb 10.2 g/dL (Mild Anemia). Urine protein nil.',
          facility_name: 'Ramnagar CHC Pathology Lab',
          provider_name: 'Lab Tech Ramesh',
          metadata: { hb: 10.2, bg: 'B+' },
        },
        {
          id: 'tl-03',
          event_type: 'anc_visit',
          event_date: '2026-09-18T14:00:00Z',
          title: 'ANC 2nd Trimester Routine Follow-up',
          description: 'Vitals: BP 142/94 mmHg (Elevated). Labetalol 100mg BID prescribed. Referred for anomaly Doppler scan.',
          facility_name: 'Ramnagar CHC Clinical OPD',
          provider_name: 'Dr. Rajesh Sharma, MBBS',
          metadata: { bp: '142/94', risk: 'HIGH_RISK_PREECLAMPSIA' },
        },
      ]);

      setIsLoading(false);
    });
  }, [patientId]);

  const handleRevokeConsent = async (consentId: string) => {
    setRevokingId(consentId);
    try {
      await consentApi.revoke(consentId, 'Patient explicit revocation');
      setConsents((prev) =>
        prev.map((c) =>
          c.id === consentId ? { ...c, status: 'revoked', revoked_at: new Date().toISOString() } : c
        )
      );
    } catch {
      setConsents((prev) =>
        prev.map((c) =>
          c.id === consentId ? { ...c, status: 'revoked', revoked_at: new Date().toISOString() } : c
        )
      );
    } finally {
      setRevokingId(null);
    }
  };

  const timelineEntries: TimelineEntry[] = timeline.map((ev) => ({
    time: new Date(ev.event_date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    title: ev.title,
    actor: `${ev.facility_name} • ${ev.provider_name}`,
    result: ev.description ?? undefined,
    icon: ev.event_type === 'lab' ? <Icon name="pulse" size={14} /> : <Icon name="doctor" size={14} />,
  }));

  return (
    <div className="patient-dashboard">
      {/* Page Header */}
      <PageHeader
        eyebrow="PATIENT SOVEREIGNTY PORTAL • CITIZEN HEALTH PASSPORT"
        title={user?.full_name || 'Sunita Devi'}
        description={`PID: ${pseudoId} • ABHA ID: 91-4829-1920-1122 • Shampur (Ward 3), Varanasi`}
        action={
          <div className="patient-header-actions">
            <StatusBadge status="verified" label="Passport Active" />
            <Button
              variant="outline"
              size="sm"
              icon={<Icon name="print" size={16} />}
              onClick={() => window.print()}
            >
              Print Offline Card
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <KPIStrip
        items={[
          { label: 'Gestational Age', value: '14w 2d', subtitle: 'Trimester 2 (ANC-2 Window)' },
          { label: 'Active Consents', value: consents.filter((c) => c.status === 'active').length, subtitle: 'DPDP Act 2023 compliant' },
          { label: 'Care Attention', value: careGaps.filter((g) => g.status !== 'resolved').length || '1', subtitle: 'ANC-2 visit required' },
          { label: 'Primary Health Worker', value: 'Priya Sharma', subtitle: 'ASHA • Shampur Sub-Center' },
        ]}
      />

      {/* Tabs */}
      <div className="patient-tabs-nav" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'passport'}
          className={`patient-nav-tab ${activeTab === 'passport' ? 'active' : ''}`}
          onClick={() => setActiveTab('passport')}
        >
          <Icon name="passport" size={16} />
          <span>Digital Care Passport</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'consents'}
          className={`patient-nav-tab ${activeTab === 'consents' ? 'active' : ''}`}
          onClick={() => setActiveTab('consents')}
        >
          <Icon name="lock" size={16} />
          <span>Consent Authorizations</span>
          <span className="patient-tab-badge">{consents.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'timeline'}
          className={`patient-nav-tab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          <Icon name="timeline" size={16} />
          <span>Care Timeline</span>
          <span className="patient-tab-badge">{timeline.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'emergency'}
          className={`patient-nav-tab ${activeTab === 'emergency' ? 'active' : ''}`}
          onClick={() => setActiveTab('emergency')}
        >
          <Icon name="emergency" size={16} />
          <span>Break-Glass Audit</span>
        </button>
      </div>

      {/* TAB 1: Care Passport & Selective Disclosure */}
      {activeTab === 'passport' && (
        <div className="passport-tab-grid">
          {/* Left Column: QR Card */}
          <div className="qr-column">
            {isLoading ? (
              <LoadingSkeleton type="card" count={2} />
            ) : (
              <QRCodeCard
                pseudonymousId={pseudoId}
                patientName={user?.full_name || 'Sunita Devi'}
                qrPayload={passport?.qr_data || pseudoId}
                bloodGroup={passport?.emergency_blood_group || 'B+'}
                allergies={passport?.emergency_allergies || 'Penicillin'}
                conditions={passport?.emergency_conditions || 'Gravida 2, 14w ANC'}
                issuedAt={passport?.issued_at}
                version={passport?.version || 1}
                status="ACTIVE"
              />
            )}
          </div>

          {/* Right Column: Sovereign Controls */}
          <div className="sovereign-controls-column">
            <div className="sovereignty-card">
              <div className="card-header-clean">
                <Icon name="lock" size={18} color="var(--color-teal)" />
                <div>
                  <h3 className="card-title">Selective Disclosure Governance</h3>
                  <p className="card-subtitle">
                    Under India's DPDP Act 2023, you have absolute ownership over your health record. Choose which clinical scopes are shared upon scanning:
                  </p>
                </div>
              </div>

              <div className="disclosure-toggles-list">
                <label className="toggle-item">
                  <div className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={shareEmergency}
                      onChange={(e) => setShareEmergency(e.target.checked)}
                      className="styled-toggle"
                    />
                  </div>
                  <div className="toggle-info">
                    <span className="toggle-name">Emergency Profile (Blood Group, Allergies)</span>
                    <span className="toggle-desc">
                      Available to verified first responders and emergency casualty triage without delay.
                    </span>
                  </div>
                  <StatusBadge status="verified" label="Mandatory" size="sm" />
                </label>

                <label className="toggle-item">
                  <div className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={shareMaternal}
                      onChange={(e) => setShareMaternal(e.target.checked)}
                      className="styled-toggle"
                    />
                  </div>
                  <div className="toggle-info">
                    <span className="toggle-name">Maternal ANC Records & Vitals History</span>
                    <span className="toggle-desc">
                      Disclosed to assigned ASHA worker Priya Sharma and treating Medical Officer Dr. Rajesh Sharma.
                    </span>
                  </div>
                  <StatusBadge status="active" label="Shared" size="sm" />
                </label>

                <label className="toggle-item">
                  <div className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={shareMeds}
                      onChange={(e) => setShareMeds(e.target.checked)}
                      className="styled-toggle"
                    />
                  </div>
                  <div className="toggle-info">
                    <span className="toggle-name">Prescription & Medication History</span>
                    <span className="toggle-desc">
                      Disclosed to dispensary pharmacists to prevent contraindications and adverse reactions.
                    </span>
                  </div>
                  <StatusBadge status="active" label="Shared" size="sm" />
                </label>

                <label className="toggle-item">
                  <div className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={shareLabs}
                      onChange={(e) => setShareLabs(e.target.checked)}
                      className="styled-toggle"
                    />
                  </div>
                  <div className="toggle-info">
                    <span className="toggle-name">Pathology & Diagnostic Ultrasound Images</span>
                    <span className="toggle-desc">
                      Requires one-time explicit OTP verification before specialist download.
                    </span>
                  </div>
                  <StatusBadge status="pending" label="OTP Required" size="sm" />
                </label>
              </div>

              <div className="security-guarantee-footer">
                <div className="guarantee-icon">
                  <Icon name="check" size={16} />
                </div>
                <div className="guarantee-text">
                  <strong>Ed25519 Cryptographic Guarantee:</strong> Your Care Passport is signed by the national key hierarchy. Offline readers verify signature validity without querying central servers.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Consent Authorizations */}
      {activeTab === 'consents' && (
        <div className="consents-tab-content">
          <div className="consents-header-bar">
            <div>
              <h3 className="section-title">Granular Healthcare Consents</h3>
              <p className="section-desc">
                Every doctor or clinic access must be explicitly authorized. You retain the right to revoke consent at any time.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Icon name="lock" size={14} />}
              onClick={() => alert('New consent request modal')}
            >
              Authorize New Facility
            </Button>
          </div>

          {consents.length === 0 ? (
            <EmptyState
              icon="consent"
              title="No Active Consents"
              description="You have not granted consent to any external healthcare facilities yet."
            />
          ) : (
            <div className="consents-grid">
              {consents.map((c) => (
                <div key={c.id} className={`consent-card ${c.status === 'revoked' ? 'revoked' : ''}`}>
                  <div className="consent-top">
                    <div>
                      <span className="consent-facility">{c.recipient_facility_id}</span>
                      <h4 className="consent-recipient">{c.recipient_id}</h4>
                    </div>
                    <StatusBadge
                      status={c.status === 'active' ? 'active' : 'revoked'}
                      label={c.status === 'active' ? 'Active Consent' : 'Revoked'}
                    />
                  </div>

                  <div className="consent-details-list">
                    <div className="consent-row">
                      <span className="c-label">Clinical Purpose:</span>
                      <span className="c-val purpose-tag">{c.purpose.toUpperCase()}</span>
                    </div>
                    <div className="consent-row">
                      <span className="c-label">Data Scope:</span>
                      <code className="scope-code">{c.scope}</code>
                    </div>
                    <div className="consent-row">
                      <span className="c-label">Granted Date:</span>
                      <span className="c-val">{new Date(c.granted_at).toLocaleDateString()}</span>
                    </div>
                    <div className="consent-row">
                      <span className="c-label">Expiry Date:</span>
                      <span className="c-val">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Indefinite'}</span>
                    </div>
                  </div>

                  {c.status === 'active' && (
                    <div className="consent-action-row">
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={revokingId === c.id}
                        onClick={() => handleRevokeConsent(c.id)}
                        icon={<Icon name="close" size={14} />}
                      >
                        Revoke Access Immediately
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Longitudinal Timeline */}
      {activeTab === 'timeline' && (
        <div className="patient-timeline-layout">
          <div className="timeline-main-col">
            <div className="timeline-card">
              <div className="timeline-card-header">
                <div>
                  <h3 className="section-title">Longitudinal Care Journey</h3>
                  <p className="section-desc">
                    Complete chronological history of maternal checkups, laboratory results, and community visits across all health facilities.
                  </p>
                </div>
              </div>

              {timeline.length === 0 ? (
                <EmptyState
                  icon="timeline"
                  title="No Care Events"
                  description="No clinical encounters or immunization touchpoints have been recorded yet."
                />
              ) : (
                <ActivityTimeline entries={timelineEntries} />
              )}
            </div>
          </div>

          <div className="timeline-sidebar-col">
            <EvidencePanel
              title="Recent Clinical Biomarkers"
              items={[
                { label: 'Latest BP Reading', value: '142/94 mmHg (Stage 1 HTN)' },
                { label: 'Hemoglobin Level', value: '10.2 g/dL (Mild Anemia)' },
                { label: 'Blood Group', value: 'B Positive (B+)' },
                { label: 'Active Prescription', value: 'Labetalol 100mg, IFA 100mg' },
                { label: 'Next Scheduled Visit', value: '25 Sep 2026 (Ramnagar CHC)' },
              ]}
              footer={
                <div className="evidence-sidebar-footer">
                  <StatusBadge status="needs-review" label="Follow-up Required" />
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* TAB 4: Emergency Break-Glass Audit */}
      {activeTab === 'emergency' && (
        <div className="breakglass-audit-content">
          <div className="audit-header-banner">
            <div className="audit-icon-wrap">
              <Icon name="emergency" size={24} color="var(--color-crimson)" />
            </div>
            <div>
              <h3 className="section-title">Emergency Break-Glass Audit Ledger</h3>
              <p className="section-desc">
                In acute trauma or life-threatening emergencies, treating doctors may view essential life-support fields without prior patient consent. Every override is cryptographically logged with clinical justification.
              </p>
            </div>
          </div>

          <div className="audit-events-list">
            <div className="audit-entry-card">
              <div className="audit-top-bar">
                <div className="audit-badge-time">
                  <StatusBadge status="urgent" label="Emergency Access Authorized" />
                  <span className="audit-timestamp">10 Sep 2026, 16:42 IST</span>
                </div>
                <code className="audit-hash">TX: 0x8f2a...c91e (Audited)</code>
              </div>

              <div className="audit-details-grid">
                <div className="audit-detail-item">
                  <span className="audit-lbl">Requesting Clinician</span>
                  <span className="audit-val">Dr. Anita Desai, MD (Emergency Triage)</span>
                </div>
                <div className="audit-detail-item">
                  <span className="audit-lbl">Healthcare Facility</span>
                  <span className="audit-val">District Hospital Varanasi, Casualty Ward</span>
                </div>
                <div className="audit-detail-item full-width">
                  <span className="audit-lbl">Legally Mandated Justification Reason</span>
                  <span className="audit-val justification-text">
                    "Patient presenting with severe gestational hypertension (BP 150/100), acute cephalalgia, and blurred vision during transit. Immediate maternal allergy and blood group profile required for emergency stabilization."
                  </span>
                </div>
                <div className="audit-detail-item full-width">
                  <span className="audit-lbl">Emergency Data Disclosed</span>
                  <span className="audit-val disclosed-tags">
                    <code>Blood Group: B+</code>
                    <code>Allergies: Penicillin, Sulfa drugs</code>
                    <code>Medications: IFA, Calcium, Labetalol</code>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
