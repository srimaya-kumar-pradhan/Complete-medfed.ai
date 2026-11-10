import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { DemoBadge } from '../ui/DemoBadge';
import type { UserRole } from '../../types';
import './DemoController.css';

interface DemoStep {
  step: number;
  title: string;
  role: UserRole;
  path: string;
  description: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    step: 1,
    title: 'Patient Enrollment',
    role: 'asha',
    path: '/asha',
    description: 'ASHA enrolls Sunita Devi with Care Passport and records initial vitals.',
  },
  {
    step: 2,
    title: 'Care Passport Issuance',
    role: 'patient',
    path: '/patient',
    description: 'Patient receives cryptographic Care Passport with offline QR credential.',
  },
  {
    step: 3,
    title: 'Care-Gap Detection',
    role: 'asha',
    path: '/asha',
    description: 'DORI detects ANC dropout risk — elevated BP + distance from CHC.',
  },
  {
    step: 4,
    title: 'Referral Creation',
    role: 'asha',
    path: '/asha',
    description: 'ASHA creates urgent referral to Ramnagar CHC for pre-eclampsia screening.',
  },
  {
    step: 5,
    title: 'Consent & Verification',
    role: 'patient',
    path: '/patient',
    description: 'Patient grants selective consent for referral data sharing.',
  },
  {
    step: 6,
    title: 'Clinical Encounter',
    role: 'medical_officer',
    path: '/mo',
    description: 'Dr. Sharma scans Care Passport, reviews risk, records encounter.',
  },
  {
    step: 7,
    title: 'Risk Assessment',
    role: 'medical_officer',
    path: '/mo',
    description: 'Care-gap model generates prediction confidence and recommended workflow.',
  },
  {
    step: 8,
    title: 'Specialist Intake',
    role: 'referral_facility',
    path: '/referral',
    description: 'District hospital receives referral, accepts patient, logs findings.',
  },
  {
    step: 9,
    title: 'Completion & Feedback',
    role: 'referral_facility',
    path: '/referral',
    description: 'Specialist completes referral. Closed-loop feedback sent to ASHA.',
  },
  {
    step: 10,
    title: 'District Intelligence',
    role: 'district_officer',
    path: '/dho',
    description: 'DHO sees resolved care gap in telemetry and improved continuity metrics.',
  },
];

export const DemoController: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRoleSwitch = async (role: UserRole, targetPath: string) => {
    const creds: Record<UserRole, { u: string; p: string }> = {
      patient: { u: 'demo_patient', p: 'dori2024demo' },
      asha: { u: 'demo_asha', p: 'dori2024demo' },
      anm: { u: 'demo_anm', p: 'dori2024demo' },
      medical_officer: { u: 'demo_mo', p: 'dori2024demo' },
      district_officer: { u: 'demo_dho', p: 'dori2024demo' },
      referral_facility: { u: 'demo_referral', p: 'dori2024demo' },
      state_admin: { u: 'demo_state', p: 'dori2024demo' },
      national_admin: { u: 'demo_state', p: 'dori2024demo' },
      system_admin: { u: 'demo_admin', p: 'dori2024demo' },
    };

    try {
      const target = creds[role] || creds.system_admin;
      await login(target.u, target.p);
      navigate(targetPath);
    } catch {
      navigate(targetPath);
    }
  };

  const handleStepJump = (idx: number) => {
    setCurrentStepIdx(idx);
    const step = DEMO_STEPS[idx];
    handleRoleSwitch(step.role, step.path);
  };

  const nextStep = () => {
    if (currentStepIdx < DEMO_STEPS.length - 1) {
      handleStepJump(currentStepIdx + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIdx > 0) {
      handleStepJump(currentStepIdx - 1);
    }
  };

  const restartDemo = () => {
    setCurrentStepIdx(0);
    handleStepJump(0);
  };

  const currentStep = DEMO_STEPS[currentStepIdx];
  const roleLabels: Record<string, string> = {
    patient: 'Patient',
    asha: 'ASHA',
    medical_officer: 'Doctor',
    referral_facility: 'Specialist',
    district_officer: 'DHO',
    system_admin: 'Admin',
  };

  return (
    <aside className={`demo-controller ${isExpanded ? 'expanded' : ''}`} aria-label="Demo Controller">
      {/* Compact bar */}
      <div className="demo-bar">
        <div className="demo-bar-left">
          <DemoBadge />
          <span className="demo-bar-divider" />
          <span className="demo-step-indicator">
            Step {currentStepIdx + 1}/{DEMO_STEPS.length}: {currentStep.title}
          </span>
        </div>

        <div className="demo-bar-center">
          <button
            className="demo-step-btn"
            onClick={prevStep}
            disabled={currentStepIdx === 0}
            aria-label="Previous step"
          >
            <Icon name="chevron-left" size={14} />
          </button>

          {/* Progress dots */}
          <div className="demo-progress-dots">
            {DEMO_STEPS.map((_, i) => (
              <button
                key={i}
                className={`demo-dot ${i === currentStepIdx ? 'active' : ''} ${i < currentStepIdx ? 'completed' : ''}`}
                onClick={() => handleStepJump(i)}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <button
            className="demo-step-btn"
            onClick={nextStep}
            disabled={currentStepIdx === DEMO_STEPS.length - 1}
            aria-label="Next step"
          >
            <Icon name="chevron-right" size={14} />
          </button>
        </div>

        <div className="demo-bar-right">
          {/* Quick role chips */}
          <div className="demo-role-chips">
            {(['patient', 'asha', 'medical_officer', 'referral_facility', 'district_officer', 'system_admin'] as UserRole[]).map((r) => {
              const isActive = user?.role === r;
              const paths: Record<string, string> = {
                patient: '/patient',
                asha: '/asha',
                medical_officer: '/mo',
                referral_facility: '/referral',
                district_officer: '/dho',
                system_admin: '/admin',
              };
              return (
                <button
                  key={r}
                  className={`demo-role-chip ${isActive ? 'active' : ''}`}
                  onClick={() => handleRoleSwitch(r, paths[r])}
                >
                  {roleLabels[r] || r}
                </button>
              );
            })}
          </div>

          <button
            className="demo-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} />
            <span>{isExpanded ? 'Hide' : 'Guide'}</span>
          </button>
        </div>
      </div>

      {/* Expanded guide */}
      {isExpanded && (
        <div className="demo-expanded">
          <div className="demo-expanded-header">
            <div>
              <h3 className="demo-expanded-title">DORI Continuity of Care Demo</h3>
              <p className="demo-expanded-desc">{currentStep.description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={restartDemo}>
              Restart Demo
            </Button>
          </div>

          <div className="demo-steps-grid">
            {DEMO_STEPS.map((s, idx) => (
              <button
                key={s.step}
                className={`demo-step-card ${idx === currentStepIdx ? 'current' : ''} ${idx < currentStepIdx ? 'done' : ''}`}
                onClick={() => handleStepJump(idx)}
              >
                <div className="demo-step-num">
                  {idx < currentStepIdx ? (
                    <Icon name="check" size={12} />
                  ) : (
                    s.step
                  )}
                </div>
                <div className="demo-step-info">
                  <span className="demo-step-name">{s.title}</span>
                  <span className="demo-step-role">{s.role.replace(/_/g, ' ')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
