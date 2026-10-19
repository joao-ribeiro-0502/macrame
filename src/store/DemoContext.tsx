import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { DemoState } from '@/types';
import { demoReducer, type DemoAction } from '@/store/reducer';
import { loadDemoState, saveDemoState } from '@/lib/storage';

interface DemoContextValue {
  state: DemoState;
  dispatch: React.Dispatch<DemoAction>;
  /** Mensagem de recuperação quando os dados locais estavam inválidos. */
  recoveredMessage: string | null;
  clearRecovered: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadDemoState());
  const [state, dispatch] = useReducer(demoReducer, initial.current.state);
  const [recoveredMessage, setRecoveredMessage] = useState<string | null>(initial.current.recovered ?? null);

  // Persistência: grava apenas quando o estado muda (não a cada render).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    saveDemoState(state);
  }, [state]);

  return (
    <DemoContext.Provider
      value={{ state, dispatch, recoveredMessage, clearRecovered: () => setRecoveredMessage(null) }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) throw new Error('useDemo deve ser usado dentro de DemoProvider.');
  return context;
}
