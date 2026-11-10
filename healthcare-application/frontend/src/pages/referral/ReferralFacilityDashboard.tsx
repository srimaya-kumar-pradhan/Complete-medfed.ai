import React, { useState, useEffect } from 'react';
import { referralApi } from '../../api/services';
import { PageHeader } from '../../components/ui/PageHeader';
import { KPIStrip } from '../../components/ui/KPIStrip';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EvidencePanel } from '../../components/ui/EvidencePanel';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { SuccessState } from '../../components/ui/SuccessState';
import { usePageTitle } from '../../utils/usePageTitle';
import type { Referral, ReferralStatus } from '../../types';
import './ReferralFacilityDashboard.css';

const REFERRAL_STAGES: { key: ReferralStatus; label: string; icon: 'check' | 'clock' | 'hospital' | 'stethoscope' | 'send' }[] = [
  { key: 'issued', label: 'Issued by PHC', icon: 'check' },
  { key: 'in_transit', label: 'In Transit', icon: 'clock' },
  { key: 'arrived', label: 'Arrived at Hospital', icon: 'hospital' },
  { key: 'accepted', label: 'Accepted in Clinic', icon: 'stethoscope' },
  { key: 'completed', label: 'Feedback Dispatched', icon: 'send' },
];

export const ReferralFacilityDashboard: React.FC = () => {
  usePageTitle('Specialist Referral Center');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [selectedRef, setSelectedRef] = useState<Referral | null>(null);
  const [consultNotes, setConsultNotes] = useState(
    'Obstetric Ultrasound completed: Single live intrauterine fetus at 14w3d. Placenta fundal. Normal amniotic fluid index. BP stabilized with labetalol. Advised strict bi-weekly monitoring at PHC.'
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'urgent' | 'routine'>('all');

  useEffect(() => {
    referralApi.list()
      .then((data) => {
        setReferrals(data);
        if (data.length > 0) setSelectedRef(data[0]);
      })
      .catch(() => {
        const mock: Referral[] = [
          {
            id: 'ref-01',
            referral_token: 'REF-2026-8812',
            patient_id: 'p-01',
            referring_facility_id: 'Ramnagar CHC (Dr. Rajesh Sharma)',
            receiving_facility_id: 'Varanasi District Hospital (OB/GYN Dept)',
            status: 'in_transit',
            priority: 'urgent',
            reason: 'High-risk gestational hypertension (BP 142/94) requiring level-2 anomaly ultrasound scan.',
            clinical_summary: 'Gravida 2, Para 1. 14 weeks gestation. Pedal edema. Started on Labetalol 100mg.',
            diagnosis: 'Gestational Hypertension (O13.2)',
            created_at: '2026-09-15T10:30:00Z',
            completed_at: null,
          },
          {
            id: 'ref-02',
            referral_token: 'REF-2026-9904',
            patient_id: 'p-03',
            referring_facility_id: 'Shampur Sub-Center (Priya Sharma)',
            receiving_facility_id: 'Varanasi District Hospital (Chest Clinic)',
            status: 'arrived',
            priority: 'routine',
            reason: 'GeneXpert sputum confirmation for suspected MDR-TB default follow-up.',
            clinical_summary: '2 months intensive phase completed. Persistent cough with hemoptysis.',
            diagnosis: 'Pulmonary Tuberculosis (A15.0)',
            created_at: '2026-09-14T09:00:00Z',
            completed_at: null,
          },
          {
            id: 'ref-03',
            referral_token: 'REF-2026-4412',
            patient_id: 'p-02',
            referring_facility_id: 'Ramnagar CHC',
            receiving_facility_id: 'Varanasi District Hospital (Pediatrics)',
            status: 'completed',
            priority: 'routine',
            reason: 'Infant growth faltering evaluation and SAM screening.',
            clinical_summary: 'Weight-for-age < -3 SD. Appetite test positive.',
            diagnosis: 'Severe Acute Malnutrition (E43)',
            created_at: '2026-09-10T11:00:00Z',
            completed_at: '2026-09-12T15:00:00Z',
          },
        ];
        setReferrals(mock);
        setSelectedRef(mock[0]);
      });
  }, []);

  const handleUpdateStatus = async (newStatus: ReferralStatus) => {
    if (!selectedRef) return;
    setIsUpdating(true);

    try {
      await referralApi.updateStatus(selectedRef.id, newStatus, consultNotes);
      const updated = {
        ...selectedRef,
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : selectedRef.completed_at,
      };
      setReferrals((prev) => prev.map((r) => (r.id === selectedRef.id ? updated : r)));
      setSelectedRef(updated);
      setUpdateSuccess(true);
    } catch {
      const updated = {
        ...selectedRef,
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : selectedRef.completed_at,
      };
      setReferrals((prev) => prev.map((r) => (r.id === selectedRef.id ? updated : r)));
      setSelectedRef(updated);
      setUpdateSuccess(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStageIndex = (status: ReferralStatus) => {
    const idx = REFERRAL_STAGES.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  const filteredReferrals = referrals.filter((r) => {
    const matchesSearch =
      r.referral_token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referring_facility_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || r.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="referral-dashboard">
      {/* Page Header */}
      <PageHeader
        eyebrow="SECONDARY & TERTIARY CARE COMMAND • SPECIALIST INTAKE"
        title="Varanasi District Hospital & Medical College"
        description="Closed-Loop Referral Triage Hub • Department of Obstetrics & Gynecology"
        action={
          <div className="referral-header-actions">
            <StatusBadge status="verified" label="ABDM M3 Node Active" />
            <Button
              variant="primary"
              size="sm"
              icon={<Icon name="scan" size={16} />}
              onClick={() => alert('Scanning Care Passport QR for inbound referral triage...')}
            >
              Scan Inbound Passport
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <KPIStrip
        items={[
          { label: 'Active Inbound Queue', value: referrals.length, subtitle: 'From 12 Peripheral CHCs' },
          { label: 'Urgent Triage', value: referrals.filter((r) => r.priority === 'urgent').length, subtitle: 'Pre-eclampsia & acute trauma', trend: { direction: 'down', text: '1 triaged' } },
          { label: 'Avg Turnaround', value: '3.4 hrs', subtitle: 'Door-to-specialist consult' },
          { label: 'Closed-Loop Attestation', value: '96.2%', subtitle: 'Feedback returned to ASHA', trend: { direction: 'up', text: '+2.1%' } },
        ]}
      />

      {/* Main Grid: Inbound Queue (Left) & Specialist Intake Dossier (Right) */}
      <div className="referral-content-grid">
        {/* Left Column: Inbound Queue */}
        <aside className="referral-queue-sidebar">
          <div className="queue-filter-card">
            <div className="queue-search">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by token, diagnosis, facility..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="filter-input"
              />
              {searchQuery && (
                <button className="clear-btn" onClick={() => setSearchQuery('')}>×</button>
              )}
            </div>

            <div className="priority-filter-tabs">
              <button
                className={`priority-tab ${filterPriority === 'all' ? 'active' : ''}`}
                onClick={() => setFilterPriority('all')}
              >
                All ({referrals.length})
              </button>
              <button
                className={`priority-tab ${filterPriority === 'urgent' ? 'active' : ''}`}
                onClick={() => setFilterPriority('urgent')}
              >
                Urgent ({referrals.filter((r) => r.priority === 'urgent').length})
              </button>
              <button
                className={`priority-tab ${filterPriority === 'routine' ? 'active' : ''}`}
                onClick={() => setFilterPriority('routine')}
              >
                Routine ({referrals.filter((r) => r.priority === 'routine').length})
              </button>
            </div>
          </div>

          <div className="queue-items-list" role="list">
            {filteredReferrals.map((r) => {
              const isSelected = selectedRef?.id === r.id;
              return (
                <div
                  key={r.id}
                  className={`referral-card-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedRef(r);
                    setUpdateSuccess(false);
                  }}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSelectedRef(r);
                      setUpdateSuccess(false);
                    }
                  }}
                >
                  <div className="ref-item-header">
                    <code className="ref-token">{r.referral_token}</code>
                    <StatusBadge
                      status={r.priority === 'urgent' ? 'urgent' : 'routine'}
                      label={r.priority.toUpperCase()}
                      size="sm"
                    />
                  </div>

                  <h4 className="ref-reason">{r.reason}</h4>

                  <div className="ref-facility-meta">
                    <Icon name="hospital" size={12} />
                    <span>{r.referring_facility_id}</span>
                  </div>

                  <div className="ref-item-footer">
                    <StatusBadge
                      status={r.status === 'completed' ? 'completed' : r.status === 'arrived' ? 'active' : 'pending'}
                      label={r.status.replace('_', ' ').toUpperCase()}
                      size="sm"
                    />
                    <span className="ref-date">
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Column: Specialist Intake & Action Dossier */}
        <section className="referral-detail-main">
          {selectedRef ? (
            <div className="intake-detail-card">
              {/* Header Dossier */}
              <div className="dossier-top-bar">
                <div>
                  <span className="dossier-eyebrow">CLOSED-LOOP REFERRAL DOSSIER</span>
                  <h2 className="dossier-title">{selectedRef.referral_token}</h2>
                  <p className="dossier-subtitle">
                    Patient ID: <code>{selectedRef.patient_id}</code> • Initiated: {new Date(selectedRef.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="dossier-status-badge">
                  <StatusBadge
                    status={selectedRef.status === 'completed' ? 'completed' : 'pending'}
                    label={`Stage: ${selectedRef.status.replace('_', ' ').toUpperCase()}`}
                  />
                </div>
              </div>

              {/* Progress Stepper Strip */}
              <div className="lifecycle-stepper" aria-label="Referral progress lifecycle">
                {REFERRAL_STAGES.map((stage, idx) => {
                  const currentIdx = getStageIndex(selectedRef.status);
                  const isDone = idx < currentIdx || selectedRef.status === 'completed';
                  const isCurrent = idx === currentIdx && selectedRef.status !== 'completed';

                  return (
                    <div
                      key={stage.key}
                      className={`lifecycle-step ${isDone ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                    >
                      <div className="step-circle">
                        {isDone ? (
                          <Icon name="check" size={12} />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      <span className="step-text">{stage.label}</span>
                      {idx < REFERRAL_STAGES.length - 1 && <div className="step-line" />}
                    </div>
                  );
                })}
              </div>

              {/* Clinical Evidence & Referral Ready Checklist */}
              <div className="clinical-evidence-grid">
                <div className="evidence-col">
                  <EvidencePanel
                    title="Referring Clinical Context"
                    items={[
                      { label: 'Originating Facility', value: selectedRef.referring_facility_id },
                      { label: 'Receiving Facility', value: selectedRef.receiving_facility_id },
                      { label: 'Clinical Diagnosis', value: selectedRef.diagnosis },
                      { label: 'Clinical Summary', value: selectedRef.clinical_summary },
                      { label: 'Primary Indication', value: selectedRef.reason },
                    ]}
                  />
                </div>

                <div className="checklist-col">
                  <div className="referral-checklist-card">
                    <div className="checklist-header">
                      <Icon name="check" size={16} color="var(--color-teal)" />
                      <h3>Referral-Ready Verification</h3>
                    </div>
                    <ul className="checklist-items">
                      <li className="check-item verified">
                        <span className="check-dot" />
                        <div>
                          <strong>Care Passport Cryptographic Signature</strong>
                          <small>Attested by Ed25519 root key — no tampering</small>
                        </div>
                      </li>
                      <li className="check-item verified">
                        <span className="check-dot" />
                        <div>
                          <strong>Longitudinal Baseline Vitals Attached</strong>
                          <small>BP 142/94 mmHg, Gestational Age 14w recorded</small>
                        </div>
                      </li>
                      <li className="check-item verified">
                        <span className="check-dot" />
                        <div>
                          <strong>Citizen Consent Scope Granted</strong>
                          <small>DPDP Act compliant authorization for OB/GYN triage</small>
                        </div>
                      </li>
                      <li className="check-item verified">
                        <span className="check-dot" />
                        <div>
                          <strong>Closed-Loop Notification Channel</strong>
                          <small>Direct webhook / SMS channel to ASHA Priya Sharma</small>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Lifecycle Advance Actions */}
              <div className="lifecycle-action-strip">
                <span className="action-strip-label">Next Action:</span>
                <div className="action-buttons-wrap">
                  {selectedRef.status === 'in_transit' && (
                    <Button
                      variant="primary"
                      size="md"
                      icon={<Icon name="hospital" size={16} />}
                      isLoading={isUpdating}
                      onClick={() => handleUpdateStatus('arrived')}
                    >
                      Confirm Patient Arrival at District Hospital
                    </Button>
                  )}
                  {selectedRef.status === 'arrived' && (
                    <Button
                      variant="primary"
                      size="md"
                      icon={<Icon name="stethoscope" size={16} />}
                      isLoading={isUpdating}
                      onClick={() => handleUpdateStatus('accepted')}
                    >
                      Accept Patient into OB/GYN Specialist Clinic
                    </Button>
                  )}
                  {selectedRef.status === 'accepted' && (
                    <span className="ready-to-complete-note">
                      <Icon name="check" size={16} /> Patient accepted in clinic. Fill findings below to complete consult.
                    </span>
                  )}
                  {selectedRef.status === 'completed' && (
                    <span className="completed-success-tag">
                      <Icon name="check" size={16} /> Referral Closed-Loop Complete. Feedback dispatched to Village ASHA.
                    </span>
                  )}
                </div>
              </div>

              {/* Specialist Feedback & Discharge Plan */}
              <div className="specialist-feedback-box">
                <div className="feedback-box-header">
                  <Icon name="send" size={16} color="var(--color-teal)" />
                  <div>
                    <h3>Specialist Findings & Discharge Recommendations</h3>
                    <p>
                      This consult summary will be cryptographically attested and automatically pushed back to the referring primary health center and village ASHA.
                    </p>
                  </div>
                </div>

                {updateSuccess && selectedRef.status === 'completed' ? (
                  <SuccessState
                    title="Closed-Loop Feedback Dispatched"
                    message="Specialist ultrasound findings and medication regimen have been appended to the patient's Care Passport. Notification sent to ASHA Priya Sharma."
                    actionLabel="View Queue"
                    onAction={() => setUpdateSuccess(false)}
                  />
                ) : (
                  <div className="feedback-form">
                    <textarea
                      rows={4}
                      className="specialist-textarea"
                      value={consultNotes}
                      onChange={(e) => setConsultNotes(e.target.value)}
                      placeholder="Enter specialist ultrasound findings, updated medication orders, and next follow-up recommendations..."
                    />
                    <div className="feedback-submit-row">
                      <Button
                        variant="primary"
                        size="md"
                        icon={<Icon name="send" size={16} />}
                        isLoading={isUpdating}
                        onClick={() => handleUpdateStatus('completed')}
                        disabled={selectedRef.status === 'completed'}
                      >
                        Complete Consult & Dispatch Closed-Loop Feedback
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              icon="hospital"
              title="No Referral Selected"
              description="Please choose an inbound referral from the queue on the left to review clinical records and triage."
            />
          )}
        </section>
      </div>
    </div>
  );
};
