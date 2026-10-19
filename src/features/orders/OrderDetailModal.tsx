import { useState } from 'react';
import { CalendarClock, Copy, Hash, MapPin, Truck } from 'lucide-react';
import { useDemo } from '@/store/DemoContext';
import { useToast } from '@/store/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { OrderStatusBadge, PaymentBadge } from '@/components/shared/DomainBadges';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { ConfirmDialog } from '@/components/ui/Modal';
import { nextOrderStatuses, ORDER_STATUS_META } from '@/lib/calculations';
import { formatBRL, formatDateTime, initials } from '@/lib/formatters';
import { brandName } from '@/data/brands';
import type { Order, OrderStatus } from '@/types';

interface OrderDetailModalProps {
  orderId: string;
  onClose: () => void;
}

export function OrderDetailModal({ orderId, onClose }: OrderDetailModalProps) {
  const { state, dispatch } = useDemo();
  const { push } = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [transitionTo, setTransitionTo] = useState<OrderStatus | null>(null);

  const order = state.orders.find((item) => item.id === orderId);
  const channel = order ? state.channels.find((item) => item.id === order.channelId) : undefined;

  if (!order) return null;

  const available = nextOrderStatuses(order.orderStatus);

  function applyTransition(to: OrderStatus) {
    if (!order) return;
    dispatch({ type: 'ORDER_STATUS', orderId: order.id, to });
    push({
      tone: 'success',
      title: 'Status atualizado (simulação)',
      description: `${order.orderNumber} agora está como "${ORDER_STATUS_META[to].label}".`,
    });
  }

  function copyTracking() {
    if (!order?.trackingCode) return;
    void navigator.clipboard?.writeText(order.trackingCode).then(
      () => push({ tone: 'info', title: 'Código copiado', description: 'Código fictício copiado para a área de transferência.' }),
      () => undefined,
    );
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="xl"
        title={`Pedido ${order.orderNumber}`}
        description={`${brandName(order.brandId)} · ${channel?.name ?? 'Canal'} · aberto em ${formatDateTime(order.createdAt)}`}
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            {available.includes('cancelled') ? (
              <Button variant="danger" onClick={() => setCancelling(true)}>
                Cancelar pedido
              </Button>
            ) : null}
            {available
              .filter((status) => status !== 'cancelled')
              .map((status) => (
                <Button key={status} onClick={() => setTransitionTo(status)}>
                  Marcar como {ORDER_STATUS_META[status].label.toLowerCase()}
                </Button>
              ))}
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Cliente */}
          <div className="rounded-md border border-border bg-cream/40 p-4">
            <p className="text-[10px] font-semibold tracking-wide text-ink-muted uppercase">Cliente (fictício)</p>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-xs font-semibold text-ink-soft">
                {initials(order.customerName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{order.customerName}</p>
                <p className="truncate text-[11px] text-ink-muted">{order.customerEmail}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
              <MapPin aria-hidden className="h-3.5 w-3.5 text-ink-muted" />
              {order.customerCity}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
              <Hash aria-hidden className="h-3.5 w-3.5 text-ink-muted" />
              {channel?.name ?? 'Canal'}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
              <CalendarClock aria-hidden className="h-3.5 w-3.5 text-ink-muted" />
              {formatDateTime(order.createdAt)}
            </p>
            {order.trackingCode ? (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2">
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-ink-soft">
                  <Truck aria-hidden className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                  <span className="truncate font-mono">{order.trackingCode}</span>
                </span>
                <button
                  type="button"
                  onClick={copyTracking}
                  aria-label="Copiar código de rastreamento fictício"
                  className="rounded p-1 text-ink-muted hover:bg-cream hover:text-ink"
                >
                  <Copy aria-hidden className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-ink-muted">Sem código de rastreamento (fictício).</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <OrderStatusBadge status={order.orderStatus} />
              <PaymentBadge status={order.paymentStatus} />
            </div>
          </div>

          {/* Itens */}
          <div className="lg:col-span-2">
            <p className="mb-2 text-[10px] font-semibold tracking-wide text-ink-muted uppercase">Itens do pedido</p>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <thead>
                  <tr>
                    <Th>Produto</Th>
                    <Th className="text-right">Qtd.</Th>
                    <Th className="text-right">Unitário</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <Tr key={`${order.id}-${item.productId}`}>
                      <Td>
                        <p className="text-sm text-ink">{item.productName}</p>
                        <p className="text-[11px] text-ink-muted">{item.sku}</p>
                      </Td>
                      <Td className="text-right tabular-nums">{item.quantity}</Td>
                      <Td className="text-right tabular-nums">{formatBRL(item.unitPrice)}</Td>
                      <Td className="text-right font-medium tabular-nums">{formatBRL(item.quantity * item.unitPrice)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <dl className="mt-3 ml-auto w-full max-w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-soft">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatBRL(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ink-soft">
                <dt>Frete</dt>
                <dd className="tabular-nums">{order.shipping === 0 ? 'Grátis' : formatBRL(order.shipping)}</dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between text-positive">
                  <dt>Desconto</dt>
                  <dd className="tabular-nums">− {formatBRL(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-ink">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatBRL(order.total)}</dd>
              </div>
            </dl>

            <div className="mt-3 rounded-md border border-border bg-cream/40 p-3.5">
              <p className="text-[10px] font-semibold tracking-wide text-ink-muted uppercase">Histórico do pedido</p>
              <ol className="mt-2 space-y-1.5">
                {[...order.events].reverse().map((event) => (
                  <li key={event.id} className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="text-ink">{event.message}</span>
                    <span className="shrink-0 whitespace-nowrap text-[10px] text-ink-muted">
                      {formatDateTime(event.timestamp)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {order.stockDeducted ? (
              <p className="mt-2 text-[11px] text-ink-muted">
                Estoque já baixado neste pedido (registros idempotentes — mudanças de status não duplicam baixas).
              </p>
            ) : null}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        onConfirm={() => {
          setCancelling(false);
          applyTransition('cancelled');
        }}
        title="Cancelar pedido"
        confirmLabel="Cancelar pedido"
        message={
          <span>
            O pedido <strong className="text-ink">{order.orderNumber}</strong> será marcado como cancelado
            (simulação). {order.stockDeducted ? 'O estoque baixado será reposto automaticamente.' : 'Nenhuma baixa de estoque será feita.'}
          </span>
        }
      />

      <ConfirmDialog
        open={Boolean(transitionTo)}
        onClose={() => setTransitionTo(null)}
        onConfirm={() => {
          if (transitionTo) applyTransition(transitionTo);
          setTransitionTo(null);
        }}
        tone="primary"
        title="Alterar status do pedido"
        confirmLabel="Confirmar alteração"
        message={
          transitionTo ? (
            <span>
              Marcar <strong className="text-ink">{order.orderNumber}</strong> como{' '}
              <strong className="text-ink">{ORDER_STATUS_META[transitionTo].label}</strong>?
              {transitionTo === 'paid'
                ? ' A baixa de estoque e o registro financeiro ocorrerão uma única vez.'
                : ''}
            </span>
          ) : (
            ''
          )
        }
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Utilitário local                                                    */
/* ------------------------------------------------------------------ */

export function orderMatches(order: Order, term: string): boolean {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return true;
  return (
    order.orderNumber.toLowerCase().includes(normalized) ||
    order.customerName.toLowerCase().includes(normalized) ||
    order.customerEmail.toLowerCase().includes(normalized)
  );
}
