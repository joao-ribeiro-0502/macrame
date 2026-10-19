import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, ShoppingCart } from 'lucide-react';
import { useDemo } from '@/store/DemoContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { OrderStatusBadge, PaymentBadge } from '@/components/shared/DomainBadges';
import { initials } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Form';
import { EmptyState, Pagination, Table, Td, Th, Tr } from '@/components/ui/Table';
import { isWithin, orderItemCount, orderTotals, periodRange, PERIOD_LABELS, ORDER_STATUS_META } from '@/lib/calculations';
import { formatBRL, formatDate } from '@/lib/formatters';
import { OrderDetailModal } from '@/features/orders/OrderDetailModal';
import { BRANDS, brandById } from '@/data/brands';
import type { BrandId, OrderStatus, PeriodKey, Order } from '@/types';

const PAGE_SIZE = 10;

type BrandFilter = BrandId | 'all';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todos os status' },
  (Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((status) => ({ value: status, label: ORDER_STATUS_META[status].label })),
].flat() as Array<{ value: string; label: string }>;

const PERIOD_FILTER_OPTIONS: Array<{ value: PeriodKey | 'all'; label: string }> = [
  { value: 'all', label: 'Todo o histórico' },
  ...Object.entries(PERIOD_LABELS).map(([value, label]) => ({ value: value as PeriodKey, label })),
];

export function OrdersPage() {
  const { state } = useDemo();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [brand, setBrand] = useState<BrandFilter>('all');
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState<PeriodKey | 'all'>('all');
  const [page, setPage] = useState(1);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearch(query);
      setPage(1);
    }
  }, [searchParams]);

  // Canais disponíveis conforme a marca selecionada (canal nunca limpa a marca).
  const brandChannels = useMemo(
    () => (brand === 'all' ? state.channels : state.channels.filter((item) => item.brandId === brand)),
    [state.channels, brand],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.orders
      .filter((order) => {
        if (brand !== 'all' && order.brandId !== brand) return false;
        if (term && !orderMatchesLocal(order, term)) return false;
        if (channel !== 'all' && order.channelId !== channel) return false;
        if (status !== 'all' && order.orderStatus !== status) return false;
        if (period !== 'all' && !isWithin(order.createdAt, periodRange(period))) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.orders, search, brand, channel, status, period]);

  const totals = useMemo(() => {
    const valid = filtered.filter((order) => order.orderStatus !== 'cancelled');
    return orderTotals(
      valid.map((order) => ({ quantity: 1, unitPrice: order.total })),
      0,
      0,
    );
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Central de pedidos"
        description="Pedidos fictícios de todos os canais, com transições de status simuladas."
        actions={<Badge tone="terracotta">Dados fictícios</Badge>}
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-border px-4 py-3.5 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Buscar" htmlFor="orders-search" className="lg:col-span-2">
            <Input
              id="orders-search"
              type="search"
              placeholder="Número do pedido ou cliente…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Marca" htmlFor="orders-brand">
            <Select
              id="orders-brand"
              value={brand}
              onChange={(event) => {
                setBrand(event.target.value as BrandFilter);
                setChannel('all');
                setPage(1);
              }}
            >
              <option value="all">As duas marcas</option>
              {BRANDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Canal" htmlFor="orders-channel">
            <Select
              id="orders-channel"
              value={channel}
              onChange={(event) => {
                setChannel(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Todos os canais{brand === 'all' ? '' : ' da marca'}</option>
              {brandChannels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status do pedido" htmlFor="orders-status">
            <Select
              id="orders-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Período" htmlFor="orders-period">
            <Select
              id="orders-period"
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value as PeriodKey | 'all');
                setPage(1);
              }}
            >
              {PERIOD_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border bg-cream/40 px-4 py-2.5 text-xs text-ink-muted">
          <span>
            <strong className="text-ink">{filtered.length}</strong> pedido(s) no filtro
          </span>
          <span>
            Total não cancelado:{' '}
            <strong className="text-ink tabular-nums">{formatBRL(totals.total)}</strong>
          </span>
          <span className="hidden sm:inline">Pedidos cancelados não contam como faturamento.</span>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Nenhum pedido encontrado"
            description="Ajuste os filtros ou aguarde novos pedidos fictícios na demonstração."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Pedido</Th>
                  <Th className="hidden xl:table-cell">Marca</Th>
                  <Th>Cliente</Th>
                  <Th className="hidden lg:table-cell">Data</Th>
                  <Th className="hidden md:table-cell">Canal</Th>
                  <Th className="hidden sm:table-cell">Itens</Th>
                  <Th>Total</Th>
                  <Th className="hidden xl:table-cell">Pagamento</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Detalhes</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => {
                  const channelItem = state.channels.find((item) => item.id === order.channelId);
                  const orderBrand = brandById(order.brandId);
                  return (
                    <Tr key={order.id}>
                      <Td className="font-medium whitespace-nowrap">{order.orderNumber}</Td>
                      <Td className="hidden xl:table-cell">
                        <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-ink-soft">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: orderBrand.accent }} />
                          {orderBrand.name}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand text-[10px] font-semibold text-ink-soft">
                            {initials(order.customerName)}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-40 truncate text-sm text-ink">{order.customerName}</span>
                            <span className="block text-[11px] text-ink-muted md:hidden">{channelItem?.name}</span>
                          </span>
                        </div>
                      </Td>
                      <Td className="hidden text-xs whitespace-nowrap text-ink-soft lg:table-cell">{formatDate(order.createdAt)}</Td>
                      <Td className="hidden text-xs text-ink-soft md:table-cell">{channelItem?.name ?? '—'}</Td>
                      <Td className="hidden text-xs tabular-nums text-ink-soft sm:table-cell">{orderItemCount(order)}</Td>
                      <Td className="text-sm font-semibold tabular-nums whitespace-nowrap">{formatBRL(order.total)}</Td>
                      <Td className="hidden xl:table-cell">
                        <PaymentBadge status={order.paymentStatus} />
                      </Td>
                      <Td>
                        <OrderStatusBadge status={order.orderStatus} />
                      </Td>
                      <Td className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOpenOrderId(order.id)}
                          aria-label={`Abrir detalhes do pedido ${order.orderNumber}`}
                        >
                          <Eye aria-hidden className="h-3.5 w-3.5" />
                          <span className="hidden lg:inline">Abrir</span>
                        </Button>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={currentPage} pageCount={pageCount} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <p className="mt-3 text-center text-[11px] text-ink-muted">
        Transições permitidas: Novo → Pago → Em separação → Enviado → Entregue. Baixas de estoque e
        registros financeiros são idempotentes (nunca duplicados).
      </p>

      {openOrderId ? <OrderDetailModal orderId={openOrderId} onClose={() => setOpenOrderId(null)} /> : null}
    </>
  );
}

function orderMatchesLocal(order: Order, term: string): boolean {
  return (
    order.orderNumber.toLowerCase().includes(term) ||
    order.customerName.toLowerCase().includes(term) ||
    order.customerCity.toLowerCase().includes(term)
  );
}
