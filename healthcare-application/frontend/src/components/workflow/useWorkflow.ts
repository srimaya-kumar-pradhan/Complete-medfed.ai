import { useState, useCallback } from 'react';

export type StepStatus = 'not_started' | 'current' | 'completed' | 'blocked' | 'skipped' | 'error';

export interface WorkflowStepDef {
  id: string;
  title: string;
  description?: string;
  isOptional?: boolean;
}

export interface WorkflowState {
  steps: WorkflowStepDef[];
  currentStepIndex: number;
  stepStatuses: Record<string, StepStatus>;
  isComplete: boolean;
}

export function useWorkflow(stepDefs: WorkflowStepDef[]) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>(() => {
    const initial: Record<string, StepStatus> = {};
    stepDefs.forEach((s, i) => {
      initial[s.id] = i === 0 ? 'current' : 'not_started';
    });
    return initial;
  });

  const currentStep = stepDefs[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === stepDefs.length - 1;
  const isComplete = currentStepIndex >= stepDefs.length;

  const getStepStatus = useCallback((stepId: string): StepStatus => {
    return stepStatuses[stepId] || 'not_started';
  }, [stepStatuses]);

  const goToStep = useCallback((index: number) => {
    if (index < 0 || index >= stepDefs.length) return;
    setStepStatuses((prev) => {
      const next = { ...prev };
      // Mark current as completed if moving forward
      if (currentStepIndex < index) {
        next[stepDefs[currentStepIndex].id] = 'completed';
      }
      next[stepDefs[index].id] = 'current';
      return next;
    });
    setCurrentStepIndex(index);
  }, [currentStepIndex, stepDefs]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < stepDefs.length - 1) {
      goToStep(currentStepIndex + 1);
    } else {
      // Completing last step
      setStepStatuses((prev) => ({
        ...prev,
        [stepDefs[currentStepIndex].id]: 'completed',
      }));
      setCurrentStepIndex(stepDefs.length);
    }
  }, [currentStepIndex, stepDefs, goToStep]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setStepStatuses((prev) => ({
        ...prev,
        [stepDefs[currentStepIndex].id]: 'not_started',
        [stepDefs[currentStepIndex - 1].id]: 'current',
      }));
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex, stepDefs]);

  const markStepStatus = useCallback((stepId: string, status: StepStatus) => {
    setStepStatuses((prev) => ({ ...prev, [stepId]: status }));
  }, []);

  const restartWorkflow = useCallback(() => {
    const initial: Record<string, StepStatus> = {};
    stepDefs.forEach((s, i) => {
      initial[s.id] = i === 0 ? 'current' : 'not_started';
    });
    setStepStatuses(initial);
    setCurrentStepIndex(0);
  }, [stepDefs]);

  const skipStep = useCallback(() => {
    if (currentStepIndex < stepDefs.length - 1) {
      setStepStatuses((prev) => ({
        ...prev,
        [stepDefs[currentStepIndex].id]: 'skipped',
        [stepDefs[currentStepIndex + 1].id]: 'current',
      }));
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex, stepDefs]);

  return {
    steps: stepDefs,
    currentStep,
    currentStepIndex,
    stepStatuses,
    isFirstStep,
    isLastStep,
    isComplete,
    getStepStatus,
    goToStep,
    nextStep,
    prevStep,
    skipStep,
    markStepStatus,
    restartWorkflow,
  };
}
