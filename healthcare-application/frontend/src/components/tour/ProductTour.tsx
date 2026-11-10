import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import './ProductTour.css';

interface TourStep {
  title: string;
  badge: string;
  icon: 'passport' | 'timeline' | 'brain' | 'hospital' | 'sync' | 'network';
  description: string;
  keyInnovations: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Verifiable Digital Care Passport',
    badge: 'Citizen Sovereignty',
    icon: 'passport',
    description:
      'Replaces fragile paper slips with an offline-verifiable, cryptographically signed digital credential. Citizens own their health record and grant granular selective disclosure.',
    keyInnovations: [
      'Ed25519 asymmetric signatures for offline verification without internet',
      'Pseudonymous IDs (PID) protecting privacy under DPDP Act 2023',
      'Emergency break-glass protocol with mandatory immutable audit logging',
    ],
  },
  {
    title: 'Longitudinal Touchpoint Timeline',
    badge: 'Continuity of Care',
    icon: 'timeline',
    description:
      'Aggregates encounters across Sub-Centers, Community Health Centres, pathology labs, and district hospitals into a single unified patient journey.',
    keyInnovations: [
      'Cross-facility touchpoint stitching without duplicate records',
      'Longitudinal maternal tracking across all gestational trimesters',
      'Attested clinical notes and lab panel verifications',
    ],
  },
  {
    title: 'Explainable Edge Care-Gap AI',
    badge: 'Predictive Intervention',
    icon: 'brain',
    description:
      'Edge machine learning models analyze intervals between touchpoints, travel friction, and vitals to forecast dropout risks before acute emergencies occur.',
    keyInnovations: [
      'Explainable risk factor attribution (distance, past overdue patterns)',
      'Assistive clinical decision support with strict human-in-the-loop oversight',
      'Early warning notifications routed directly to village ASHA tablets',
    ],
  },
  {
    title: 'Closed-Loop Referral Highway',
    badge: 'Seamless Triage',
    icon: 'hospital',
    description:
      'Eliminates the broken referral loop where over 70% of rural patients sent to higher centers have no follow-up communicated back to their primary health worker.',
    keyInnovations: [
      'Referral-Ready verification checklist before patient transit',
      'Real-time lifecycle tracking: Issued → In Transit → Arrived → Completed',
      'Specialist discharge findings automatically dispatched back to village ASHA',
    ],
  },
  {
    title: 'Offline-First Sync Engine',
    badge: 'Frontline Resilience',
    icon: 'sync',
    description:
      'Frontline tablets operate seamlessly in deep rural 0kbps environments using IndexedDB offline caching and conflict-free data replication algorithms.',
    keyInnovations: [
      'Zero-delay offline logging during home visits and immunization camps',
      'Automatic opportunistic burst sync when 2G/3G connectivity is detected',
      'Tamper-evident client-side cryptographic queue',
    ],
  },
  {
    title: 'Territorial & Federated Intelligence',
    badge: 'Public Health Command',
    icon: 'network',
    description:
      'Decentralized epidemiological command enables district officers to monitor health continuums and train AI models collaboratively without centralized data pooling.',
    keyInnovations: [
      'Administrative block heatmaps identifying high-risk maternal dropouts',
      'Zero-knowledge Poisson anomaly radar for early outbreak detection',
      'Federated learning (MedFed-AI) with differential privacy guarantee (ε=0.5)',
    ],
  },
];

interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProductTour: React.FC<ProductTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="product-tour-overlay" onClick={onClose}>
      <div
        className="product-tour-modal"
        role="dialog"
        aria-modal="true"
        aria-label="DORI Product Tour"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tour-top-bar">
          <span className="tour-step-badge">
            {step.badge} • Step {currentStep + 1} of {TOUR_STEPS.length}
          </span>
          <button className="tour-close-btn" onClick={onClose} aria-label="Close product tour">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="tour-step-body">
          <div className="tour-icon-wrap">
            <Icon name={step.icon} size={28} color="var(--color-teal)" />
          </div>

          <h3 className="tour-step-title">{step.title}</h3>
          <p className="tour-step-desc">{step.description}</p>

          <div className="tour-innovations-box">
            <h4 className="innovations-heading">Core Architectural Innovations:</h4>
            <ul className="innovations-list">
              {step.keyInnovations.map((item, idx) => (
                <li key={idx}>
                  <Icon name="check" size={14} color="var(--color-teal)" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="tour-footer">
          {/* Progress dots */}
          <div className="tour-dots-wrap">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                className={`tour-dot ${i === currentStep ? 'active' : ''}`}
                onClick={() => setCurrentStep(i)}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <div className="tour-actions-group">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Skip Tour
            </Button>
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                Previous
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleNext}>
              {isLast ? 'Finish Tour' : 'Next Step'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
