/**
 * Helpers de demonstração: identificadores, eventos de atividade,
 * simulação determinística de publicação e regras de transição de pedido.
 */
import type { ActivityEvent, ActivityType, Order, OrderStatus, ProductPublication, SalesChannel, Settings } from '@/types';
import { canTransition } from '@/lib/calculations';

let counter = 0;

/** Identificador local curto e único o suficiente para a demonstração. */
export function uid(prefix = 'id'): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${random}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function buildActivity(
  type: ActivityType,
  message: string,
  relatedEntityId?: string,
  details?: string,
): ActivityEvent {
  return {
    id: uid('act'),
    type,
    message,
    timestamp: nowIso(),
    relatedEntityId,
    details,
  };
}

/* ------------------------------------------------------------------ */
/* Publicação simulada (determinística)                                */
/* ------------------------------------------------------------------ */

export interface PublishSimulationInput {
  channels: SalesChannel[];
  selectedIds: string[];
  /** Canal marcado para forçar falha (controlado pela interface). */
  forcedFailures?: string[];
  productName: string;
}

/**
 * Simula a publicação de um produto nos canais selecionados.
 * Regras determinísticas:
 * - canal desabilitado na demonstração → falha;
 * - canal com "erro simulado" ativo   → falha;
 * - canal marcado "forçar falha"      → falha (recurso de apresentação);
 * - demais                            → sucesso.
 */
export function simulatePublication(input: PublishSimulationInput): ProductPublication[] {
  const { channels, selectedIds, forcedFailures = [], productName } = input;
  return selectedIds.map((channelId) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) {
      return { channelId, status: 'failed' as const, message: 'Canal desconhecido.' };
    }
    if (forcedFailures.includes(channelId)) {
      return {
        channelId,
        status: 'failed' as const,
        publishedAt: nowIso(),
        message: 'Falha simulada forçada para demonstração.',
      };
    }
    if (!channel.enabled) {
      return {
        channelId,
        status: 'failed' as const,
        publishedAt: nowIso(),
        message: 'Canal desabilitado na demonstração.',
      };
    }
    if (channel.status === 'error') {
      return {
        channelId,
        status: 'failed' as const,
        publishedAt: nowIso(),
        message: 'Erro simulado no canal. Verifique a página Canais de venda.',
      };
    }
    return {
      channelId,
      status: 'published' as const,
      publishedAt: nowIso(),
      message: `Publicado na demonstração (registro fictício de "${productName}").`,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Transições de pedido                                                */
/* ------------------------------------------------------------------ */

/** Status de pagamento coerente com o status do pedido. */
export function paymentStatusFor(orderStatus: OrderStatus): 'paid' | 'pending' | 'refunded' | null {
  if (orderStatus === 'paid' || orderStatus === 'separating' || orderStatus === 'shipped' || orderStatus === 'delivered') {
    return 'paid';
  }
  if (orderStatus === 'cancelled') return 'refunded';
  return 'pending';
}

export function transitionAllowed(order: Order, to: OrderStatus): boolean {
  return canTransition(order.orderStatus, to);
}

/** Código de rastreamento fictício e determinístico por pedido. */
export function fakeTrackingCode(orderNumber: string): string {
  const suffix = orderNumber.replace(/[^0-9A-Za-z]/g, '').slice(-8).padStart(8, '0');
  return `BRMDL${suffix}`;
}

/* ------------------------------------------------------------------ */
/* Validações reutilizáveis                                            */
/* ------------------------------------------------------------------ */

export function validateSettings(settings: Settings): { ok: boolean; message?: string } {
  if (settings.alertThreshold < 0 || settings.criticalThreshold < 0) {
    return { ok: false, message: 'Os limites de estoque não podem ser negativos.' };
  }
  if (settings.criticalThreshold > settings.alertThreshold) {
    return {
      ok: false,
      message: 'O limite crítico deve ser menor ou igual ao limite de alerta.',
    };
  }
  if (settings.physicalStoreReserve < 0) {
    return { ok: false, message: 'A reserva para loja física não pode ser negativa.' };
  }
  return { ok: true };
}
