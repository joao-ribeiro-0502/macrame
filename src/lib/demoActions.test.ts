import { describe, expect, it } from 'vitest';
import { fakeTrackingCode, paymentStatusFor, simulatePublication, uid, validateSettings } from '@/lib/demoActions';
import { createDemoChannels } from '@/data/demoChannels';
import { canPublish } from '@/lib/calculations';
import { createInitialData } from '@/data/initialData';
import type { Product, SalesChannel, Settings } from '@/types';

const channels = createDemoChannels();
// Todos os canais demo vêm habilitados; criamos um desabilitado apenas para o teste.
const disabledChannel: SalesChannel = { ...(channels.find((channel) => channel.enabled) ?? channels[4]), enabled: false };
const enabledChannel = channels.find((channel) => channel.enabled) ?? channels[0];

describe('simulação determinística de publicação', () => {
  it('publica com sucesso em canais habilitados', () => {
    const results = simulatePublication({
      channels,
      selectedIds: [enabledChannel.id],
      productName: 'Produto Teste',
    });
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('published');
    expect(results[0].publishedAt).toBeDefined();
  });

  it('falha em canais desabilitados', () => {
    const channelsWithDisabled = channels.map((channel) =>
      channel.id === disabledChannel.id ? disabledChannel : channel,
    );
    const results = simulatePublication({
      channels: channelsWithDisabled,
      selectedIds: [disabledChannel.id],
      productName: 'Produto Teste',
    });
    expect(results[0].status).toBe('failed');
    expect(results[0].message).toContain('desabilitado');
  });

  it('respeta falhas forçadas pela interface', () => {
    const results = simulatePublication({
      channels,
      selectedIds: [enabledChannel.id],
      forcedFailures: [enabledChannel.id],
      productName: 'Produto Teste',
    });
    expect(results[0].status).toBe('failed');
    expect(results[0].message).toContain('forçada');
  });

  it('é determinística: mesmas entradas, mesmos resultados', () => {
    const input = { channels, selectedIds: [enabledChannel.id, disabledChannel.id], productName: 'X' };
    const a = simulatePublication(input).map((item) => item.status);
    const b = simulatePublication(input).map((item) => item.status);
    expect(a).toEqual(b);
  });
});

describe('regras de publicação por estoque', () => {
  const state = createInitialData(new Date('2026-01-10T12:00:00Z'));
  const settings: Settings = state.settings;

  it('bloqueia publicação de produto sem estoque', () => {
    const product: Product = { ...state.products[0], stock: 0, status: 'active', sku: 'X-1', name: 'X' };
    const result = canPublish(product, settings);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('sem estoque');
  });

  it('bloqueia publicação de produto inativo', () => {
    const product: Product = { ...state.products[0], stock: 10, status: 'inactive', sku: 'X-1', name: 'X' };
    expect(canPublish(product, settings).ok).toBe(false);
  });

  it('permite publicação de produto ativo com estoque', () => {
    const product: Product = { ...state.products[0], stock: 10, status: 'active', sku: 'X-1', name: 'X' };
    expect(canPublish(product, settings).ok).toBe(true);
  });
});

describe('validação de configurações', () => {
  const base: Settings = {
    alertThreshold: 10,
    criticalThreshold: 5,
    priorityChannels: [],
    channelAllocation: {},
    notificationsEnabled: true,
    compactTables: false,
    physicalStoreReserve: 0,
  };

  it('aceita limites coerentes', () => {
    expect(validateSettings(base).ok).toBe(true);
  });

  it('recusa limite crítico maior que o de alerta', () => {
    const result = validateSettings({ ...base, criticalThreshold: 15 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('menor ou igual');
  });

  it('recusa valores negativos', () => {
    expect(validateSettings({ ...base, alertThreshold: -1 }).ok).toBe(false);
    expect(validateSettings({ ...base, physicalStoreReserve: -2 }).ok).toBe(false);
  });
});

describe('utilitários', () => {
  it('gera identificadores únicos', () => {
    const ids = new Set(Array.from({ length: 200 }, () => uid('x')));
    expect(ids.size).toBe(200);
  });

  it('gera código de rastreamento fictício determinístico', () => {
    expect(fakeTrackingCode('#10012')).toBe('BRMDL00010012');
    expect(fakeTrackingCode('#10012')).toBe(fakeTrackingCode('#10012'));
  });

  it('deriva status de pagamento coerente com o pedido', () => {
    expect(paymentStatusFor('paid')).toBe('paid');
    expect(paymentStatusFor('delivered')).toBe('paid');
    expect(paymentStatusFor('new')).toBe('pending');
    expect(paymentStatusFor('cancelled')).toBe('refunded');
  });
});
