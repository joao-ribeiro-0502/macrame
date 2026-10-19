import { describe, expect, it } from 'vitest';
import {
  ALL_SCOPE,
  brandComparison,
  canTransition,
  channelsForBrand,
  dashboardMetrics,
  describePeriod,
  financeSummary,
  isWithin,
  nextOrderStatuses,
  orderTotals,
  periodRange,
  revenueByChannel,
  salesEvolution,
  salesEvolutionBars,
  scopeFinance,
  scopedOrders,
  scopedProducts,
  stockDistribution,
  stockLevel,
  topProducts,
} from '@/lib/calculations';
import { createInitialData } from '@/data/initialData';
import { DEMO_CHANNEL_IDS } from '@/data/demoChannels';
import type { DemoState, Order, Settings } from '@/types';

const SETTINGS: Settings = {
  alertThreshold: 10,
  criticalThreshold: 5,
  priorityChannels: [DEMO_CHANNEL_IDS.macrameNuvemshop, DEMO_CHANNEL_IDS.macrameMercadoLivre],
  channelAllocation: { [DEMO_CHANNEL_IDS.macrameNuvemshop]: 50, [DEMO_CHANNEL_IDS.macrameMercadoLivre]: 50 },
  notificationsEnabled: true,
  compactTables: false,
  physicalStoreReserve: 0,
};

/** Pedido mínimo para testes de agregação (só os campos que as contas usam). */
function makeOrder(overrides: Partial<Order> & { id: string; createdAt: string; total: number }): Order {
  return {
    orderNumber: overrides.id.toUpperCase(),
    brandId: 'macrame',
    channelId: DEMO_CHANNEL_IDS.macrameNuvemshop,
    customerName: 'Cliente Fictício',
    customerCity: 'São Paulo',
    customerEmail: 'cliente@exemplo.test',
    items: [],
    subtotal: overrides.total,
    shipping: 0,
    discount: 0,
    paymentStatus: 'paid',
    orderStatus: 'paid',
    events: [],
    stockDeducted: true,
    stockRestored: false,
    ...overrides,
  };
}

describe('stockLevel (regras de estoque)', () => {
  it('classifica estoque zerado como "out"', () => {
    expect(stockLevel(0, SETTINGS)).toBe('out');
  });

  it('classifica valores até o limite crítico como "critical"', () => {
    expect(stockLevel(1, SETTINGS)).toBe('critical');
    expect(stockLevel(5, SETTINGS)).toBe('critical');
  });

  it('classifica valores entre crítico e alerta como "low"', () => {
    expect(stockLevel(6, SETTINGS)).toBe('low');
    expect(stockLevel(10, SETTINGS)).toBe('low');
  });

  it('classifica acima do alerta como "normal"', () => {
    expect(stockLevel(11, SETTINGS)).toBe('normal');
    expect(stockLevel(100, SETTINGS)).toBe('normal');
  });

  it('respeita limites configurados diferentes', () => {
    const custom = { alertThreshold: 20, criticalThreshold: 8 };
    expect(stockLevel(8, custom)).toBe('critical');
    expect(stockLevel(15, custom)).toBe('low');
    expect(stockLevel(21, custom)).toBe('normal');
  });
});

describe('orderTotals', () => {
  it('calcula subtotal e total com frete e desconto', () => {
    const result = orderTotals(
      [
        { quantity: 2, unitPrice: 50 },
        { quantity: 1, unitPrice: 25.5 },
      ],
      20,
      25.5,
    );
    expect(result.subtotal).toBe(125.5);
    expect(result.total).toBe(120);
  });

  it('não permite total negativo', () => {
    const result = orderTotals([{ quantity: 1, unitPrice: 10 }], 0, 50);
    expect(result.total).toBe(0);
  });
});

describe('transições de pedido', () => {
  it('permite o fluxo principal Novo → Pago → Entregue', () => {
    expect(canTransition('new', 'paid')).toBe(true);
    expect(canTransition('paid', 'separating')).toBe(true);
    expect(canTransition('separating', 'shipped')).toBe(true);
    expect(canTransition('shipped', 'delivered')).toBe(true);
    expect(canTransition('delivered', 'cancelled')).toBe(false);
  });

  it('impede voltar de entregue para pago', () => {
    expect(canTransition('delivered', 'paid')).toBe(false);
    expect(nextOrderStatuses('delivered')).toEqual([]);
    expect(nextOrderStatuses('cancelled')).toEqual([]);
  });
});

