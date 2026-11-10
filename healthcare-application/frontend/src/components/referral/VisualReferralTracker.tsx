import React, { useState } from 'react';
import { Icon, type IconName } from '../ui/Icon';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import './VisualReferralTracker.css';

export type MilestoneState = 'completed' | 'active' | 'pending' | 'delayed' | 'cancelled';

export interface ReferralMilestone {
  id: string;
  stepNumber: number;
  stageName: string;
  actionTitle: string;
  role: string;
  facility: string;
  timestamp: string;
  state: MilestoneState;
  notes: string;
  clinicalEvent?: string;
  hasAiArtifact?: boolean;
}

interface VisualReferralTrackerProps {
  patientName?: string;
  patientId?: string;
  referralId?: string;
  currentMilestoneId?: string;
  milestones?: ReferralMilestone[];
  onOpenXRayWorkstation?: () => void;
  className?: string;
}

export const DEFAULT_RAMESH_MILESTONES: ReferralMilestone[] = [
  {
    id: 'm-01',
    stepNumber: 1,
    stageName: 'PATIENT / SUB-CENTRE',
    actionTitle: 'REGISTERED & ENROLLED',
    role: 'Priya Sharma (ASHA)',
    facility: 'Shampur Sub-Centre',
    timestamp: '10 Sep • 09:42',
    state: 'completed',
    notes: 'Patient presented with 3-week productive cough and evening fever. Care Passport issued and biometric consent signed.',
    clinicalEvent: 'Baseline vitals: Pulse 84 bpm, Temp 99.8°F, SpO2 96%. Suspected respiratory infection.',
  },
  {
    id: 'm-02',
    stepNumber: 2,
    stageName: 'PRIMARY HEALTH CENTRE',
    actionTitle: 'DOCTOR CONSULTATION',
    role: 'Dr. Anand Verma (MO)',
    facility: 'Ramnagar PHC',
    timestamp: '10 Sep • 10:15',
    state: 'completed',
    notes: 'Auscultation identified coarse right basilar crackles. Sputum container handed for AFB test.',
    clinicalEvent: 'Prescribed broad-spectrum antibiotic (Amoxicillin-Clavulanate) and scheduled urgent chest radiograph.',
  },
  {
    id: 'm-03',
    stepNumber: 3,
    stageName: 'REFERRAL SYSTEM',
    actionTitle: 'REFERRAL CREATED',
    role: 'Dr. Anand Verma (MO)',
    facility: 'Ramnagar PHC',
    timestamp: '10 Sep • 10:28',
    state: 'completed',
    notes: 'Closed-loop electronic referral generated for District Hospital Chest Radiology Unit (Priority: High).',
    clinicalEvent: 'Referral ID: REF-RAMESH-2026-CHEST · Digital Care Passport token attached.',
  },
  {
    id: 'm-04',
    stepNumber: 4,
    stageName: 'AMBULANCE / TRANSIT',
    actionTitle: 'PATIENT IN TRANSIT',
    role: '108 Emergency Ambulance #UP-65-G-4122',
    facility: 'Ramnagar to Varanasi District Corridor',
    timestamp: '10 Sep • 11:05',
    state: 'completed',
    notes: 'Government subsidized patient transport mobilized. Digital referral scanned via QR code upon departure.',
    clinicalEvent: 'Transit duration: 52 minutes. Patient stable throughout journey.',
  },
  {
    id: 'm-05',
    stepNumber: 5,
    stageName: 'DISTRICT HOSPITAL',
    actionTitle: 'TRIAGE ARRIVAL CONFIRMED',
    role: 'Nurse Station #4',
    facility: 'Varanasi District Hospital',
    timestamp: '10 Sep • 12:21',
    state: 'completed',
    notes: 'Arrival logged electronically via Care Passport QR code scan. Zero redundant paperwork required.',
    clinicalEvent: 'Triage Category: Priority 2 (Urgent Respiratory OPD).',
  },
  {
    id: 'm-06',
    stepNumber: 6,
    stageName: 'SPECIALIST ACCEPTANCE',
    actionTitle: 'ACCEPTED BY PULMONOLOGIST',
    role: 'Dr. Rajesh Sharma (MD Pulmonology)',
    facility: 'Varanasi District Hospital',
    timestamp: '10 Sep • 12:35',
    state: 'completed',
    notes: 'Longitudinal record reviewed. Patient queued for immediate digital chest radiography.',
    clinicalEvent: 'Orders entered: Digital PA Chest X-Ray, CBC, ESR, Sputum GeneXpert.',
  },
  {
    id: 'm-07',
    stepNumber: 7,
    stageName: 'RADIOLOGY',
    actionTitle: 'CHEST X-RAY ACQUIRED',
    role: 'Sunil Ray (Radiographer)',
    facility: 'Dept. of Radiodiagnosis, Dist Hospital',
    timestamp: '10 Sep • 13:05',
    state: 'completed',
    notes: 'DICOM chest radiograph (PA view) digitized. High-resolution DICOM dispatched to local edge node.',
    clinicalEvent: 'Study ID: CXR-2026-09-4412 · High quality image acquired.',
  },
  {
    id: 'm-08',
    stepNumber: 8,
    stageName: 'MEDFED FEDERATED AI',
    actionTitle: 'ANALYSIS & GRAD-CAM COMPLETE',
    role: 'MedFed Global Model (DenseNet121 v1.3)',
    facility: 'Local Hospital Edge Node A (Private)',
    timestamp: '10 Sep • 13:07',
    state: 'completed',
    notes: 'Private on-premise inference executed. DenseNet121 detected Infiltration (67.3% confidence) with Grad-CAM heatmap highlighting right lower zone.',
    clinicalEvent: 'Privacy Layer: Prime-DP active (Laplace noise ε=0.5). Raw image stayed strictly on hospital storage; zero PHI transmitted outside.',
    hasAiArtifact: true,
  },
  {
    id: 'm-09',
    stepNumber: 9,
    stageName: 'DOCTOR CLINICAL REVIEW',
    actionTitle: 'CLINICAL DECISION CONFIRMED',
    role: 'Dr. Rajesh Sharma (MD Pulmonology)',
    facility: 'Varanasi District Hospital',
    timestamp: '10 Sep • 13:15',
    state: 'active',
    notes: 'Clinician validated AI findings. Confirmed right middle/lower lobe consolidation. Agreed with AI risk score.',
    clinicalEvent: 'Decision: AGREE. Diagnosis: Bacterial Community-Acquired Pneumonia with right lower lobe infiltration.',
  },
  {
    id: 'm-10',
    stepNumber: 10,
    stageName: 'TREATMENT & PRESCRIPTION',
    actionTitle: 'TREATMENT PROTOCOL INITIATED',
    role: 'Clinical Pharmacy & Pulmonology Ward',
    facility: 'Varanasi District Hospital',
    timestamp: '10 Sep • 13:40',
    state: 'pending',
    notes: 'Oral Azithromycin 500mg daily (5 days) + Cefpodoxime 200mg BID (7 days) dispensed under National Free Drug Initiative.',
    clinicalEvent: 'Steam inhalation, chest physiotherapy instructions, sputum AFB collection bottle issued.',
  },
  {
    id: 'm-11',
    stepNumber: 11,
    stageName: 'FOLLOW-UP REMINDER',
    actionTitle: 'FOLLOW-UP SCHEDULED & ALERTED',
    role: 'Automated DORI Engine & Frontline ASHA',
    facility: 'Shampur PHC / ASHA Ward 3',
    timestamp: '17 Sep (7 Days)',
    state: 'pending',
    notes: '7-day clinical review scheduled. In-app notification created and real SMTP email alert dispatched to patient.',
    clinicalEvent: 'ASHA Priya Sharma assigned for Day 3 and Day 7 home check-in to ensure medication adherence.',
  },
  {
    id: 'm-12',
    stepNumber: 12,
    stageName: 'CARE COMPLETION',
    actionTitle: 'CLOSED-LOOP RESOLUTION',
    role: 'Medical Officer & District Quality Team',
    facility: 'Varanasi District Health Network',
    timestamp: '24 Sep (Projected)',
    state: 'pending',
    notes: 'Resolution criteria: Complete symptomatic recovery, negative repeat sputum, clear follow-up auscultation.',
    clinicalEvent: 'Audit ledger token issued upon clinical sign-off, closing referral loop REF-RAMESH-2026.',
  },
];

