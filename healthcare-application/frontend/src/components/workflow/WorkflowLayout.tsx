import React from 'react';
import { WorkflowStepper } from './WorkflowStepper';
import { Button } from '../ui/Button';
import type { WorkflowStepDef, StepStatus } from './useWorkflow';
import './WorkflowLayout.css';

interface WorkflowLayoutProps {
  steps: WorkflowStepDef[];
  currentStepIndex: number;
  getStepStatus: (id: string) => StepStatus;
  onStepClick?: (index: number) => void;
  onBack?: () => void;
  onContinue?: () => void;
  onRestart?: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isComplete: boolean;
  continueLabel?: string;
  backLabel?: string;
  stepContent: React.ReactNode;
  contextPanel?: React.ReactNode;
  stepTitle?: string;
  className?: string;
}

export const WorkflowLayout: React.FC<WorkflowLayoutProps> = ({
  steps,
  currentStepIndex,
  getStepStatus,
  onStepClick,
  onBack,
  onContinue,
  onRestart,
  isFirstStep,
  isLastStep,
  isComplete,
  continueLabel = 'Continue',
  backLabel = 'Back',
  stepContent,
  contextPanel,
  stepTitle,
  className = '',
}) => {
  return (
    <div className={`workflow-layout ${className}`}>
      {/* Left: Stepper */}
      <aside className="workflow-sidebar">
        <WorkflowStepper
          steps={steps}
          currentStepIndex={currentStepIndex}
          getStepStatus={getStepStatus}
          onStepClick={onStepClick}
        />
        {onRestart && (
          <div className="workflow-sidebar-footer">
            <Button variant="ghost" size="sm" onClick={onRestart}>
              Restart workflow
            </Button>
          </div>
        )}
      </aside>

      {/* Center: Content */}
      <main className="workflow-main">
        {!isComplete && (
          <div className="workflow-step-header">
            <span className="workflow-step-counter">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            {stepTitle && <h2 className="workflow-step-title">{stepTitle}</h2>}
          </div>
        )}

        <div className="workflow-step-content">
          {stepContent}
        </div>

        {!isComplete && (
          <div className="workflow-navigation">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              disabled={isFirstStep}
            >
              {backLabel}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onContinue}
            >
              {isLastStep ? 'Complete' : continueLabel}
            </Button>
          </div>
        )}
      </main>

      {/* Right: Context Panel */}
      {contextPanel && (
        <aside className="workflow-context">
          {contextPanel}
        </aside>
      )}
    </div>
  );
};
