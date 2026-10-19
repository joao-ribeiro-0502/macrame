/**
 * Regras de domínio centralizadas.
 * Nenhum componente deve espalhar limites de estoque ou regras de cálculo.
 *
 * As funções que dependem do estado aceitam um `DataScope` que combina MARCA
 * e CANAL. Os dois filtros funcionam em conjunto: selecionar um canal NÃO
 * substitui nem apaga a marca selecionada.
 */
import type {
  Brand,
  BrandId,
  DataScope,
  DemoState,
  FinanceEntry,
  Order,
  OrderStatus,
  PeriodInput,
  PeriodKey,
  PeriodRange,
  Product,
  SalesChannel,
  Settings,
  StockLevel,
} from '@/types';
import { BRANDS } from '@/data/brands';

/* ------------------------------------------------------------------ */
/* Escopo (marca + canal)                                              */
/* ------------------------------------------------------------------ */

export const ALL_SCOPE: DataScope = { brandId: 'all', channelId: 'all' };

export function channelsForBrand(
  channels: SalesChannel[],
  brandId: BrandId | 'all',
): SalesChannel[] {
  return brandId === 'all'
    ? channels
    : channels.filter((channel) => channel.brandId === brandId);
}

/** Canais dentro do escopo (respeita marca e canal simultaneamente). */
export function scopedChannels(
  channels: SalesChannel[],
  scope: DataScope = ALL_SCOPE,
): SalesChannel[] {
  return channelsForBrand(channels, scope.brandId).filter(
    (channel) => scope.channelId === 'all' || channel.id === scope.channelId,
  );
}

/** Produtos da marca no escopo (e anunciados no canal, quando houver). */
export function scopedProducts(
  products: Product[],
  scope: DataScope = ALL_SCOPE,
): Product[] {
  return products.filter((product) => {
    if (scope.brandId !== 'all' && product.brandId !== scope.brandId) return false;
    if (scope.channelId !== 'all' && !product.channels.includes(scope.channelId)) return false;
    return true;
  });
}

/** Pedidos da marca no escopo (e do canal, quando houver). */
export function scopedOrders(orders: Order[], scope: DataScope = ALL_SCOPE): Order[] {
  return orders.filter((order) => {
    if (scope.brandId !== 'all' && order.brandId !== scope.brandId) return false;
    if (scope.channelId !== 'all' && order.channelId !== scope.channelId) return false;
    return true;
  });
}

/**
 * Lançamentos financeiros no escopo.
 * Em uma visão por marca, lançamentos CONSOLIDADOS (sem marca) são excluídos,
 * para nunca misturar valores das duas marcas.
 */
