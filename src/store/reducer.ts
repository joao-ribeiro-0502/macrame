/**
 * Reducer central da demonstração.
 * Toda mutação de negócio passa por aqui, o que mantém atividade, estoque,
 * financeiro e pedidos sempre coerentes entre si — e sempre ligados à marca
 * correta (nenhuma mutação troca a marca de um registro existente).
 */
import type {
  ActivityEvent,
  DemoState,
  FinanceEntry,
  Order,
  OrderStatus,
  Product,
  ProductPublication,
  Settings,
} from '@/types';
import { canTransition, ORDER_STATUS_META, round2 } from '@/lib/calculations';
import { buildActivity, fakeTrackingCode, paymentStatusFor, uid } from '@/lib/demoActions';
import { createInitialData } from '@/data/initialData';
import { isConfirmedStatus } from '@/data/demoOrders';
import { brandName } from '@/data/brands';

const MAX_ACTIVITY_EVENTS = 250;

export type DemoAction =
  | { type: 'PRODUCT_SAVE'; product: Product; isNew: boolean }
  | { type: 'PRODUCT_DELETE'; productId: string }
  | { type: 'PRODUCT_PUBLISH_RESULT'; productId: string; results: ProductPublication[] }
  | { type: 'STOCK_SET'; productId: string; stock: number; reason?: string }
  | { type: 'CHANNEL_TOGGLE'; channelId: string }
  | { type: 'CHANNEL_SET_STATUS'; channelId: string; status: 'enabled' | 'disabled' | 'error' }
  | { type: 'CHANNEL_SYNC'; channelId: string }
  | { type: 'ORDER_STATUS'; orderId: string; to: OrderStatus }
  | { type: 'FINANCE_SAVE'; entry: FinanceEntry; isNew: boolean }
  | { type: 'FINANCE_DELETE'; entryId: string }
  | { type: 'SETTINGS_SAVE'; settings: Settings }
  | { type: 'RESET' };