describe('métricas comerciais', () => {
  // Dados semente relativos ao "agora" real: os filtros de período usam new Date().
  const state: DemoState = createInitialData(new Date());

  it('não contabiliza pedidos cancelados como faturamento', () => {
    const range = periodRange('30d');
    const inRange = (order: Order) => isWithin(order.createdAt, range);
    const metrics = dashboardMetrics(state, '30d');
    const cancelledTotal = state.orders
      .filter((order) => order.orderStatus === 'cancelled')
      .filter(inRange)
      .reduce((sum, order) => sum + order.total, 0);
    const allTotal = state.orders.filter(inRange).reduce((sum, order) => sum + order.total, 0);
    expect(metrics.revenue).toBe(Math.round((allTotal - cancelledTotal) * 100) / 100);
  });

  it('gera dados coerentes para o período', () => {
    const metrics = dashboardMetrics(state, '30d');
    expect(metrics.orders).toBeGreaterThan(0);
    expect(metrics.totalProducts).toBe(state.products.length);
    expect(metrics.averageTicket).toBeGreaterThan(0);
  });

  it('calcula ticket médio e top produtos', () => {
    const metrics = dashboardMetrics(state, '30d');
    const top = topProducts(state, '30d', 3);
    expect(metrics.averageTicket).toBeCloseTo(metrics.revenue / metrics.orders, 1);
    if (top.length > 0) expect(top[0].units).toBeGreaterThan(0);
  });

  it('agrupa faturamento por canal', () => {
    const byChannel = revenueByChannel(state, '30d');
    expect(byChannel.length).toBe(state.channels.length);
    const total = byChannel.reduce((sum, row) => sum + row.revenue, 0);
    expect(total).toBeGreaterThan(0);
  });
});

describe('financeiro', () => {
  const state: DemoState = createInitialData(new Date());

  it('soma entradas e saídas conforme status', () => {
    const summary = financeSummary(state.finance, '30d');
    expect(summary.income).toBeGreaterThan(0);
    expect(summary.expense).toBeGreaterThan(0);
    expect(summary.net).toBeCloseTo(summary.income - summary.expense, 2);
  });

  it('não conta lançamentos cancelados', () => {
    const cancelled: Array<Pick<Order, 'total'>> = [];
    expect(cancelled).toHaveLength(0);
    const withCancelled = {
      ...state,
      finance: [
        ...state.finance,
        {
          id: 'fin-x',
          description: 'cancelado',
          type: 'income' as const,
          category: 'Teste',
          amount: 9999,
          date: new Date().toISOString(),
          status: 'cancelled' as const,
        },
      ],
    };
    const base = financeSummary(state.finance, '30d');
    const next = financeSummary(withCancelled.finance, '30d');
    expect(next.income).toBe(base.income);
  });
});

