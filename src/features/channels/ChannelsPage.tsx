import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  Power,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Store,
  Video,
  XCircle,
} from 'lucide-react';
import { useDemo } from '@/store/DemoContext';
import { useToast } from '@/store/ToastContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { Table, Td, Th, Tr, EmptyState } from '@/components/ui/Table';
import { financeSummary, isConfirmedRevenue, isWithin, periodRange } from '@/lib/calculations';
import { formatBRL, formatNumber, formatDate, formatRelative } from '@/lib/formatters';
import { brandById } from '@/data/brands';
import { cn } from '@/lib/cn';
import type { ChannelStatus, ChannelType, SalesChannel } from '@/types';

const TYPE_ICONS: Record<ChannelType, typeof Store> = {
  nuvemshop: Store,
  mercadolivre: ShoppingBag,
  shopee: ShoppingBag,
  tiktok: Video,
};

const STATUS_META: Record<ChannelStatus, { label: string; tone: BadgeTone; hint: string }> = {
  enabled: { label: 'Disponível na demonstração', tone: 'positive', hint: 'Canal pronto para simulações.' },
  disabled: { label: 'Desabilitado', tone: 'neutral', hint: 'Canal fora das simulações.' },
  error: { label: 'Erro simulado', tone: 'critical', hint: 'Falha proposital para demonstrar tratamento de erro.' },
};

