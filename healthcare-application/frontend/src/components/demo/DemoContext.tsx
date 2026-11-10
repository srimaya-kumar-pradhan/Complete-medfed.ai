import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface DemoState {
  isDemoMode: boolean;
  isJudgeMode: boolean;
  demoStep: number;
}

interface DemoContextType extends DemoState {
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  enterJudgeMode: () => void;
  exitJudgeMode: () => void;
  setDemoStep: (step: number) => void;
  restartDemo: () => void;
}

const DemoContext = createContext<DemoContextType | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>({
    isDemoMode: true, // Default to demo mode for SIH evaluation
    isJudgeMode: false,
    demoStep: 0,
  });

  const enterDemoMode = useCallback(() => {
    setState((prev) => ({ ...prev, isDemoMode: true, demoStep: 0 }));
  }, []);

  const exitDemoMode = useCallback(() => {
    setState((prev) => ({ ...prev, isDemoMode: false, isJudgeMode: false, demoStep: 0 }));
  }, []);

  const enterJudgeMode = useCallback(() => {
    setState((prev) => ({ ...prev, isDemoMode: true, isJudgeMode: true, demoStep: 0 }));
  }, []);

  const exitJudgeMode = useCallback(() => {
    setState((prev) => ({ ...prev, isJudgeMode: false }));
  }, []);

  const setDemoStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, demoStep: step }));
  }, []);

  const restartDemo = useCallback(() => {
    setState((prev) => ({ ...prev, demoStep: 0 }));
  }, []);

  return (
    <DemoContext.Provider value={{ ...state, enterDemoMode, exitDemoMode, enterJudgeMode, exitJudgeMode, setDemoStep, restartDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextType {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