describe('distribuição de estoque simulada', () => {
  const state: DemoState = createInitialData(new Date());

  it('distribui entre canais habilitados e selecionados', () => {
    const product = state.products.find((item) => item.stock > 10 && item.channels.length >= 2);
    expect(product).toBeDefined();
    if (!product) return;
    const slices = stockDistribution(product, state.channels, SETTINGS);
    expect(slices.length).toBeGreaterThan(0);
    const allocated = slices.reduce((sum, slice) => sum + slice.allocated, 0);
    expect(allocated).toBeLessThanOrEqual(product.stock);
  });

  it('concentra disponibilidade em canais prioritários quando crítico', () => {
    const product = { ...state.products[0], stock: 4, channels: [DEMO_CHANNEL_IDS.macrameNuvemshop, DEMO_CHANNEL_IDS.macrameShopee] };
    const slices = stockDistribution(product, state.channels, SETTINGS);
    const priority = slices.find((slice) => slice.channel.id === DEMO_CHANNEL_IDS.macrameNuvemshop);
    const nonPriority = slices.find((slice) => slice.channel.id === DEMO_CHANNEL_IDS.macrameShopee);
    expect(priority?.priority).toBe(true);
    if (priority && nonPriority) {
      expect(priority.allocated).toBeGreaterThanOrEqual(nonPriority.allocated);
    }
  });

  it('retorna vazio para produto sem estoque', () => {
    const product = { ...state.products[0], stock: 0 };
    expect(stockDistribution(product, state.channels, SETTINGS)).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* Multimarca: escopo, separação e comparação                          */
/* ------------------------------------------------------------------ */

describe('escopo de marca (multimarca)', () => {
  const state = createInitialData(new Date('2026-02-01T12:00:00Z'));

  it('cada marca possui exatamente 4 canais (plataformas)', () => {
    expect(channelsForBrand(state.channels, 'macrame')).toHaveLength(4);
    expect(channelsForBrand(state.channels, 'brilho')).toHaveLength(4);
    expect(channelsForBrand(state.channels, 'all')).toHaveLength(8);
  });

  it('canais de uma marca nunca incluem a outra', () => {
    const macrame = channelsForBrand(state.channels, 'macrame');
    const brilho = channelsForBrand(state.channels, 'brilho');
    expect(macrame.every((channel) => channel.brandId === 'macrame')).toBe(true);
    expect(brilho.every((channel) => channel.brandId === 'brilho')).toBe(true);
    const ids = new Set(macrame.map((channel) => channel.id));
    expect(brilho.some((channel) => ids.has(channel.id))).toBe(false);
  });

  it('scopedProducts retorna apenas produtos da marca', () => {
    const macrame = scopedProducts(state.products, { brandId: 'macrame', channelId: 'all' });
    const brilho = scopedProducts(state.products, { brandId: 'brilho', channelId: 'all' });
    expect(macrame.length).toBeGreaterThan(0);
    expect(brilho.length).toBeGreaterThan(0);
    expect(macrame.every((product) => product.brandId === 'macrame')).toBe(true);
    expect(brilho.every((product) => product.brandId === 'brilho')).toBe(true);
    // Nenhum produto aparece nas duas marcas.
    const macrameIds = new Set(macrame.map((product) => product.id));
    expect(brilho.some((product) => macrameIds.has(product.id))).toBe(false);
  });

  it('scopedOrders retorna apenas pedidos da marca', () => {
    const macrame = scopedOrders(state.orders, { brandId: 'macrame', channelId: 'all' });
    const brilho = scopedOrders(state.orders, { brandId: 'brilho', channelId: 'all' });
    expect(macrame.length).toBeGreaterThan(0);
    expect(brilho.length).toBeGreaterThan(0);
    expect(macrame.every((order) => order.brandId === 'macrame')).toBe(true);
    expect(brilho.every((order) => order.brandId === 'brilho')).toBe(true);
  });

  it('marca e canal combinam sem que um limpia o outro', () => {
    const macrameNuvem = { brandId: 'macrame', channelId: DEMO_CHANNEL_IDS.macrameNuvemshop } as const;
    const scoped = scopedOrders(state.orders, macrameNuvem);
    expect(scoped.every((order) => order.brandId === 'macrame')).toBe(true);
    expect(scoped.every((order) => order.channelId === DEMO_CHANNEL_IDS.macrameNuvemshop)).toBe(true);
  });

  it('scopeFinance exclui lançamentos consolidados ao filtrar por marca', () => {
    const consolidated = state.finance.filter((entry) => !entry.brandId);
    const macrame = scopeFinance(state.finance, { brandId: 'macrame', channelId: 'all' });
    expect(consolidated.length).toBeGreaterThan(0);
    expect(macrame.every((entry) => entry.brandId === 'macrame')).toBe(true);
    expect(macrame.some((entry) => !entry.brandId)).toBe(false);
  });

  it('dashboardMetrics por marca nunca mistura totais', () => {
    const all = dashboardMetrics(state, '30d', ALL_SCOPE);
    const macrame = dashboardMetrics(state, '30d', { brandId: 'macrame', channelId: 'all' });
    const brilho = dashboardMetrics(state, '30d', { brandId: 'brilho', channelId: 'all' });
    expect(macrame.orders + brilho.orders).toBe(all.orders);
    expect(macrame.totalProducts).toBe(scopedProducts(state.products, { brandId: 'macrame', channelId: 'all' }).length);
    expect(macrame.totalChannels).toBe(4);
    expect(brilho.totalChannels).toBe(4);
  });

  it('brandComparison separa as duas marcas com canais próprios', () => {
    const comparison = brandComparison(state, '30d');
    expect(comparison).toHaveLength(2);
    const [first, second] = comparison;
    expect(first.brand.id).not.toBe(second.brand.id);
    expect(first.channels.every((row) => row.channel.brandId === first.brand.id)).toBe(true);
    expect(second.channels.every((row) => row.channel.brandId === second.brand.id)).toBe(true);
    expect(first.totalChannels).toBe(4);
    expect(second.totalChannels).toBe(4);
  });
});

describe('período personalizado (calendário)', () => {
  it('resolve o intervalo escolhido com limites exatos no fuso local', () => {
    const range = periodRange({ from: '2026-03-10', to: '2026-03-20' });
    expect(range.start.getFullYear()).toBe(2026);
    expect(range.start.getMonth()).toBe(2); // março (0-based)
    expect(range.start.getDate()).toBe(10);
    expect(range.start.getHours()).toBe(0);
    expect(range.start.getMilliseconds()).toBe(0);

    expect(range.end.getDate()).toBe(20);
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMinutes()).toBe(59);
    expect(range.end.getMilliseconds()).toBe(999);
  });

  it('aceita intervalos que cruzam meses e anos', () => {
    const range = periodRange({ from: '2024-11-20', to: '2025-02-03' });
    expect(range.start.getFullYear()).toBe(2024);
    expect(range.start.getMonth()).toBe(10); // novembro
    expect(range.end.getFullYear()).toBe(2025);
    expect(range.end.getMonth()).toBe(1); // fevereiro
  });

  it('normaliza um intervalo informado invertido', () => {
    const range = periodRange({ from: '2026-03-20', to: '2026-03-10' });
    expect(range.start.getDate()).toBe(10);
    expect(range.end.getDate()).toBe(20);
  });

  it('datas vazias ou inexistentes caem em "hoje" sem quebrar', () => {
    const now = new Date(2026, 5, 15, 10, 0, 0);
    expect(periodRange({ from: '', to: '' }, now).start.getDate()).toBe(15);
    // 31 de fevereiro não existe → nunca deve virar 02/03 silenciosamente.
    expect(periodRange({ from: '2026-02-31', to: '2026-03-05' }, now).start.getDate()).toBe(15);
  });

  it('describePeriod mostra o preset OU o intervalo formatado', () => {
    const presetRange = periodRange('30d');
    expect(describePeriod('30d', presetRange)).toBe('Últimos 30 dias');

    const custom = { from: '2026-01-05', to: '2026-01-19' };
    expect(describePeriod(custom, periodRange(custom))).toBe('05/01/2026 a 19/01/2026');
  });

  it('intervalos curtos continuam agrupados POR DIA', () => {
    const custom = { from: '2026-01-20', to: '2026-01-29' };
    const points = salesEvolution([], custom, new Date(2026, 5, 15));
    expect(points).toHaveLength(10); // 20 a 29 de janeiro = 10 dias
    expect(points[0].label.startsWith('20')).toBe(true); // rótulo diário: "20/01"
    expect(points.reduce((sum, point) => sum + point.pedidos, 0)).toBe(0);
  });

  it('intervalos longos passam a agrupar POR Mês (um ponto por mês)', () => {
    const custom = { from: '2025-09-01', to: '2026-02-28' };
    const points = salesEvolution([], custom, new Date(2026, 5, 15));
    expect(points).toHaveLength(6); // set/2025 … fev/2026
    expect(points[0].label.startsWith('09')).toBe(true); // rótulo mensal: "09/25"
    expect(points[points.length - 1].label.startsWith('02')).toBe(true);
  });

  it('um intervalo de CINCO ANOS vira ~60 pontos mensais (não 1825 diários)', () => {
    const custom = { from: '2021-01-01', to: '2025-12-31' };
    const points = salesEvolution([], custom, new Date(2026, 5, 15));
    expect(points).toHaveLength(60); // 5 anos × 12 meses
  });

  it('métricas do dashboard aceitam o intervalo personalizado coerentemente', () => {
    const now = new Date(2026, 5, 15, 12, 0, 0);
    const state: DemoState = createInitialData(now);
    const custom = { from: '2026-01-01', to: '2026-12-31' };

    const customMetrics = dashboardMetrics(state, custom, ALL_SCOPE);
    const yearMetrics = dashboardMetrics(state, 'month', ALL_SCOPE);

    // Todo pedido cai dentro do ano corrente → pelo menos o que o mês atual mostra.
    expect(customMetrics.orders).toBeGreaterThanOrEqual(yearMetrics.orders);
    expect(customMetrics.revenue).toBeGreaterThanOrEqual(yearMetrics.revenue);
    expect(customMetrics.averageTicket).toBeGreaterThan(0);

    // O comparativo de marcas também aceita o intervalo.
    expect(brandComparison(state, custom)).toHaveLength(2);
    expect(revenueByChannel(state, custom)).toHaveLength(state.channels.length);
    expect(topProducts(state, custom, 5)).toHaveLength(5);
  });
});

describe('evolução em barras (um período por linha)', () => {
  const now = new Date(2026, 5, 15, 12, 0, 0);

  it('escolhe a granularidade pela largura da janela', () => {
    expect(salesEvolutionBars([], { from: '2026-06-01', to: '2026-06-10' }, now).grain).toBe('day');
    expect(salesEvolutionBars([], { from: '2026-06-01', to: '2026-06-30' }, now).grain).toBe('week');
    expect(salesEvolutionBars([], { from: '2026-01-01', to: '2026-06-30' }, now).grain).toBe('month');
    expect(salesEvolutionBars([], { from: '2021-01-01', to: '2025-12-31' }, now).grain).toBe('year');
  });

  it('mantém sempre poucas linhas, mesmo num intervalo de cinco anos', () => {
    const { rows } = salesEvolutionBars([], { from: '2021-01-01', to: '2025-12-31' }, now);
    expect(rows).toHaveLength(5); // 2021 … 2025, um por ano
    expect(rows[0].label).toBe('2021');
    expect(rows[4].label).toBe('2025');
  });

  it('agrupa por semana em "Últimos 30 dias" (evita 30 linhas diárias)', () => {
    const { grain, rows } = salesEvolutionBars([], '30d', now);
    expect(grain).toBe('week');
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.length).toBeLessThanOrEqual(6);
  });

  it('soma o faturamento e conta os pedidos de cada período', () => {
    const orders: Order[] = [
      makeOrder({ id: 'o1', createdAt: '2026-06-02T10:00:00.000Z', total: 100 }),
      makeOrder({ id: 'o2', createdAt: '2026-06-03T10:00:00.000Z', total: 50, orderStatus: 'shipped' }),
      makeOrder({ id: 'o3', createdAt: '2026-06-20T10:00:00.000Z', total: 30 }),
    ];
    const { rows } = salesEvolutionBars(orders, { from: '2026-06-01', to: '2026-06-30' }, now);
    const total = rows.reduce((sum, row) => sum + row.faturamento, 0);
    const pedidos = rows.reduce((sum, row) => sum + row.pedidos, 0);
    expect(total).toBe(180);
    expect(pedidos).toBe(3);
  });

  it('ignora pedidos cancelados, igual aos demais indicadores', () => {
    const orders: Order[] = [
      makeOrder({ id: 'c1', createdAt: '2026-06-02T10:00:00.000Z', total: 100 }),
      makeOrder({ id: 'c2', createdAt: '2026-06-03T10:00:00.000Z', total: 999, orderStatus: 'cancelled' }),
    ];
    const { rows } = salesEvolutionBars(orders, { from: '2026-06-01', to: '2026-06-30' }, now);
    expect(rows.reduce((sum, row) => sum + row.faturamento, 0)).toBe(100);
    expect(rows.reduce((sum, row) => sum + row.pedidos, 0)).toBe(1);
  });

  it('períodos sem venda aparecem zerados (não desaparecem da lista)', () => {
    const { rows } = salesEvolutionBars([], { from: '2026-01-01', to: '2026-06-30' }, now);
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.faturamento === 0 && row.pedidos === 0)).toBe(true);
  });
});
