/**
 * Camada de persistência local (localStorage).
 * Toda leitura/escrita é protegida contra dados corrompidos ou indisponíveis.
 *
 * Compatibilidade: o formato anterior (v1, sem marcas e com 5 canais) é
 * preservado em backup — nunca é apagado silenciosamente — e a demonstração é
 * recriada no novo formato multimarcas. Isso é comunicado ao usuário.
 */
import type { DemoState } from '@/types';
import { createInitialData } from '@/data/initialData';

export const STORAGE_KEY = 'macrame-demo:state:v2';
export const LEGACY_STORAGE_KEY = 'macrame-demo:state:v1';
export const LEGACY_BACKUP_KEY = 'macrame-demo:state:v1-backup';
export const SESSION_KEY = 'macrame-demo:session:v1';
export const STATE_VERSION = 2;

export interface LoadResult {
  state: DemoState;
  /** Motivo da recuperação, quando os dados locais não eram utilizáveis. */
  recovered?: string;
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // localStorage indisponível (modo privado, política, etc.)
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Verifica estrutura mínima; dados incompatíveis são descartados. */
function isValidState(value: unknown): value is DemoState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<DemoState>;
  return (
    typeof candidate.version === 'number' &&
    Array.isArray(candidate.brands) &&
    Array.isArray(candidate.products) &&
    Array.isArray(candidate.channels) &&
    Array.isArray(candidate.orders) &&
    Array.isArray(candidate.finance) &&
    Array.isArray(candidate.activity) &&
    typeof candidate.settings === 'object' &&
    candidate.settings !== null
  );
}

/** Migra esquemas antigos para a versão atual (ponto de extensão). */
function migrateDemoState(value: DemoState): DemoState {
  if (value.version >= STATE_VERSION) return value;
  return { ...value, version: STATE_VERSION };
}

/** Preserva o formato antigo em backup, sem sobrescrever um backup existente. */
function preserveLegacy(rawLegacy: string): void {
  if (!safeGet(LEGACY_BACKUP_KEY)) {
    safeSet(LEGACY_BACKUP_KEY, rawLegacy);
  }
}

export function loadDemoState(): LoadResult {
  const raw = safeGet(STORAGE_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isValidState(parsed)) {
        return {
          state: createInitialData(),
          recovered: 'Os dados locais do formato atual estavam incompletos e foram recriados.',
        };
      }
      return { state: migrateDemoState(parsed) };
    } catch {
      return {
        state: createInitialData(),
        recovered: 'Os dados locais do formato atual estavam corrompidos e foram recriados.',
      };
    }
  }

  // Nenhum dado no formato atual: verifica o formato anterior (sem marcas).
  const legacy = safeGet(LEGACY_STORAGE_KEY);
  if (legacy) {
    preserveLegacy(legacy);
    return {
      state: createInitialData(),
      recovered:
        'Os dados demonstrativos anteriores pertenciam ao formato antigo (sem marcas). Eles foram preservados em backup e a demonstração foi recriada no novo formato com as marcas Macramê do Leh e Brilho de Orixá.',
    };
  }

  return { state: createInitialData() };
}

export function saveDemoState(state: DemoState): boolean {
  return safeSet(STORAGE_KEY, JSON.stringify(state));
}

/** Restaura os dados de negócio ao estado inicial (não toca na sessão). */
export function resetDemoState(): DemoState {
  const fresh = createInitialData();
  saveDemoState(fresh);
  return fresh;
}

/* ------------------------------------------------------------------ */
/* Sessão demonstrativa                                                */
/* ------------------------------------------------------------------ */

export interface DemoSession {
  authenticated: boolean;
  loginAt: string;
}

export function loadSession(): DemoSession | null {
  const raw = safeGet(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      const session = parsed as Partial<DemoSession>;
      if (session.authenticated === true && typeof session.loginAt === 'string') {
        return { authenticated: true, loginAt: session.loginAt };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(): DemoSession {
  const session: DemoSession = { authenticated: true, loginAt: new Date().toISOString() };
  safeSet(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignorado: sessão é apenas barreira visual da demonstração */
  }
}