export function scopeFinance(
  entries: FinanceEntry[],
  scope: DataScope = ALL_SCOPE,
): FinanceEntry[] {
  return entries.filter((entry) => {
    if (scope.brandId !== 'all' && entry.brandId !== scope.brandId) return false;
    if (scope.channelId !== 'all' && entry.channelId !== scope.channelId) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Períodos                                                            */
/* ------------------------------------------------------------------ */

/** Converte `yyyy-mm-dd` em Date no fuso LOCAL (evita o deslocamento do parse UTC). */
function fromISO(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  // Rejeita datas inexistentes (ex.: 2026-02-31) em vez de aceitá-las silenciosamente.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/**
 * Resolve um PERÍODO em intervalo concreto de datas.
 * Aceita tanto as pré-definições ("Últimos 30 dias", …) quanto um intervalo
 * personalizado escolhido no calendário ({ from, to }).
 */
export function periodRange(period: PeriodInput, now: Date = new Date()): PeriodRange {
  if (typeof period !== 'string') {
    const from = fromISO(period.from);
    const to = fromISO(period.to);
    // Datas vazias/inválidas caem em "hoje" — nunca quebra a tela.
    if (!from || !to) return periodRange('today', now);
    const [start, end] = from.getTime() <= to.getTime() ? [from, to] : [to, from];
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      break;
    case '7d':
      start.setDate(start.getDate() - 6);
      break;
    case '30d':
      start.setDate(start.getDate() - 29);
      break;
    case 'month':
      start.setDate(1);
      break;
  }
  return { start, end };
}

export function isWithin(iso: string, range: PeriodRange): boolean {
  const time = new Date(iso).getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  month: 'Este mês',
};

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatPeriodLabel(range: PeriodRange): string {
  return `${shortDateFormatter.format(range.start)} a ${shortDateFormatter.format(range.end)}`;
}

/**
 * Rótulo legível de qualquer PERÍODO: pré-definição ("Últimos 30 dias") ou
 * intervalo personalizado escolhido no calendário ("01/01/2026 a 31/01/2026").
 */
export function describePeriod(period: PeriodInput, range: PeriodRange): string {
  return typeof period === 'string' ? PERIOD_LABELS[period] : formatPeriodLabel(range);
}

/* ------------------------------------------------------------------ */
/* Regras de estoque                                                   */
/* ------------------------------------------------------------------ */

/**
 * Classifica o estoque considerando as configurações:
 * - 0 unidades            → "out" (bloqueia publicação simulada)
 * - <= limite crítico     → "critical" (aplica regra de prioridade)
 * - <= limite de alerta   → "low"
 * - demais                → "normal"
 */
export function stockLevel(stock: number, settings: Pick<Settings, 'alertThreshold' | 'criticalThreshold'>): StockLevel {
  if (stock <= 0) return 'out';
  if (stock <= settings.criticalThreshold) return 'critical';
  if (stock <= settings.alertThreshold) return 'low';
  return 'normal';
}

export function productStockLevel(product: Product, settings: Settings): StockLevel {
  return stockLevel(product.stock, settings);
}

export const STOCK_LEVEL_META: Record<StockLevel, { label: string; tone: 'positive' | 'warning' | 'critical' | 'neutral' }> = {
  normal: { label: 'Estoque normal', tone: 'positive' },
  low: { label: 'Estoque baixo', tone: 'warning' },
  critical: { label: 'Estoque crítico', tone: 'critical' },
  out: { label: 'Sem estoque', tone: 'critical' },
};

/** Publicação simulada exige estoque disponível. */
export function canPublish(product: Product, settings: Settings): { ok: boolean; reason?: string } {
  if (product.stock <= 0) {
    return { ok: false, reason: 'Produto sem estoque indisponível para publicação simulada.' };
  }
  if (product.status === 'inactive') {
    return { ok: false, reason: 'Produto inativo não pode ser publicado.' };
  }
  if (product.sku.trim().length === 0 || product.name.trim().length === 0) {
    return { ok: false, reason: 'Preencha nome e SKU antes de publicar.' };
  }
  void settings;
  return { ok: true };
}

export interface DistributionSlice {
  channel: SalesChannel;
  allocated: number;
  priority: boolean;
}

/**
 * Distribuição SIMULADA de estoque por canal.
 * Critérios: apenas canais habilitados, da MESMA MARCA do produto e
 * selecionados nele; canais prioritários (configurados) retêm a maior fatia
 * quando o estoque é crítico.
 */
export function stockDistribution(
  product: Product,
  channels: SalesChannel[],
  settings: Settings,
): DistributionSlice[] {
  const eligible = channels.filter(
    (channel) =>
      channel.enabled &&
      channel.brandId === product.brandId &&
      product.channels.includes(channel.id),
  );
  if (eligible.length === 0 || product.stock <= 0) return [];

  const level = productStockLevel(product, settings);
  const allocation = settings.channelAllocation ?? {};

  return eligible.map((channel) => {
    const priority = settings.priorityChannels.includes(channel.id);
    let weight = Number(allocation[channel.id] ?? 0);
    if (level === 'critical' || level === 'out') {
      // Em situação crítica, os canais prioritários concentram a disponibilidade.
      weight = priority ? Math.max(weight, 60) : Math.min(weight, 20);
    }
    return {
      channel,
      priority,
      allocated: Math.floor((product.stock * weight) / 100),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Transições de pedido                                                */
/* ------------------------------------------------------------------ */

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['awaiting_payment', 'paid', 'cancelled'],
  awaiting_payment: ['paid', 'cancelled'],
  paid: ['separating', 'cancelled'],
  separating: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function nextOrderStatuses(current: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[current] ?? [];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return nextOrderStatuses(from).includes(to);
}

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: 'neutral' | 'info' | 'positive' | 'warning' | 'critical' }> = {
  new: { label: 'Novo', tone: 'info' },
  awaiting_payment: { label: 'Aguardando pagamento', tone: 'warning' },
  paid: { label: 'Pago', tone: 'positive' },
  separating: { label: 'Em separação', tone: 'info' },
  shipped: { label: 'Enviado', tone: 'info' },
  delivered: { label: 'Entregue', tone: 'positive' },
  cancelled: { label: 'Cancelado', tone: 'critical' },
};

/* ------------------------------------------------------------------ */
/* Cálculos de pedido                                                  */
/* ------------------------------------------------------------------ */

export interface OrderTotals {
  subtotal: number;
  total: number;
}

export function orderTotals(
  items: Array<{ quantity: number; unitPrice: number }>,
  shipping: number,
  discount: number,
): OrderTotals {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = Math.max(0, subtotal + shipping - discount);
  return { subtotal: round2(subtotal), total: round2(total) };
}

export function orderItemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Métricas comerciais                                                 */
/* ------------------------------------------------------------------ */

/**
 * Regra de faturamento: considera apenas pedidos NÃO cancelados cuja data
 * está no período. Pedidos ainda não pagos entram como "previsto" — por isso
 * o dashboard separa "faturamento confirmado" (pedidos pagos+).
 */
export function isRevenueOrder(order: Order): boolean {
  return order.orderStatus !== 'cancelled';
}

export function isConfirmedRevenue(order: Order): boolean {
  return ['paid', 'separating', 'shipped', 'delivered'].includes(order.orderStatus);
}

export interface DashboardMetrics {
  revenue: number;
  confirmedRevenue: number;
  orders: number;
  averageTicket: number;
  unitsSold: number;
  lowStockProducts: number;
  totalProducts: number;
  enabledChannels: number;
  totalChannels: number;
}

export function dashboardMetrics(
  state: DemoState,
  period: PeriodInput,
  scope: DataScope = ALL_SCOPE,
): DashboardMetrics {
  const range = periodRange(period);
  const orders = scopedOrders(state.orders, scope).filter((order) => isWithin(order.createdAt, range));
  const products = scopedProducts(state.products, scope);
  const channels = scopedChannels(state.channels, scope);

  const valid = orders.filter(isRevenueOrder);
  const confirmed = orders.filter(isConfirmedRevenue);

  const revenue = valid.reduce((sum, order) => sum + order.total, 0);
  const confirmedRevenue = confirmed.reduce((sum, order) => sum + order.total, 0);
  const unitsSold = valid.reduce(
    (sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0),
    0,
  );
  const lowStockProducts = products.filter(
    (product) => product.status !== 'inactive' && stockLevel(product.stock, state.settings) !== 'normal',
  ).length;

  return {
    revenue: round2(revenue),
    confirmedRevenue: round2(confirmedRevenue),
    orders: valid.length,
    averageTicket: valid.length > 0 ? round2(revenue / valid.length) : 0,
    unitsSold,
    lowStockProducts,
    totalProducts: products.length,
    enabledChannels: channels.filter((channel) => channel.enabled).length,
    totalChannels: channels.length,
  };
}

export interface BrandComparison {
  brand: Brand;
  revenue: number;
  confirmedRevenue: number;
  orders: number;
  unitsSold: number;
  averageTicket: number;
  lowStockProducts: number;
  totalProducts: number;
  enabledChannels: number;
  totalChannels: number;
  channels: ChannelSales[];
}

/**
 * Comparativo entre as marcas para a visão consolidada.
 * Cada marca é calculada de forma independente — os valores nunca se misturam.
 */
export function brandComparison(state: DemoState, period: PeriodInput): BrandComparison[] {
  return BRANDS.map((brand) => {
    const metrics = dashboardMetrics(state, period, { brandId: brand.id, channelId: 'all' });
    return {
      brand,
      revenue: metrics.revenue,
      confirmedRevenue: metrics.confirmedRevenue,
      orders: metrics.orders,
      unitsSold: metrics.unitsSold,
      averageTicket: metrics.averageTicket,
      lowStockProducts: metrics.lowStockProducts,
      totalProducts: metrics.totalProducts,
      enabledChannels: metrics.enabledChannels,
      totalChannels: metrics.totalChannels,
      channels: revenueByChannel(state, period, { brandId: brand.id, channelId: 'all' }),
    };
  });
}

/**
 * Evolução das vendas para o gráfico de linha.
 *
 * A granularidade é ADAPTATIVA ao tamanho do período, para que um intervalo
 * personalizado longo (um ano, cinco anos…) continue legível e rápido:
 * - até 62 dias → agrupamento DIÁRIO
 * - acima disso  → agrupamento MENSAL (um ponto por mês)
 */
export function salesEvolution(
  orders: Order[],
  period: PeriodInput,
  now: Date = new Date(),
): Array<{ label: string; faturamento: number; pedidos: number }> {
  const range = periodRange(period, now);
  const valid = orders.filter((order) => isRevenueOrder(order) && isWithin(order.createdAt, range));

  const spanDays = Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1;
  return spanDays > 62
    ? monthlyEvolution(valid, range)
    : dailyEvolution(valid, range);
}

/** Agrupamento diário (períodos curtos). */
function dailyEvolution(
  valid: Order[],
  range: PeriodRange,
): Array<{ label: string; faturamento: number; pedidos: number }> {
  const days: Date[] = [];
  const cursor = new Date(range.start);
  while (cursor.getTime() <= range.end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days.map((day) => {
    const next = new Date(day);
    next.setHours(23, 59, 59, 999);
    const dayOrders = valid.filter((order) => {
      const time = new Date(order.createdAt).getTime();
      return time >= day.getTime() && time <= next.getTime();
    });
    return {
      label: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      faturamento: round2(dayOrders.reduce((sum, order) => sum + order.total, 0)),
      pedidos: dayOrders.length,
    };
  });
}

/** Agrupamento mensal (períodos longos) — um ponto por mês, `mm/aa`. */
function monthlyEvolution(
  valid: Order[],
  range: PeriodRange,
): Array<{ label: string; faturamento: number; pedidos: number }> {
  const buckets: Array<{ year: number; month: number }> = [];
  let year = range.start.getFullYear();
  let month = range.start.getMonth();
  const endYear = range.end.getFullYear();
  const endMonth = range.end.getMonth();

  // Proteção contra intervalos absurdos (o calendário limita a faixa de anos).
  while ((year < endYear || (year === endYear && month <= endMonth)) && buckets.length < 240) {
    buckets.push({ year, month });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return buckets.map((bucket) => {
    const start = new Date(bucket.year, bucket.month, 1);
    const end = new Date(bucket.year, bucket.month + 1, 0, 23, 59, 59, 999);
    const monthOrders = valid.filter((order) => {
      const time = new Date(order.createdAt).getTime();
      return time >= start.getTime() && time <= end.getTime();
    });
    return {
      label: start.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' }),
      faturamento: round2(monthOrders.reduce((sum, order) => sum + order.total, 0)),
      pedidos: monthOrders.length,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Evolução em BARRAS (estilo gráfico de pesquisa)                     */
/* ------------------------------------------------------------------ */

/**
 * Granularidade usada pelo gráfico de EVOLUÇÃO EM BARRAS.
 *
 * Diferente do gráfico de linha (`salesEvolution`), aqui cada período vira uma
 * LINHA. Se cada linha fosse um dia, "Últimos 30 dias" geraria 30 barras e o
 * card ficaria enorme — justamente o problema do gráfico esticado. Então o
 * agrupamento se ajusta para manter poucas linhas, sempre legíveis:
 *
 * | Janela        | Agrupamento | Linhas máx. |
 * | ------------- | ----------- | ----------- |
 * | até 14 dias   | diário      | ~14         |
 * | até 45 dias   | semanal     | ~7          |
 * | até 12 meses  | mensal      | 12          |
 * | acima         | anual       | poucas      |
 */
export type EvolutionGrain = 'day' | 'week' | 'month' | 'year';

export const EVOLUTION_GRAIN_LABELS: Record<EvolutionGrain, string> = {
  day: 'diário',
  week: 'semanal',
  month: 'mensal',
  year: 'anual',
};

export interface EvolutionSeries {
  grain: EvolutionGrain;
  rows: Array<{ label: string; faturamento: number; pedidos: number }>;
}

export function salesEvolutionBars(
  orders: Order[],
  period: PeriodInput,
  now: Date = new Date(),
): EvolutionSeries {
  const range = periodRange(period, now);
  const valid = orders.filter((order) => isRevenueOrder(order) && isWithin(order.createdAt, range));
  const spanDays = Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1;

  if (spanDays <= 14) return { grain: 'day', rows: bucketize(valid, range, 'day') };
  if (spanDays <= 45) return { grain: 'week', rows: bucketize(valid, range, 'week') };
  if (spanDays <= 371) return { grain: 'month', rows: bucketize(valid, range, 'month') };
  return { grain: 'year', rows: bucketize(valid, range, 'year') };
}

/** Gera os intervalos (baldes) de uma granularidade, sempre em ordem cronológica. */
function bucketize(
  valid: Order[],
  range: PeriodRange,
  grain: EvolutionGrain,
): Array<{ label: string; faturamento: number; pedidos: number }> {
  const windows = buildWindows(range, grain);
  return windows.map(({ start, end, label }) => {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const inside = valid.filter((order) => {
      const time = new Date(order.createdAt).getTime();
      return time >= startTime && time <= endTime;
    });
    return {
      label,
      faturamento: round2(inside.reduce((sum, order) => sum + order.total, 0)),
      pedidos: inside.length,
    };
  });
}

function buildWindows(
  range: PeriodRange,
  grain: EvolutionGrain,
): Array<{ start: Date; end: Date; label: string }> {
  const windows: Array<{ start: Date; end: Date; label: string }> = [];
  const shortDate = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  if (grain === 'day' || grain === 'week') {
    const step = grain === 'day' ? 1 : 7;
    const cursor = new Date(range.start);
    while (cursor.getTime() <= range.end.getTime() && windows.length < 120) {
      const start = new Date(cursor);
      const end = new Date(cursor);
      end.setDate(end.getDate() + (step - 1));
      end.setHours(23, 59, 59, 999);
      windows.push({ start, end, label: shortDate(start) });
      cursor.setDate(cursor.getDate() + step);
    }
    return windows;
  }

  if (grain === 'month') {
    let year = range.start.getFullYear();
    let month = range.start.getMonth();
    const endYear = range.end.getFullYear();
    const endMonth = range.end.getMonth();
    while ((year < endYear || (year === endYear && month <= endMonth)) && windows.length < 120) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      windows.push({ start, end, label: start.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' }) });
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    return windows;
  }

  for (
    let year = range.start.getFullYear();
    year <= range.end.getFullYear() && windows.length < 40;
    year += 1
  ) {
    windows.push({
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
      label: String(year),
    });
  }
  return windows;
}

export interface ChannelSales {
  channel: SalesChannel;
  revenue: number;
  orders: number;
  units: number;
}

export function revenueByChannel(
  state: DemoState,
  period: PeriodInput,
  scope: DataScope = ALL_SCOPE,
): ChannelSales[] {
  const range = periodRange(period);
  const valid = scopedOrders(state.orders, scope).filter(
    (order) => isRevenueOrder(order) && isWithin(order.createdAt, range),
  );
  return scopedChannels(state.channels, scope)
    .map((channel) => {
      const orders = valid.filter((order) => order.channelId === channel.id);
      return {
        channel,
        revenue: round2(orders.reduce((sum, order) => sum + order.total, 0)),
        orders: orders.length,
        units: orders.reduce(
          (sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0),
          0,
        ),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export interface ProductSales {
  productId: string;
  name: string;
  sku: string;
  units: number;
  revenue: number;
}

export function topProducts(
  state: DemoState,
  period: PeriodInput,
  limit = 6,
  scope: DataScope = ALL_SCOPE,
): ProductSales[] {
  const range = periodRange(period);
  const valid = scopedOrders(state.orders, scope).filter(
    (order) => isRevenueOrder(order) && isWithin(order.createdAt, range),
  );
  const map = new Map<string, ProductSales>();
  for (const order of valid) {
    for (const item of order.items) {
      const current = map.get(item.productId) ?? {
        productId: item.productId,
        name: item.productName,
        sku: item.sku,
        units: 0,
        revenue: 0,
      };
      current.units += item.quantity;
      current.revenue = round2(current.revenue + item.quantity * item.unitPrice);
      map.set(item.productId, current);
    }
  }
  return [...map.values()].sort((a, b) => b.units - a.units).slice(0, limit);
}

export function ordersByStatus(orders: Order[]): Array<{ status: OrderStatus; label: string; count: number }> {
  const keys: OrderStatus[] = ['new', 'awaiting_payment', 'paid', 'separating', 'shipped', 'delivered', 'cancelled'];
  return keys.map((status) => ({
    status,
    label: ORDER_STATUS_META[status].label,
    count: orders.filter((order) => order.orderStatus === status).length,
  }));
}

/* ------------------------------------------------------------------ */
/* Financeiro                                                          */
/* ------------------------------------------------------------------ */

/**
 * Receita derivada de pedidos: cada pedido gera no máximo UM lançamento
 * (FinanceEntry.orderId). Alterar status/itens de um pedido nunca cria
 * receita duplicada — a criação é idempotente em demoActions/reducer.
 */
export function financeSummary(entries: FinanceEntry[], period: PeriodKey): {
  income: number;
  expense: number;
  net: number;
  count: number;
} {
  const range = periodRange(period);
  const active = entries.filter(
    (entry) => entry.status !== 'cancelled' && isWithin(entry.date, range),
  );
  const income = round2(
    active.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0),
  );
  const expense = round2(
    active.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0),
  );
  return { income, expense, net: round2(income - expense), count: active.length };
}

export function expensesByCategory(entries: FinanceEntry[], period: PeriodKey): Array<{ category: string; total: number }> {
  const range = periodRange(period);
  const map = new Map<string, number>();
  for (const entry of entries) {
    if (entry.type !== 'expense' || entry.status === 'cancelled') continue;
    if (!isWithin(entry.date, range)) continue;
    map.set(entry.category, round2((map.get(entry.category) ?? 0) + entry.amount));
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function incomeByChannel(entries: FinanceEntry[], channels: SalesChannel[], period: PeriodKey): Array<{ channel: SalesChannel; total: number }> {
  const range = periodRange(period);
  return channels
    .map((channel) => ({
      channel,
      total: round2(
        entries
          .filter(
            (entry) =>
              entry.type === 'income' &&
              entry.status !== 'cancelled' &&
              entry.channelId === channel.id &&
              isWithin(entry.date, range),
          )
          .reduce((sum, entry) => sum + entry.amount, 0),
      ),
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** Evolução mensal (últimos 6 meses) para gráfico financeiro. */
export function financeMonthlyEvolution(entries: FinanceEntry[], now: Date = new Date()): Array<{ label: string; entradas: number; saidas: number }> {
  const months: Array<{ label: string; start: Date; end: Date }> = [];
  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    months.push({
      label: start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
      start,
      end,
    });
  }
  const active = entries.filter((entry) => entry.status !== 'cancelled');
  return months.map((month) => ({
    label: month.label,
    entradas: round2(
      active
        .filter((entry) => {
          const time = new Date(entry.date).getTime();
          return entry.type === 'income' && time >= month.start.getTime() && time <= month.end.getTime();
        })
        .reduce((sum, entry) => sum + entry.amount, 0),
    ),
    saidas: round2(
      active
        .filter((entry) => {
          const time = new Date(entry.date).getTime();
          return entry.type === 'expense' && time >= month.start.getTime() && time <= month.end.getTime();
        })
        .reduce((sum, entry) => sum + entry.amount, 0),
    ),
  }));
}
