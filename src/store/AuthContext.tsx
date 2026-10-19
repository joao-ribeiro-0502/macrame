import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { clearSession, loadSession, saveSession } from '@/lib/storage';

/**
 * Sessão demonstrativa.
 * ATENÇÃO: isto NÃO é um mecanismo de segurança real — é apenas uma barreira
 * visual para a apresentação comercial. A senha é conhecida por quem lê o código.
 */
export const DEMO_CREDENTIALS = {
  login: 'Macrame do Leh',
  password: '123',
} as const;

/**
 * Valida as credenciais demonstrativas.
 * O identificador ignora maiúsculas/minúsculas e espaços acidentais.
 */
export function validateDemoCredentials(identifier: string, password: string): boolean {
  const validIdentifier =
    identifier.trim().toLowerCase() === DEMO_CREDENTIALS.login.trim().toLowerCase();
  const validPassword = password === DEMO_CREDENTIALS.password;
  return validIdentifier && validPassword;
}

interface AuthContextValue {
  authenticated: boolean;
  login: (identifier: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean>(() => loadSession()?.authenticated === true);

  const login = useCallback((identifier: string, password: string): boolean => {
    if (validateDemoCredentials(identifier, password)) {
      saveSession();
      setAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    // Limpa somente a sessão — produtos, pedidos e demais dados permanecem.
    clearSession();
    setAuthenticated(false);
  }, []);

  const value = useMemo(() => ({ authenticated, login, logout }), [authenticated, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