function withActivity(state: DemoState, events: ActivityEvent[]): DemoState {
  if (events.length === 0) return state;
  return {
    ...state,
    activity: [...events, ...state.activity].slice(0, MAX_ACTIVITY_EVENTS),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Rótulo de marca para os textos de atividade. */
function brandLabel(brandId?: Order['brandId']): string {
  return brandId ? brandName(brandId) : 'Consolidado';
}

/* ------------------------------------------------------------------ */
/* Pedido                                                              */
/* ------------------------------------------------------------------ */

/**
 * Aplica a transição de status de um pedido.
 * Idempotência:
 * - A baixa de estoque acontece apenas na PRIMEIRA virada para status pago
 *   (controlada por order.stockDeducted).
 * - A reposição no cancelamento acontece apenas uma vez (order.stockRestored).
 * - A receita financeira é criada uma única vez por pedido (FinanceEntry.orderId)
 *   e sempre herda a marca e o canal do pedido.
 */
function applyOrderTransition(state: DemoState, order: Order, to: OrderStatus): DemoState {
  if (!canTransition(order.orderStatus, to)) return state;

  const timestamp = nowIso();
  const events: ActivityEvent[] = [];
  let products = state.products;
  let finance = state.finance;

  const becomesPaid = isConfirmedStatus(to) && !isConfirmedStatus(order.orderStatus);
  const cancelled = to === 'cancelled';

  // ---- Estoque (idempotente) ----
  if (becomesPaid && !order.stockDeducted) {
    products = products.map((product) => {
      const item = order.items.find((entry) => entry.productId === product.id);
      if (!item) return product;
      const nextStock = Math.max(0, product.stock - item.quantity);
      events.push(
        buildActivity(
          'stock_changed',
          `Baixa de estoque simulada (${brandLabel(product.brandId)}): ${item.quantity} un. de ${product.name} (pedido ${order.orderNumber}).`,
          product.id,
          `${product.stock} → ${nextStock} un.`,
        ),
      );
      return { ...product, stock: nextStock, updatedAt: timestamp };
    });
  }

  if (cancelled && order.stockDeducted && !order.stockRestored) {
    products = products.map((product) => {
      const item = order.items.find((entry) => entry.productId === product.id);
      if (!item) return product;
      const nextStock = product.stock + item.quantity;
      events.push(
        buildActivity(
          'stock_changed',
          `Estoque reposto após cancelamento (${brandLabel(product.brandId)}): ${item.quantity} un. de ${product.name} (pedido ${order.orderNumber}).`,
          product.id,
          `${product.stock} → ${nextStock} un.`,
        ),
      );
      return { ...product, stock: nextStock, updatedAt: timestamp };
    });
  }

  // ---- Financeiro (sem duplicidade por pedido) ----
  if (becomesPaid && !order.financeEntryId && !finance.some((entry) => entry.orderId === order.id)) {
    const entry: FinanceEntry = {
      id: uid('fin'),
      description: `Venda do pedido ${order.orderNumber}`,
      type: 'income',
      category: 'Vendas (pedidos)',
      amount: round2(order.total),
      date: timestamp,
      brandId: order.brandId,
      channelId: order.channelId,
      status: 'confirmed',
      orderId: order.id,
    };
    finance = [entry, ...finance];
    events.push(
      buildActivity(
        'finance_created',
        `Receita registrada (${brandLabel(order.brandId)}): ${entry.description} (${order.orderNumber}).`,
        entry.id,
      ),
    );
  }

  if (cancelled && order.financeEntryId) {
    finance = finance.map((entry) =>
      entry.id === order.financeEntryId && entry.status !== 'cancelled'
        ? { ...entry, status: 'cancelled' as const }
        : entry,
    );
  }

  // ---- Pedido ----
  const historyEvent: ActivityEvent['id'] = uid('evt');
  const updated: Order = {
    ...order,
    orderStatus: to,
    paymentStatus: paymentStatusFor(to) ?? order.paymentStatus,
    trackingCode:
      to === 'shipped' || to === 'delivered'
        ? (order.trackingCode ?? fakeTrackingCode(order.orderNumber))
        : order.trackingCode,
    stockDeducted: order.stockDeducted || becomesPaid,
    stockRestored: order.stockRestored || (cancelled && order.stockDeducted),
    financeEntryId:
      becomesPaid && !order.financeEntryId
        ? (finance.find((entry) => entry.orderId === order.id)?.id ?? order.financeEntryId)
        : order.financeEntryId,
    events: [
      ...order.events,
      { id: historyEvent, timestamp, message: `Status alterado para "${ORDER_STATUS_META[to].label}" (simulação).` },
    ],
  };

  events.push(
    buildActivity(
      'order_updated',
      `Pedido ${order.orderNumber} (${brandLabel(order.brandId)}) alterado para "${ORDER_STATUS_META[to].label}".`,
      order.id,
      to,
    ),
  );

  return withActivity(
    { ...state, products, finance, orders: state.orders.map((item) => (item.id === order.id ? updated : item)) },
    events,
  );
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'PRODUCT_SAVE': {
      const timestamp = nowIso();
      const exists = state.products.some((product) => product.id === action.product.id);
      const saved: Product = { ...action.product, updatedAt: timestamp };
      const products = exists
        ? state.products.map((product) => (product.id === saved.id ? saved : product))
        : [saved, ...state.products];
      return withActivity(
        { ...state, products },
        [
          buildActivity(
            exists ? 'product_updated' : 'product_created',
            `Produto ${exists ? 'editado' : 'cadastrado'} em ${brandLabel(saved.brandId)}: ${saved.name}.`,
            saved.id,
            saved.sku,
          ),
        ],
      );
    }

    case 'PRODUCT_DELETE': {
      const product = state.products.find((item) => item.id === action.productId);
      if (!product) return state;
      return withActivity(
        { ...state, products: state.products.filter((item) => item.id !== action.productId) },
        [
          buildActivity(
            'product_deleted',
            `Produto excluído de ${brandLabel(product.brandId)}: ${product.name}.`,
            product.id,
            product.sku,
          ),
        ],
      );
    }

    case 'PRODUCT_PUBLISH_RESULT': {
      const timestamp = nowIso();
      const product = state.products.find((item) => item.id === action.productId);
      if (!product) return state;

      const publications = product.publications.filter(
        (publication) => !action.results.some((result) => result.channelId === publication.channelId),
      );
      const updated: Product = { ...product, publications: [...action.results, ...publications], updatedAt: timestamp };

      const events = action.results.map((result) =>
        buildActivity(
          result.status === 'published' ? 'publish_success' : 'publish_failure',
          result.status === 'published'
            ? `Publicação simulada concluída: ${product.name} (${brandLabel(product.brandId)}) em ${state.channels.find((c) => c.id === result.channelId)?.name ?? 'canal'}.`
            : `Falha simulada ao publicar ${product.name} (${brandLabel(product.brandId)}) em ${state.channels.find((c) => c.id === result.channelId)?.name ?? 'canal'}.`,
          product.id,
          result.message,
        ),
      );

      return withActivity(
        {
          ...state,
          products: state.products.map((item) => (item.id === product.id ? updated : item)),
        },
        events,
      );
    }

    case 'STOCK_SET': {
      const product = state.products.find((item) => item.id === action.productId);
      if (!product || product.stock === action.stock) return state;
      const timestamp = nowIso();
      const updated: Product = { ...product, stock: action.stock, updatedAt: timestamp };
      return withActivity(
        { ...state, products: state.products.map((item) => (item.id === product.id ? updated : item)) },
        [
          buildActivity(
            'stock_changed',
            `Estoque de ${product.name} (${brandLabel(product.brandId)}) ajustado${action.reason ? ` (${action.reason})` : ''}: ${product.stock} → ${action.stock} un.`,
            product.id,
            `${product.stock} → ${action.stock} un.`,
          ),
        ],
      );
    }

    case 'CHANNEL_TOGGLE': {
      const channel = state.channels.find((item) => item.id === action.channelId);
      if (!channel) return state;
      const enabled = !channel.enabled;
      return withActivity(
        {
          ...state,
          channels: state.channels.map((item) =>
            item.id === channel.id
              ? { ...item, enabled, status: enabled ? 'enabled' : 'disabled' }
              : item,
          ),
        },
        [
          buildActivity(
            'channel_toggled',
            `Canal ${channel.name} ${enabled ? 'habilitado' : 'desabilitado'} na demonstração.`,
            channel.id,
          ),
        ],
      );
    }

    case 'CHANNEL_SET_STATUS': {
      const channel = state.channels.find((item) => item.id === action.channelId);
      if (!channel || channel.status === action.status) return state;
      const enabled = action.status === 'error' ? channel.enabled : action.status === 'enabled';
      return withActivity(
        {
          ...state,
          channels: state.channels.map((item) =>
            item.id === channel.id ? { ...item, status: action.status, enabled } : item,
          ),
        },
        [
          buildActivity(
            'channel_toggled',
            `Canal ${channel.name}: estado demonstrativo alterado para "${
              action.status === 'enabled' ? 'habilitado' : action.status === 'disabled' ? 'desabilitado' : 'erro simulado'
            }".`,
            channel.id,
          ),
        ],
      );
    }

    case 'CHANNEL_SYNC': {
      const channel = state.channels.find((item) => item.id === action.channelId);
      if (!channel) return state;
      const timestamp = nowIso();
      return withActivity(
        {
          ...state,
          channels: state.channels.map((item) =>
            item.id === channel.id ? { ...item, lastSyncAt: timestamp } : item,
          ),
        },
        [
          buildActivity(
            'channel_synced',
            `Sincronização simulada concluída para ${channel.name}.`,
            channel.id,
          ),
        ],
      );
    }

    case 'ORDER_STATUS': {
      const order = state.orders.find((item) => item.id === action.orderId);
      if (!order) return state;
      return applyOrderTransition(state, order, action.to);
    }

    case 'FINANCE_SAVE': {
      const exists = state.finance.some((entry) => entry.id === action.entry.id);
      // Proteção contra receita duplicada do mesmo pedido.
      if (
        !exists &&
        action.entry.orderId &&
        state.finance.some((entry) => entry.orderId === action.entry.orderId)
      ) {
        return state;
      }
      const finance = exists
        ? state.finance.map((entry) => (entry.id === action.entry.id ? action.entry : entry))
        : [action.entry, ...state.finance];
      return withActivity({ ...state, finance }, [
        buildActivity(
          exists ? 'finance_updated' : 'finance_created',
          `Lançamento ${exists ? 'editado' : 'criado'} (${brandLabel(action.entry.brandId)}): ${action.entry.description} — ${action.entry.type === 'income' ? 'entrada' : 'saída'}.`,
          action.entry.id,
        ),
      ]);
    }

    case 'FINANCE_DELETE': {
      const entry = state.finance.find((item) => item.id === action.entryId);
      if (!entry) return state;
      // Lançamentos originados de pedidos não são excluídos; são cancelados.
      if (entry.orderId) {
        return withActivity(
          {
            ...state,
            finance: state.finance.map((item) =>
              item.id === entry.id ? { ...item, status: 'cancelled' as const } : item,
            ),
          },
          [
            buildActivity(
              'finance_deleted',
              `Receita de pedido ${entry.orderId} marcada como cancelada (registro histórico preservado).`,
              entry.id,
            ),
          ],
        );
      }
      return withActivity(
        { ...state, finance: state.finance.filter((item) => item.id !== action.entryId) },
        [buildActivity('finance_deleted', `Lançamento excluído: ${entry.description}.`, entry.id)],
      );
    }

    case 'SETTINGS_SAVE': {
      return withActivity({ ...state, settings: action.settings }, [
        buildActivity(
          'settings_changed',
          `Configurações atualizadas: alerta em ${action.settings.alertThreshold} un., crítico em ${action.settings.criticalThreshold} un.`,
        ),
      ]);
    }

    case 'RESET':
      return createInitialData();

    default:
      return state;
  }
}