export const VisualReferralTracker: React.FC<VisualReferralTrackerProps> = ({
  patientName = 'Ramesh Kumar',
  patientId = 'PID-2026-RAMESH-4412',
  referralId = 'REF-RAMESH-2026-CHEST',
  milestones = DEFAULT_RAMESH_MILESTONES,
  onOpenXRayWorkstation,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'network'>('timeline');
  const [selectedMilestone, setSelectedMilestone] = useState<ReferralMilestone>(
    milestones[7] || milestones[0]
  );

  const getStatusIcon = (state: MilestoneState): IconName => {
    switch (state) {
      case 'completed':
        return 'check';
      case 'active':
        return 'pulse';
      case 'delayed':
        return 'clock';
      case 'cancelled':
        return 'close';
      default:
        return 'clock';
    }
  };

  return (
    <div className={`visual-referral-tracker ${className}`}>
      {/* Tracker Header & Mode Toggles */}
      <div className="tracker-header">
        <div className="tracker-meta">
          <div className="tracker-title-row">
            <span className="tracker-eyebrow">CLOSED-LOOP REFERRAL CONTINUITY</span>
            <div className="tracker-badges">
              <StatusBadge status="verified" label="Live Tracked" size="sm" />
              <span className="ref-id-pill"><code>{referralId}</code></span>
            </div>
          </div>
          <h3 className="tracker-patient-name">
            {patientName} · <span className="patient-id-sub">{patientId}</span>
          </h3>
        </div>

        {/* View Mode Switcher */}
        <div className="tracker-mode-switch" role="group" aria-label="Referral visualization mode">
          <button
            type="button"
            className={`mode-btn ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            <Icon name="timeline" size={15} />
            <span>Timeline View</span>
          </button>
          <button
            type="button"
            className={`mode-btn ${viewMode === 'network' ? 'active' : ''}`}
            onClick={() => setViewMode('network')}
          >
            <Icon name="network" size={15} />
            <span>Network View</span>
          </button>
        </div>
      </div>

      {/* MODE 1: TIMELINE VIEW (Phase 4) */}
      {viewMode === 'timeline' && (
        <div className="timeline-container">
          <div className="timeline-strip" role="list">
            {milestones.map((m, idx) => {
              const isSelected = selectedMilestone?.id === m.id;
              const isLast = idx === milestones.length - 1;

              return (
                <div key={m.id} className="timeline-node-wrapper">
                  <button
                    type="button"
                    className={`timeline-node ${m.state} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedMilestone(m)}
                    aria-pressed={isSelected}
                    role="listitem"
                  >
                    <div className="node-marker">
                      <Icon name={getStatusIcon(m.state)} size={12} />
                    </div>

                    <div className="node-content">
                      <span className="node-stage">{m.stageName}</span>
                      <span className="node-title">{m.actionTitle}</span>
                      <span className="node-time">{m.timestamp}</span>
                    </div>

                    {m.hasAiArtifact && (
                      <span className="node-ai-tag">
                        <Icon name="brain" size={10} /> AI
                      </span>
                    )}
                  </button>

                  {!isLast && (
                    <div className={`timeline-connector ${m.state === 'completed' ? 'completed' : ''}`}>
                      <div className="connector-arrow">›</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 2: NETWORK VIEW (Phase 5) */}
      {viewMode === 'network' && (
        <div className="network-container">
          <div className="network-flow">
            {/* Facility Node 1: Village / Sub-Centre */}
            <div className="network-station completed">
              <div className="station-icon">
                <Icon name="patient" size={20} />
              </div>
              <div className="station-info">
                <span className="station-type">VILLAGE / SUB-CENTRE</span>
                <span className="station-name">Shampur Health Post</span>
                <span className="station-status">Registered & Screened</span>
              </div>
            </div>

            {/* Directional Connector 1 */}
            <div className="network-path completed">
              <div className="path-line" />
              <div className="path-pulse" />
              <span className="path-label">ASHA Intake · 09:42</span>
            </div>

            {/* Facility Node 2: PHC */}
            <div className="network-station completed">
              <div className="station-icon">
                <Icon name="hospital" size={20} />
              </div>
              <div className="station-info">
                <span className="station-type">PRIMARY HEALTH CENTRE</span>
                <span className="station-name">Ramnagar PHC</span>
                <span className="station-status">Doctor Consult & Referral</span>
              </div>
            </div>

            {/* Directional Connector 2 */}
            <div className="network-path completed">
              <div className="path-line" />
              <div className="path-pulse" />
              <span className="path-label">108 Ambulance · 52 min</span>
            </div>

            {/* Facility Node 3: District Hospital */}
            <div className="network-station active">
              <div className="station-icon">
                <Icon name="hospital" size={20} />
              </div>
              <div className="station-info">
                <span className="station-type">DISTRICT HOSPITAL</span>
                <span className="station-name">Varanasi District Hospital</span>
                <span className="station-status highlight">Arrived · AI CXR Analysis</span>
              </div>
            </div>

            {/* Directional Connector 3 */}
            <div className="network-path in-progress">
              <div className="path-line" />
              <div className="path-pulse animated" />
              <span className="path-label">Specialist Review</span>
            </div>

            {/* Facility Node 4: Specialist Review */}
            <div className="network-station active">
              <div className="station-icon">
                <Icon name="stethoscope" size={20} />
              </div>
              <div className="station-info">
                <span className="station-type">SPECIALIST PULMONOLOGY</span>
                <span className="station-name">Dr. Rajesh Sharma, MD</span>
                <span className="station-status highlight">Grad-CAM Confirmed</span>
              </div>
            </div>

            {/* Directional Connector 4 */}
            <div className="network-path pending">
              <div className="path-line" />
              <span className="path-label">Next: 7-Day Review</span>
            </div>

            {/* Facility Node 5: Follow-up */}
            <div className="network-station pending">
              <div className="station-icon">
                <Icon name="timeline" size={20} />
              </div>
              <div className="station-info">
                <span className="station-type">FOLLOW-UP / COMPLETION</span>
                <span className="station-name">Community Health Loop</span>
                <span className="station-status">17 Sep • Scheduled</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Milestone Inspection Drawer */}
      {selectedMilestone && (
        <div className="milestone-inspector-card">
          <div className="inspector-header">
            <div className="inspector-title-group">
              <span className="inspector-step-tag">Step {selectedMilestone.stepNumber} of 12</span>
              <h4 className="inspector-title">{selectedMilestone.actionTitle}</h4>
              <span className="inspector-stage">{selectedMilestone.stageName}</span>
            </div>

            <div className="inspector-state-wrap">
              <span className={`milestone-state-badge state-${selectedMilestone.state}`}>
                {selectedMilestone.state.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="inspector-details-grid">
            <div className="detail-item">
              <span className="detail-label">Facility & Location</span>
              <span className="detail-value">{selectedMilestone.facility}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Responsible Role / Clinician</span>
              <span className="detail-value">{selectedMilestone.role}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Timestamp</span>
              <span className="detail-value">{selectedMilestone.timestamp}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Clinical Action Notes</span>
              <span className="detail-value">{selectedMilestone.notes}</span>
            </div>
          </div>

          {selectedMilestone.clinicalEvent && (
            <div className="inspector-clinical-event">
              <Icon name="info" size={15} />
              <span>{selectedMilestone.clinicalEvent}</span>
            </div>
          )}

          {selectedMilestone.hasAiArtifact && onOpenXRayWorkstation && (
            <div className="inspector-action-row">
              <Button
                variant="primary"
                size="sm"
                icon={<Icon name="xray" size={15} />}
                onClick={onOpenXRayWorkstation}
              >
                Open Chest X-Ray AI Workstation & Review Heatmap
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
