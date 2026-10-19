import { describe, expect, it } from 'vitest';
import { demoReducer, type DemoAction } from '@/store/reducer';
import { createInitialData } from '@/data/initialData';
import type { DemoState, Order } from '@/types';

function baseState(): DemoState {
  return createInitialData(new Date('2026-01-15T12:00:00Z'));
}

function findPendingOrder(state: DemoState): Order {
  const order = state.orders.find((item) => item.orderStatus === 'awaiting_payment');
  if (!order) throw new Error('Pedido pendente não encontrado nos dados semente.');
  return order;
}

function stockOf(state: DemoState, productId: string): number {
  return state.products.find((product) => product.id === productId)?.stock ?? -1;
}

describe('reducer: transição de pedido e idempotência de estoque', () => {
  it('baixa o estoque apenas uma vez ao marcar como pago', () => {
    const state = baseState();
    const order = findPendingOrder(state);
    const before = order.items.map((item) => ({ id: item.productId, stock: stockOf(state, item.productId) }));

    const paid = demoReducer(state, { type: 'ORDER_STATUS', orderId: order.id, to: 'paid' });
    for (const item of before) {
      expect(stockOf(paid, item.id)).toBe(item.stock - (order.items.find((i) => i.productId === item.id)?.quantity ?? 0));
    }
    expect(paid.orders.find((item) => item.id === order.id)?.stockDeducted).toBe(true);

    // Transições seguintes não podem baixar estoque novamente.
    const separating = demoReducer(paid, { type: 'ORDER_STATUS', orderId: order.id, to: 'separating' });
    const shipped = demoReducer(separating, { type: 'ORDER_STATUS', orderId: order.id, to: 'shipped' });
    const delivered = demoReducer(shipped, { type: 'ORDER_STATUS', orderId: order.id, to: 'delivered' });
    for (const item of before) {
      expect(stockOf(delivered, item.id)).toBe(stockOf(paid, item.id));
    }
  });

  it('cria exatamente um lançamento financeiro por pedido pago', () => {
    const state = baseState();
    const order = findPendingOrder(state);

    let next = demoReducer(state, { type: 'ORDER_STATUS', orderId: order.id, to: 'paid' });
    const entriesAfterFirst = next.finance.filter((entry) => entry.orderId === order.id);
    expect(entriesAfterFirst).toHaveLength(1);

    next = demoReducer(next, { type: 'ORDER_STATUS', orderId: order.id, to: 'separating' });
    next = demoReducer(next, { type: 'ORDER_STATUS', orderId: order.id, to: 'shipped' });
    expect(next.finance.filter((entry) => entry.orderId === order.id)).toHaveLength(1);
  });

  it('reposta o estoque exatamente uma vez ao cancelar pedido pago', () => {
    const state = baseState();
    const order = findPendingOrder(state);

    const paid = demoReducer(state, { type: 'ORDER_STATUS', orderId: order.id, to: 'paid' });
    const afterCancel = demoReducer(paid, { type: 'ORDER_STATUS', orderId: order.id, to: 'cancelled' });

    const original = state.orders.find((item) => item.id === order.id) as Order;
    for (const item of original.items) {
      expect(stockOf(afterCancel, item.productId)).toBe(stockOf(state, item.productId));
    }
    expect(afterCancel.orders.find((item) => item.id === order.id)?.stockRestored).toBe(true);

    // Cancelar novamente é inválido e não altera nada.
    const again = demoReducer(afterCancel, { type: 'ORDER_STATUS', orderId: order.id, to: 'cancelled' });
    expect(again).toBe(afterCancel);
  });

  it('cancela (e não exclui) a receita vinculada ao pedido', () => {
    const state = baseState();
    const order = findPendingOrder(state);
    const paid = demoReducer(state, { type: 'ORDER_STATUS', orderId: order.id, to: 'paid' });
    const entry = paid.finance.find((item) => item.orderId === order.id);
    expect(entry).toBeDefined();
    if (!entry) return;

    const cancelled = demoReducer(paid, { type: 'FINANCE_DELETE', entryId: entry.id });
    const kept = cancelled.finance.find((item) => item.id === entry.id);
    expect(kept).toBeDefined();
    expect(kept?.status).toBe('cancelled');
  });

  it('impede transições incoerentes de pedido', () => {
    const state = baseState();
    const order = state.orders.find((item) => item.orderStatus === 'delivered');
    expect(order).toBeDefined();
    if (!order) return;
    const next = demoReducer(state, { type: 'ORDER_STATUS', orderId: order.id, to: 'paid' });
    expect(next).toBe(state);
  });
});

describe('reducer: produtos e estoque', () => {
  it('atualiza estoque e registra atividade', () => {
    const state = baseState();
    const product = state.products[0];
    const next = demoReducer(state, { type: 'STOCK_SET', productId: product.id, stock: 42, reason: 'Teste' });
    expect(stockOf(next, product.id)).toBe(42);
    expect(next.activity[0].type).toBe('stock_changed');
  });

  it('faz upsert por id, preservando a quantidade de produtos', () => {
    const state = baseState();
    const [first, second] = state.products;
    const next = demoReducer(state, {
      type: 'PRODUCT_SAVE',
      isNew: false,
      product: { ...first, sku: second.sku },
    });
    // A validação de SKU exclusivo é responsabilidade do formulário (zod + regra extra);
    // o reducer garante atualização por id sem duplicar registros.
    expect(next.products).toHaveLength(state.products.length);
    expect(next.products.find((item) => item.id === first.id)?.sku).toBe(second.sku);
  });

  it('registra resultados de publicação por canal', () => {
    const state = baseState();
    const product = state.products.find((item) => item.channels.length > 0);
    expect(product).toBeDefined();
    if (!product) return;
    const channelId = product.channels[0];
    const next = demoReducer(state, {
      type: 'PRODUCT_PUBLISH_RESULT',
      productId: product.id,
      results: [{ channelId, status: 'published', message: 'ok', publishedAt: new Date().toISOString() }],
    });
    const saved = next.products.find((item) => item.id === product.id);
    expect(saved?.publications.some((pub) => pub.channelId === channelId && pub.status === 'published')).toBe(true);
    expect(next.activity[0].type).toBe('publish_success');
  });
});

describe('reducer: restauração', () => {
  it('RESET devolve um estado novo coerente', () => {
    const state = baseState();
    const mutated = demoReducer(state, { type: 'CHANNEL_TOGGLE', channelId: state.channels[0].id });
    const reset = demoReducer(mutated, { type: 'RESET' });
    expect(reset.products.length).toBeGreaterThan(10);
    expect(reset.orders.length).toBeGreaterThan(20);
    expect(reset.channels.find((item) => item.id === state.channels[0].id)?.enabled).toBe(
      state.channels[0].enabled,
    );
  });
});

// Garante que o tipo de ação cobre os casos usados acima.
const _typeCheck: DemoAction = { type: 'RESET' };
void _typeCheck;
