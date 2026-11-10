import React from 'react';
import { Icon } from '../ui/Icon';
import type { StepStatus, WorkflowStepDef } from './useWorkflow';
import './WorkflowStepper.css';

interface WorkflowStepperProps {
  steps: WorkflowStepDef[];
  currentStepIndex: number;
  getStepStatus: (id: string) => StepStatus;
  onStepClick?: (index: number) => void;
  className?: string;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  steps,
  currentStepIndex,
  getStepStatus,
  onStepClick,
  className = '',
}) => {
  return (
    <nav className={`workflow-stepper ${className}`} aria-label="Workflow progress">
      <ol className="stepper-list">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isClickable = onStepClick && (status === 'completed' || index === currentStepIndex);

          return (
            <li key={step.id} className={`stepper-item stepper-${status}`}>
              <button
                className="stepper-button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                aria-current={status === 'current' ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${step.title} — ${status.replace('_', ' ')}`}
              >
                <span className={`stepper-indicator stepper-indicator-${status}`} aria-hidden="true">
                  {status === 'completed' ? (
                    <Icon name="check" size={14} />
                  ) : status === 'error' ? (
                    <Icon name="alert" size={14} />
                  ) : status === 'blocked' ? (
                    <Icon name="lock" size={14} />
                  ) : (
                    <span className="stepper-number">{index + 1}</span>
                  )}
                </span>
                <span className="stepper-text">
                  <span className="stepper-step-title">{step.title}</span>
                  {step.description && (
                    <span className="stepper-step-desc">{step.description}</span>
                  )}
                </span>
              </button>
              {index < steps.length - 1 && (
                <span className={`stepper-connector stepper-connector-${status === 'completed' ? 'done' : 'pending'}`} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
