import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSession,
  loadDemoState,
  loadSession,
  resetDemoState,
  saveDemoState,
  saveSession,
  STORAGE_KEY,
  SESSION_KEY,
} from '@/lib/storage';
import { createInitialData } from '@/data/initialData';

/** localStorage fake para o ambiente node do Vitest. */
function installFakeStorage() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal('window', { localStorage: localStorageMock });
  return store;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  installFakeStorage();
});

describe('persistência da demonstração', () => {
  it('inicializa com dados fictícios na primeira execução', () => {
    const { state, recovered } = loadDemoState();
    expect(recovered).toBeUndefined();
    expect(state.products.length).toBeGreaterThanOrEqual(15);
    expect(state.orders.length).toBeGreaterThanOrEqual(25);
    expect(state.channels.length).toBe(8);
    expect(state.finance.length).toBeGreaterThanOrEqual(10);
    expect(state.brands.map((brand) => brand.id).sort()).toEqual(['brilho', 'macrame']);
    expect(state.products.every((product) => product.brandId === 'macrame' || product.brandId === 'brilho')).toBe(true);
    expect(state.orders.every((order) => order.brandId === 'macrame' || order.brandId === 'brilho')).toBe(true);
    // 8 combinações marca × plataforma (2 marcas × 4 plataformas).
    expect(state.channels.filter((channel) => channel.brandId === 'macrame')).toHaveLength(4);
    expect(state.channels.filter((channel) => channel.brandId === 'brilho')).toHaveLength(4);
  });

  it('salva e recarrega o estado completo', () => {
    const state = createInitialData(new Date('2026-02-01T10:00:00Z'));
    state.products[0].stock = 77;
    expect(saveDemoState(state)).toBe(true);

    const loaded = loadDemoState();
    expect(loaded.recovered).toBeUndefined();
    expect(loaded.state.products[0].stock).toBe(77);
    expect(loaded.state.seededAt).toBe(state.seededAt);
  });

  it('recupera o estado inicial quando os dados estão corrompidos', () => {
    const store = installFakeStorage();
    store.set(STORAGE_KEY, '{ não é json válido');
    const { state, recovered } = loadDemoState();
    expect(recovered).toContain('corrompidos');
    expect(state.products.length).toBeGreaterThanOrEqual(15);
  });

  it('recupera o estado inicial quando o esquema é incompatível', () => {
    const store = installFakeStorage();
    store.set(STORAGE_KEY, JSON.stringify({ version: 1, products: 'não é array' }));
    const { state, recovered } = loadDemoState();
    expect(recovered).toContain('incompletos');
    expect(Array.isArray(state.orders)).toBe(true);
  });

  it('resetDemoState restaura os dados e não cria sessão', () => {
    const state = createInitialData();
    state.products[0].name = 'Produto alterado';
    saveDemoState(state);

    const fresh = resetDemoState();
    expect(fresh.products.some((product) => product.name === 'Produto alterado')).toBe(false);
    expect(loadSession()).toBeNull();
  });
});

describe('sessão demonstrativa', () => {
  it('salva, carrega e limpa a sessão', () => {
    expect(loadSession()).toBeNull();
    const session = saveSession();
    expect(session.authenticated).toBe(true);
    expect(loadSession()?.authenticated).toBe(true);
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it('sessão inválida no storage é ignorada', () => {
    const store = installFakeStorage();
    store.set(SESSION_KEY, JSON.stringify({ authenticated: 'sim' }));
    expect(loadSession()).toBeNull();
  });
});
