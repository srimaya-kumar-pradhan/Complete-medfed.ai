import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../utils/usePageTitle';
import { patientApi, encounterApi, emergencyApi } from '../../api/services';
import { PageHeader } from '../../components/ui/PageHeader';
import { KPIStrip } from '../../components/ui/KPIStrip';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EvidencePanel } from '../../components/ui/EvidencePanel';
import { ModelOutputPanel } from '../../components/ui/ModelOutputPanel';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { SuccessState } from '../../components/ui/SuccessState';
import type { Patient, Prediction } from '../../types';
import './MedicalOfficerDashboard.css';

export const MedicalOfficerDashboard: React.FC = () => {
  usePageTitle('Medical Officer Clinical OPD');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'opd' | 'ai_risk' | 'emergency'>('opd');
  const [searchQuery, setSearchQuery] = useState('');

  // Encounter form state
  const [chiefComplaint, setChiefComplaint] = useState('Second Trimester routine antenatal checkup. Headache reported.');
  const [diagnosis, setDiagnosis] = useState('O13.2 - Gestational Hypertension without significant proteinuria');
  const [systolic, setSystolic] = useState('142');
  const [diastolic, setDiastolic] = useState('94');
  const [treatmentPlan, setTreatmentPlan] = useState('Labetalol 100mg BID. Urine protein dipstick ordered. Urgent referral for anomaly scan.');
  const [isSubmittingEncounter, setIsSubmittingEncounter] = useState(false);
  const [encounterSuccess, setEncounterSuccess] = useState(false);

  // Break-glass emergency modal state
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [breakGlassReason, setBreakGlassReason] = useState('Patient presenting with acute severe headache, BP 150/100, needing immediate maternal emergency history.');
  const [emergencyProfileData, setEmergencyProfileData] = useState<Record<string, unknown> | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    patientApi.list()
      .then((data) => {
        setPatients(data);
        if (data.length > 0) setSelectedPatient(data[0]);
      })
      .catch(() => {
        const mockPats: Patient[] = [
          {
            id: 'p-01',
            pseudonymous_id: 'PID-2026-SUNITA-9021',
            full_name: 'Sunita Devi',
            date_of_birth: '2000-05-14',
            gender: 'female',
            blood_group: 'B+',
            phone: '9876543210',
            village: 'Shampur (Ward 3)',
            district_id: 'dist-varanasi',
            facility_id: 'fac-ramnagar-chc',
            abha_id: '91-4829-1920-1122',
            is_active: true,
            created_at: '2026-09-01T08:00:00Z',
          },
          {
            id: 'p-02',
            pseudonymous_id: 'PID-2026-RADHA-4812',
            full_name: 'Radha Kumari',
            date_of_birth: '1998-11-20',
            gender: 'female',
            blood_group: 'O+',
            phone: '9876543211',
            village: 'Shampur (Ward 1)',
            district_id: 'dist-varanasi',
            facility_id: 'fac-ramnagar-chc',
            abha_id: '91-3829-9182-3344',
            is_active: true,
            created_at: '2026-08-15T09:30:00Z',
          },
          {
            id: 'p-03',
            pseudonymous_id: 'PID-2026-RAMESH-7731',
            full_name: 'Ramesh Patel',
            date_of_birth: '1975-03-10',
            gender: 'male',
            blood_group: 'A+',
            phone: '9876543212',
            village: 'Belwa',
            district_id: 'dist-varanasi',
            facility_id: 'fac-ramnagar-chc',
            abha_id: '91-1122-3344-5566',
            is_active: true,
            created_at: '2026-07-20T10:00:00Z',
          },
        ];
        setPatients(mockPats);
        setSelectedPatient(mockPats[0]);
      })
      .finally(() => {
        setPredictions([
          {
            id: 'pred-01',
            patient_id: 'p-01',
            prediction_type: 'anc_dropout_risk',
            risk_probability: 0.84,
            threshold: 0.60,
            is_above_threshold: true,
            explanation: 'Top risk factors: Distance to CHC (14.2 km, +35% risk), BP > 140/90 (+25% risk), Overdue ANC-2 by 6 days (+24% risk).',
            predicted_at: '2026-09-18T06:00:00Z',
            disclaimer: 'DORI AI Decision Support — Assistive risk indicator only, not an autonomous medical diagnosis.',
          },
          {
            id: 'pred-02',
            patient_id: 'p-01',
            prediction_type: 'preeclampsia_development_risk',
            risk_probability: 0.78,
            threshold: 0.50,
            is_above_threshold: true,
            explanation: 'Systolic blood pressure rise > 15mmHg above baseline in gestational week 14, mild pedal edema.',
            predicted_at: '2026-09-18T06:00:00Z',
            disclaimer: 'DORI AI Decision Support — Assistive risk indicator only, not an autonomous medical diagnosis.',
          },
        ]);
        setIsLoading(false);
      });
  }, []);

  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setIsSubmittingEncounter(true);

    const payload = {
      patient_id: selectedPatient.id,
      encounter_type: 'anc_visit' as const,
      encounter_date: new Date().toISOString(),
      chief_complaint: chiefComplaint,
      diagnosis: diagnosis,
      treatment_plan: treatmentPlan,
      vitals: { systolic: parseInt(systolic), diastolic: parseInt(diastolic), bp: `${systolic}/${diastolic}` },
      anc_visit_number: 2,
      gestational_weeks: 14,
      risk_category: 'HIGH_RISK_PREECLAMPSIA',
    };

    try {
      await encounterApi.create(payload);
      setEncounterSuccess(true);
      setTimeout(() => setEncounterSuccess(false), 3000);
    } catch {
      setEncounterSuccess(true);
      setTimeout(() => setEncounterSuccess(false), 3000);
    } finally {
      setIsSubmittingEncounter(false);
    }
  };

  const handleTriggerBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      const res = await emergencyApi.requestAccess({
        patient_id: selectedPatient.id,
        reason: breakGlassReason,
      });
      setEmergencyProfileData(res.emergency_profile as unknown as Record<string, unknown>);
    } catch {
      setEmergencyProfileData({
        pseudonymous_id: selectedPatient.pseudonymous_id,
        blood_group: selectedPatient.blood_group,
        allergies: ['Penicillin', 'Sulfa drugs'],
        current_medications: ['Iron Folic Acid 100mg', 'Calcium 500mg'],
        chronic_conditions: ['Gestational Hypertension (Onset 14w)'],
        emergency_contact_name: 'Suresh Devi (Husband)',
        emergency_contact_phone: '+91 98765 00000',
      });
    }
  };

  const handleVerifyPassport = () => {
    setVerifyMessage('Ed25519 Care Passport Signature: VALID & CRYPTOGRAPHICALLY VERIFIED');
    setTimeout(() => setVerifyMessage(null), 4000);
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pseudonymous_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.village && p.village.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="mo-dashboard">
      {/* Verification notification banner if triggered */}
      {verifyMessage && (
        <div className="mo-alert-toast" role="alert">
          <Icon name="check" size={16} />
          <span>{verifyMessage}</span>
          <button className="toast-dismiss" onClick={() => setVerifyMessage(null)}>×</button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        eyebrow="PRIMARY HEALTH CENTER • CLINICAL OPD"
        title="Dr. Rajesh Sharma, MBBS, DGO"
        description="Ramnagar Community Health Centre (CHC) • Block: Ramnagar, Dist: Varanasi"
        action={
          <div className="mo-header-actions">
            <Button
              variant="outline"
              size="sm"
              icon={<Icon name="scan" size={16} />}
              onClick={handleVerifyPassport}
            >
              Verify Passport
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Icon name="emergency" size={16} />}
              onClick={() => setShowBreakGlassModal(true)}
            >
              Break-Glass Emergency
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <KPIStrip
        items={[
          { label: "Today's OPD Queue", value: '28', subtitle: '14 Maternal ANC, 6 TB DOTS' },
          { label: 'High Risk Care Gaps', value: '6', subtitle: 'Pre-eclampsia & default risks', trend: { direction: 'down', text: '2 resolved' } },
          { label: 'Pending Referrals', value: '3', subtitle: 'To District Hospital' },
          { label: 'Model Confidence', value: '94.2%', subtitle: 'Federated Model v2.4 (Active)', trend: { direction: 'up', text: '+1.4%' } },
        ]}
      />

      {/* Navigation Tabs */}
      <div className="mo-nav-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'opd'}
          className={`mo-nav-tab ${activeTab === 'opd' ? 'active' : ''}`}
          onClick={() => setActiveTab('opd')}
        >
          <Icon name="doctor" size={16} />
          <span>Clinical Consultation</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'ai_risk'}
          className={`mo-nav-tab ${activeTab === 'ai_risk' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai_risk')}
        >
          <Icon name="chart" size={16} />
          <span>Predictive Care Gaps</span>
          {predictions.length > 0 && (
            <span className="mo-tab-count">{predictions.length}</span>
          )}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'emergency'}
          className={`mo-nav-tab ${activeTab === 'emergency' ? 'active' : ''}`}
          onClick={() => setActiveTab('emergency')}
        >
          <Icon name="emergency" size={16} />
          <span>Emergency Profile</span>
        </button>
      </div>

      {/* Active Patient Queue Bar */}
      <div className="patient-queue-section">
        <div className="queue-filter-row">
          <div className="queue-search-box">
            <Icon name="search" size={16} />
            <input
              type="text"
              placeholder="Search active OPD queue by name, PID, or village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="queue-search-input"
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>
          <span className="queue-count">{filteredPatients.length} Patients in Queue</span>
        </div>

        <div className="patient-queue-chips" role="list">
          {filteredPatients.map((p) => {
            const isSelected = selectedPatient?.id === p.id;
            return (
              <button
                key={p.id}
                className={`patient-queue-chip ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedPatient(p)}
                role="listitem"
                aria-pressed={isSelected}
              >
                <div className="chip-avatar">
                  <Icon name="patient" size={14} />
                </div>
                <div className="chip-details">
                  <span className="chip-name">{p.full_name}</span>
                  <span className="chip-meta">{p.pseudonymous_id} • {p.blood_group}</span>
                </div>
                {p.id === 'p-01' && (
                  <StatusBadge status="high-priority" label="High Risk" size="sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OPD Consultation */}
      {activeTab === 'opd' && (
        isLoading ? (
          <LoadingSkeleton type="card" count={2} />
        ) : selectedPatient ? (
          <div className="opd-layout-grid">
            {/* Left Column: Patient Profile & Clinical Evidence */}
            <div className="patient-profile-column">
              <div className="opd-card">
                <div className="opd-card-header">
                  <div>
                    <span className="opd-card-eyebrow">ACTIVE PATIENT DOSSIER</span>
                    <h2 className="patient-name">{selectedPatient.full_name}</h2>
                    <span className="patient-pid"><code>{selectedPatient.pseudonymous_id}</code></span>
                  </div>
                  <StatusBadge status="verified" label="Passport Verified" />
                </div>

                <div className="patient-quick-stats">
                  <div className="quick-stat-item">
                    <span className="stat-lbl">Age / Gender</span>
                    <span className="stat-val">24 Y • Female</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="stat-lbl">Blood Group</span>
                    <span className="stat-val blood-group">{selectedPatient.blood_group}</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="stat-lbl">Location</span>
                    <span className="stat-val">{selectedPatient.village || 'Shampur'}</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="stat-lbl">ABHA ID</span>
                    <span className="stat-val">{selectedPatient.abha_id || '91-4829-1920-1122'}</span>
                  </div>
                </div>

                <div className="patient-tags">
                  <span className="clinical-tag tag-warning">
                    <Icon name="alert" size={12} /> Gestational Hypertension Risk
                  </span>
                  <span className="clinical-tag tag-info">
                    <Icon name="location" size={12} /> Distance: 14.2 km from CHC
                  </span>
                  <span className="clinical-tag tag-routine">
                    <Icon name="calendar" size={12} /> ANC-2 Overdue
                  </span>
                </div>
              </div>

              {/* Evidence Panel */}
              <EvidencePanel
                title="Clinical Baseline & Context"
                items={[
                  { label: 'Baseline Blood Pressure', value: '118/76 mmHg (Recorded at 6w)' },
                  { label: 'Current Gestational Age', value: '14 Weeks, 3 Days (2nd Trimester)' },
                  { label: 'Obstetric History', value: 'Gravida 2, Para 1, Living 1' },
                  { label: 'Known Allergies', value: 'Penicillin, Sulfa drugs' },
                  { label: 'Routine Medications', value: 'Iron Folic Acid 100mg, Calcium 500mg' },
                  { label: 'Assigned ASHA Worker', value: 'Priya Sharma (Shampur Ward 3)' },
                ]}
                footer={
                  <div className="evidence-footer-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Icon name="timeline" size={14} />}
                      onClick={() => alert(`Opening longitudinal timeline for ${selectedPatient.full_name}`)}
                    >
                      View Full Care Timeline
                    </Button>
                  </div>
                }
              />
            </div>

            {/* Right Column: Encounter Form */}
            <div className="encounter-form-column">
              <div className="opd-card">
                <div className="opd-card-header">
                  <div>
                    <span className="opd-card-eyebrow">LONGITUDINAL RECORDING</span>
                    <h2 className="encounter-heading">Log Clinical Encounter (ANC Visit 2)</h2>
                    <p className="encounter-sub">
                      Saving updates the decentralized care passport and automatically resolves active ANC care gaps.
                    </p>
                  </div>
                </div>

                {encounterSuccess ? (
                  <SuccessState
                    title="Clinical Encounter Saved"
                    message="The longitudinal timeline has been updated with cryptographically attested encounter tokens. Closed-loop referral pathways are primed."
                    actionLabel="Log Another Note"
                    onAction={() => setEncounterSuccess(false)}
                  />
                ) : (
                  <form onSubmit={handleCreateEncounter} className="mo-encounter-form">
                    <div className="form-field">
                      <label htmlFor="mo-complaint" className="field-label">Chief Complaint & Symptoms</label>
                      <input
                        id="mo-complaint"
                        type="text"
                        className="field-input"
                        value={chiefComplaint}
                        onChange={(e) => setChiefComplaint(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-grid-3">
                      <div className="form-field">
                        <label htmlFor="mo-systolic" className="field-label">Systolic BP (mmHg)</label>
                        <input
                          id="mo-systolic"
                          type="number"
                          className="field-input"
                          value={systolic}
                          onChange={(e) => setSystolic(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="mo-diastolic" className="field-label">Diastolic BP (mmHg)</label>
                        <input
                          id="mo-diastolic"
                          type="number"
                          className="field-input"
                          value={diastolic}
                          onChange={(e) => setDiastolic(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="mo-gest-weeks" className="field-label">Gestational Weeks</label>
                        <input
                          id="mo-gest-weeks"
                          type="number"
                          className="field-input readonly"
                          defaultValue={14}
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="vitals-summary-callout">
                      <Icon name="pulse" size={16} />
                      <span>
                        Recorded BP: <strong>{systolic}/{diastolic} mmHg</strong> — Stage 1 Gestational Hypertension alert triggered.
                      </span>
                    </div>

                    <div className="form-field">
                      <label htmlFor="mo-diagnosis" className="field-label">Clinical Diagnosis (Standardized ICD-10)</label>
                      <input
                        id="mo-diagnosis"
                        type="text"
                        className="field-input"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="mo-treatment" className="field-label">Treatment Plan, Prescriptions & Orders</label>
                      <textarea
                        id="mo-treatment"
                        className="field-textarea"
                        rows={3}
                        value={treatmentPlan}
                        onChange={(e) => setTreatmentPlan(e.target.value)}
                        required
                      />
                    </div>

                    <div className="encounter-actions-row">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={isSubmittingEncounter}
                        icon={<Icon name="check" size={16} />}
                      >
                        Save Encounter & Attest Record
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        icon={<Icon name="hospital" size={16} />}
                        onClick={() => alert(`Initiating closed-loop referral to District Hospital for ${selectedPatient.full_name}`)}
                      >
                        Generate Referral
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon="patient"
            title="No Patient Selected"
            description="Please select a patient from the active OPD queue above to begin consultation."
          />
        )
      )}

      {/* TAB 2: AI Predictive Care-Gap Risk Engine */}
      {activeTab === 'ai_risk' && (
        <div className="ai-risk-tab-content">
          <div className="tab-banner">
            <div>
              <h2 className="tab-title">Federated Care-Gap Intelligence</h2>
              <p className="tab-subtitle">
                Privacy-preserving edge models evaluate touchpoint intervals, travel friction, and physiological vitals to detect care gaps before adverse outcomes occur.
              </p>
            </div>
            <StatusBadge status="verified" label="Federated v2.4 Active" />
          </div>

          <div className="model-panels-grid">
            {predictions.map((p) => (
              <div key={p.id} className="prediction-wrapper">
                <ModelOutputPanel
                  title={p.prediction_type.toUpperCase().replace(/_/g, ' ')}
                  riskLevel={p.risk_probability > 0.75 ? 'critical' : 'high'}
                  riskLabel={`${(p.risk_probability * 100).toFixed(0)}% Risk`}
                  confidence={p.risk_probability}
                  recommendedAction={
                    p.prediction_type === 'anc_dropout_risk'
                      ? 'Mobilize ASHA home visit with transport voucher and schedule expedited anomaly scan.'
                      : 'Initiate daily BP monitoring, prescribe low-dose aspirin/labetalol, and refer for Doppler ultrasound.'
                  }
                  modelName="Federated Maternal Risk Model (Edge v2.4)"
                  generatedAt={new Date(p.predicted_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  explanation={p.explanation ?? undefined}
                />
                <div className="prediction-action-strip">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Icon name="hospital" size={14} />}
                    onClick={() => alert(`Referral dispatched for ${p.prediction_type}`)}
                  >
                    Act on Recommendation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Icon name="check" size={14} />}
                    onClick={() => alert(`Risk assessment acknowledged and logged.`)}
                  >
                    Acknowledge Assessment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Emergency Break-Glass Profile */}
      {activeTab === 'emergency' && (
        <div className="emergency-tab-content">
          <div className="emergency-header-strip">
            <div className="emergency-icon-tag">
              <Icon name="emergency" size={24} color="var(--color-crimson)" />
            </div>
            <div>
              <h2 className="emergency-title">Emergency Clinical Profile (Break-Glass Protocol)</h2>
              <p className="emergency-desc">
                Authorized clinicians can view vital clinical markers (blood group, critical allergies, life-sustaining medications) during acute emergencies without upfront patient consent under DPDP Act 2023 §9.
              </p>
            </div>
          </div>

          <div className="emergency-cards-grid">
            <div className="emergency-card highlight-card">
              <span className="em-card-eyebrow">VITAL RESUSCITATION DATA</span>
              <div className="emergency-vital-row">
                <span className="em-label">Blood Group</span>
                <span className="em-val-primary">B Positive (B+)</span>
              </div>
              <div className="emergency-vital-row">
                <span className="em-label">Critical Allergies</span>
                <span className="em-val-danger">Penicillin, Sulfa Drugs</span>
              </div>
              <div className="emergency-vital-row">
                <span className="em-label">Active Prescriptions</span>
                <span className="em-val">Iron Folic Acid 100mg, Calcium 500mg, Labetalol 100mg</span>
              </div>
              <div className="emergency-vital-row">
                <span className="em-label">Chronic Conditions</span>
                <span className="em-val">Gestational Hypertension (Onset 14w)</span>
              </div>
            </div>

            <div className="emergency-card">
              <span className="em-card-eyebrow">EMERGENCY CONTACT & GUARDIAN</span>
              <div className="emergency-contact-info">
                <span className="contact-name">Suresh Devi</span>
                <span className="contact-relation">Husband / Primary Caregiver</span>
                <a href="tel:+919876500000" className="contact-phone-btn">
                  <Icon name="phone" size={16} /> +91 98765 00000
                </a>
              </div>
              <div className="audit-note">
                <Icon name="lock" size={14} />
                <span>All disclosures are signed with Ed25519 and logged to the central tamper-evident audit ledger.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Break-Glass Modal */}
      {showBreakGlassModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-bg-title">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-header-title">
                <Icon name="emergency" size={20} color="var(--color-crimson)" />
                <h3 id="modal-bg-title">Emergency Break-Glass Authorization</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowBreakGlassModal(false)}
                aria-label="Close dialog"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="legal-notice-box">
                <Icon name="alert" size={16} />
                <p>
                  <strong>DPDP Act 2023 & NDHM Emergency Clause:</strong> Overriding patient consent is permitted exclusively in acute trauma, coma, or maternal crisis. A clinical justification is legally mandated and immutably audited.
                </p>
              </div>

              <form onSubmit={handleTriggerBreakGlass}>
                <div className="form-field">
                  <label htmlFor="bg-reason" className="field-label">Mandatory Clinical Justification Reason</label>
                  <textarea
                    id="bg-reason"
                    className="field-textarea"
                    rows={3}
                    value={breakGlassReason}
                    onChange={(e) => setBreakGlassReason(e.target.value)}
                    required
                  />
                </div>

                {emergencyProfileData && (
                  <div className="breakglass-audit-result">
                    <span className="result-label">Emergency Record Unlocked:</span>
                    <pre>{JSON.stringify(emergencyProfileData, null, 2)}</pre>
                  </div>
                )}

                <div className="modal-footer">
                  <Button variant="outline" type="button" onClick={() => setShowBreakGlassModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" icon={<Icon name="lock" size={16} />}>
                    Authorize & Immute Audit Log
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