export function ChannelsPage() {
  const { state, dispatch } = useDemo();
  const { push } = useToast();
  const [detailsChannel, setDetailsChannel] = useState<SalesChannel | null>(null);

  const stats = useMemo(() => {
    const range = periodRange('30d');
    return state.channels.map((channel) => {
      const products = state.products.filter((product) => product.channels.includes(channel.id));
      const published = products.filter((product) =>
        product.publications.some((pub) => pub.channelId === channel.id && pub.status === 'published'),
      );
      const orders = state.orders.filter(
        (order) => order.channelId === channel.id && order.orderStatus !== 'cancelled',
      );
      const recentOrders = orders.filter((order) => isWithin(order.createdAt, range));
      const revenue = orders.filter(isConfirmedRevenue).reduce((sum, order) => sum + order.total, 0);
      return { channel, products, published, orders, recentOrders, revenue };
    });
  }, [state.channels, state.products, state.orders]);

  function toggle(channel: SalesChannel) {
    dispatch({ type: 'CHANNEL_TOGGLE', channelId: channel.id });
    push({
      tone: 'info',
      title: channel.enabled ? 'Canal desabilitado' : 'Canal habilitado',
      description: `${channel.name} foi ${channel.enabled ? 'desabilitado' : 'habilitado'} na demonstração.`,
    });
  }

  function simulateError(channel: SalesChannel) {
    if (channel.status === 'error') {
      dispatch({ type: 'CHANNEL_SET_STATUS', channelId: channel.id, status: channel.enabled ? 'enabled' : 'disabled' });
      push({ tone: 'success', title: 'Erro simulado encerrado', description: `${channel.name} voltou ao normal (demo).` });
    } else {
      dispatch({ type: 'CHANNEL_SET_STATUS', channelId: channel.id, status: 'error' });
      push({
        tone: 'warning',
        title: 'Erro simulado ativado',
        description: 'Publicações neste canal falharão de forma controlada.',
      });
    }
  }

  function syncNow(channel: SalesChannel) {
    dispatch({ type: 'CHANNEL_SYNC', channelId: channel.id });
    push({
      tone: channel.status === 'error' ? 'warning' : 'success',
      title: 'Sincronização simulada',
      description:
        channel.status === 'error'
          ? `${channel.name} está com erro simulado — a sincronização foi registrada assim mesmo (demo).`
          : `${channel.name} teve a sincronização registrada (apenas demonstrativo).`,
    });
  }

  // Agrupa as 8 combinações por marca (2 marcas × 4 plataformas).
  const brandIds = [...new Set(state.channels.map((channel) => channel.brandId))];

  return (
    <>
      <PageHeader
        title="Canais de venda"
        description="As duas marcas vendem nas mesmas quatro plataformas — 8 combinações marca × plataforma, cada uma administrada de forma independente. Nenhuma conta real está conectada."
        actions={<Badge tone="terracotta">Integrações simuladas</Badge>}
      />

      <div className="space-y-6">
        {brandIds.map((brandId) => {
          const brand = brandById(brandId);
          const brandStats = stats.filter((row) => row.channel.brandId === brandId);
          return (
            <div key={brandId}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: brand.accent }} />
                <h2 className="text-sm font-semibold text-ink">{brand.name}</h2>
                <span className="text-[11px] text-ink-muted">{brand.description}</span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {brandStats.map(({ channel, products, orders, published, revenue }) => {
                  const Icon = TYPE_ICONS[channel.type];
                  const meta = STATUS_META[channel.status];
                  return (
                    <Card key={channel.id} className="flex flex-col">
                      <div className="flex items-start gap-3 border-b border-border px-5 py-4">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white"
                          style={{ backgroundColor: channel.accent }}
                        >
                          <Icon aria-hidden className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{channel.name}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{channel.description}</p>
                          {channel.accountHandle ? (
                            <p className="mt-0.5 text-[10px] text-ink-muted">Conta simulada: {channel.accountHandle}</p>
                          ) : null}
                        </div>
                        <Switch
                          checked={channel.enabled}
                          onChange={() => toggle(channel)}
                          label={`Habilitar ou desabilitar ${channel.name}`}
                        />
                      </div>

                      <div className="grid grid-cols-3 divide-x divide-border">
                        <div className="px-4 py-3 text-center">
                          <p className="text-base font-semibold text-ink tabular-nums">{formatNumber(products.length)}</p>
                          <p className="text-[10px] text-ink-muted">Anúncios</p>
                        </div>
                        <div className="px-4 py-3 text-center">
                          <p className="text-base font-semibold text-ink tabular-nums">{formatNumber(orders.length)}</p>
                          <p className="text-[10px] text-ink-muted">Pedidos (ativos)</p>
                        </div>
                        <div className="px-4 py-3 text-center">
                          <p className="text-base font-semibold text-ink tabular-nums">{formatBRL(revenue)}</p>
                          <p className="text-[10px] text-ink-muted">Faturamento</p>
                        </div>
                      </div>

                      <div className="px-5 pt-3 text-[10px] text-ink-muted">
                        {formatNumber(published.length)} anúncio(s) publicado(s) · Última sync simulada{' '}
                        {channel.lastSyncAt ? formatRelative(channel.lastSyncAt) : '—'}
                      </div>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <Badge tone={meta.tone}>
                            {channel.status === 'enabled' ? <CheckCircle2 aria-hidden className="h-3 w-3" /> : channel.status === 'error' ? <XCircle aria-hidden className="h-3 w-3" /> : <Power aria-hidden className="h-3 w-3" />}
                            {meta.label}
                          </Badge>
                          <span className="text-[10px] text-ink-muted">{meta.hint}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => simulateError(channel)} title="Alterna um erro simulado neste canal">
                            {channel.status === 'error' ? <CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> : <AlertTriangle aria-hidden className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{channel.status === 'error' ? 'Resolver' : 'Simular erro'}</span>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => syncNow(channel)} title="Registra uma sincronização simulada">
                            <RefreshCw aria-hidden className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Sincronizar</span>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDetailsChannel(channel)}>
                            <Link2 aria-hidden className="h-3.5 w-3.5" />
                            Detalhes
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] text-ink-muted">
        Ícones genéricos são utilizados por não termos licença para logotipos oficiais. Habilitar,
        desabilitar ou sincronizar um canal altera apenas o estado da demonstração — nenhum dado sai
        do navegador.
      </p>

      {/* Detalhes do canal */}
      {detailsChannel ? (
        <ChannelDetailsModal
          channel={state.channels.find((item) => item.id === detailsChannel.id) ?? detailsChannel}
          onClose={() => setDetailsChannel(null)}
        />
      ) : null}
    </>
  );
}

function ChannelDetailsModal({ channel, onClose }: { channel: SalesChannel; onClose: () => void }) {
  const { state } = useDemo();

  const linked = state.products.filter(
    (product) => product.brandId === channel.brandId && product.channels.includes(channel.id),
  );
  const orders = state.orders
    .filter((order) => order.channelId === channel.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const finance = financeSummary(
    state.finance.filter((entry) => entry.channelId === channel.id),
    '30d',
  );

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Detalhes — ${channel.name}`}
      description={`${channel.description} Combinacao marca × plataforma (simulada).`}
      footer={
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-border bg-cream/40 px-3 py-2.5">
          <p className="text-[10px] text-ink-muted">Anúncios vinculados</p>
          <p className="text-base font-semibold text-ink tabular-nums">{linked.length}</p>
        </div>
        <div className="rounded-md border border-border bg-cream/40 px-3 py-2.5">
          <p className="text-[10px] text-ink-muted">Pedidos (histórico)</p>
          <p className="text-base font-semibold text-ink tabular-nums">{orders.length}</p>
        </div>
        <div className="rounded-md border border-border bg-cream/40 px-3 py-2.5">
          <p className="text-[10px] text-ink-muted">Entradas 30 dias</p>
          <p className="text-base font-semibold text-positive tabular-nums">{formatBRL(finance.income)}</p>
        </div>
        <div className="rounded-md border border-border bg-cream/40 px-3 py-2.5">
          <p className="text-[10px] text-ink-muted">Saídas 30 dias</p>
          <p className="text-base font-semibold text-critical tabular-nums">{formatBRL(finance.expense)}</p>
        </div>
      </div>

      <p className="mb-2 mt-4 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
        <Link2 aria-hidden className="h-3 w-3" />
        Produtos anunciados neste canal
      </p>
      {linked.length === 0 ? (
        <EmptyState title="Nenhum anúncio vinculado" description="Associe produtos a este canal no cadastro." />
      ) : (
        <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border">
          {linked.map((product) => {
            const publication = product.publications.find((pub) => pub.channelId === channel.id);
            return (
              <li key={product.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <ProductThumb name={product.name} image={product.images[0]} className="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-ink">{product.name}</p>
                  <p className="text-[10px] text-ink-muted">{product.sku}</p>
                </div>
                <Badge tone={publication?.status === 'published' ? 'positive' : publication?.status === 'failed' ? 'critical' : 'neutral'}>
                  {publication?.status === 'published' ? 'Publicado (demo)' : publication?.status === 'failed' ? 'Falha simulada' : 'Não publicado'}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mb-2 mt-4 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
        <Receipt aria-hidden className="h-3 w-3" />
        Últimos pedidos do canal
      </p>
      {orders.length === 0 ? (
        <EmptyState title="Nenhum pedido" description="Este canal ainda não registrou pedidos simulados." />
      ) : (
        <div className="max-h-56 overflow-y-auto rounded-md border border-border">
          <Table>
            <thead>
              <tr>
                <Th>Pedido</Th>
                <Th>Cliente</Th>
                <Th className="hidden sm:table-cell">Data</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((order) => (
                <Tr key={order.id}>
                  <Td className="text-xs font-medium whitespace-nowrap">{order.orderNumber}</Td>
                  <Td className={cn('max-w-32 truncate text-xs text-ink-soft')}>{order.customerName}</Td>
                  <Td className="hidden text-xs text-ink-muted sm:table-cell">{formatDate(order.createdAt)}</Td>
                  <Td className="text-right text-xs tabular-nums">{formatBRL(order.total)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Modal>
  );
}
