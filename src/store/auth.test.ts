import { describe, expect, it } from 'vitest';
import { validateDemoCredentials, DEMO_CREDENTIALS } from '@/store/AuthContext';

describe('autenticação demonstrativa', () => {
  it('aceita as credenciais configuradas', () => {
    expect(validateDemoCredentials(DEMO_CREDENTIALS.login, DEMO_CREDENTIALS.password)).toBe(true);
  });

  it('ignora maiúsculas/minúsculas e espaços acidentais no identificador', () => {
    expect(validateDemoCredentials('macrame do leh', '123')).toBe(true);
    expect(validateDemoCredentials('  MACRAME DO LEH  ', '123')).toBe(true);
    // Espaços extras no MEIO do identificador não são tolerados pela regra.
    expect(validateDemoCredentials('Macrame  Do Leh', '123')).toBe(false);
  });

  it('não ignora variações da senha', () => {
    expect(validateDemoCredentials(DEMO_CREDENTIALS.login, '12')).toBe(false);
    expect(validateDemoCredentials(DEMO_CREDENTIALS.login, '123 ')).toBe(false);
    expect(validateDemoCredentials(DEMO_CREDENTIALS.login, '')).toBe(false);
  });

  it('rejeita identificadores desconhecidos', () => {
    expect(validateDemoCredentials('admin', '123')).toBe(false);
    expect(validateDemoCredentials('', '123')).toBe(false);
    expect(validateDemoCredentials('macrame do lehman', '123')).toBe(false);
  });
});
