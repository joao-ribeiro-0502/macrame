import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  Package,
  ShoppingCart,
  Store,
  TicketCheck,
} from 'lucide-react';
import { useDemo } from '@/store/DemoContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { BrandBadge, OrderStatusBadge, StockBadge } from '@/components/shared/DomainBadges';
import { ChannelRevenueList } from '@/components/shared/ChannelRevenueList';
import { EvolutionBarList } from '@/components/shared/EvolutionBarList';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Field, Select } from '@/components/ui/Form';
import { EmptyState } from '@/components/ui/Table';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import {
  brandComparison,
  channelsForBrand,
  dashboardMetrics,
  describePeriod,
  formatPeriodLabel,
  periodRange,
  revenueByChannel,
  salesEvolutionBars,
  scopedOrders,
  scopedProducts,
  stockLevel,
  topProducts,
  EVOLUTION_GRAIN_LABELS,
  PERIOD_LABELS,
} from '@/lib/calculations';
import { formatBRL, formatNumber, formatRelative, initials } from '@/lib/formatters';
import { BRANDS } from '@/data/brands';
import type { BrandId, CustomRange, DataScope, PeriodInput, PeriodKey } from '@/types';

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = (
  Object.keys(PERIOD_LABELS) as PeriodKey[]
).map((value) => ({ value, label: PERIOD_LABELS[value] }));

type BrandFilter = BrandId | 'all';

const BRAND_OPTIONS: Array<{ value: BrandFilter; label: string }> = [
  { value: 'all', label: 'As duas marcas' },
  ...BRANDS.map((brand) => ({ value: brand.id, label: brand.name })),
];

export function DashboardPage() {
  const { state } = useDemo();
  // Período = pré-definição (Hoje, Últimos 7 dias, …) OU intervalo arbitrário
  // escolhido no calendário ("Personalizado").
  const [period, setPeriod] = useState<PeriodInput>('30d');
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [channelFilter, setChannelFilter] = useState('all');

  const isCustomPeriod = typeof period !== 'string';

  // Escopo combinado: MARCA e CANAL trabalham juntos (canal nunca limpa a marca).
  const scope: DataScope = useMemo(
    () => ({ brandId: brandFilter, channelId: channelFilter }),
    [brandFilter, channelFilter],
  );

  const brandChannels = useMemo(() => channelsForBrand(state.channels, brandFilter), [state.channels, brandFilter]);

  const metrics = useMemo(() => dashboardMetrics(state, period, scope), [state, period, scope]);
  const evolution = useMemo(
    () => salesEvolutionBars(scopedOrders(state.orders, scope), period),
    [state.orders, scope, period],
  );
  const channelSales = useMemo(() => revenueByChannel(state, period, scope), [state, period, scope]);
  const channelRevenueTotal = useMemo(
    () => channelSales.reduce((sum, row) => sum + row.revenue, 0),
    [channelSales],
  );
  const bestSellers = useMemo(() => topProducts(state, period, 5, scope), [state, period, scope]);

  const range = periodRange(period);
  const latestOrders = useMemo(
    () =>
      [...scopedOrders(state.orders, scope)]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [state.orders, scope],
  );
  const stockAlerts = useMemo(
    () =>
      scopedProducts(state.products, scope)
        .filter((product) => product.status !== 'inactive' && stockLevel(product.stock, state.settings) !== 'normal')
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 6),
    [state.products, state.settings, scope],
  );
  const recentActivity = useMemo(() => state.activity.slice(0, 7), [state.activity]);

  const comparison = useMemo(
    () => (brandFilter === 'all' ? brandComparison(state, period) : []),
    [state, period, brandFilter],
  );

  const hasChartSales = evolution.rows.some((point) => point.faturamento > 0);
  const hasChannelSales = channelSales.some((row) => row.revenue > 0);

  function handleBrandChange(value: BrandFilter) {
    setBrandFilter(value);
    // Ao trocar de marca, mantém o canal apenas se ele pertencer à nova marca.
    if (value !== 'all' && channelFilter !== 'all') {
      const stillValid = state.channels.some((channel) => channel.id === channelFilter && channel.brandId === value);
      if (!stillValid) setChannelFilter('all');
    }
  }

  const scopeTitle = brandFilter === 'all' ? 'consolidado' : BRANDS.find((brand) => brand.id === brandFilter)?.name ?? '';

  return (
    <>
      <PageHeader
        title="Visão geral"
        description={`Indicadores ${scopeTitle} de ${formatPeriodLabel(range)}. Os dois filtros (marca e canal) funcionam em conjunto.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="terracotta">Dados ilustrativos</Badge>
            <SegmentedControl
              options={PERIOD_OPTIONS}
              value={isCustomPeriod ? '' : period}
              onChange={(value) => setPeriod(value as PeriodKey)}
              ariaLabel="Período"
            />
            <DateRangePicker
              value={isCustomPeriod ? (period as CustomRange) : null}
              onApply={setPeriod}
              onClear={() => setPeriod('30d')}
            />
          </div>
        }
      />

      {/* Filtros de marca + canal (combináveis) */}
      <Card>
        <div className="grid grid-cols-1 gap-3 px-4 py-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Marca" htmlFor="dash-brand">
            <Select id="dash-brand" value={brandFilter} onChange={(event) => handleBrandChange(event.target.value as BrandFilter)}>
              {BRAND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Canal de venda"
            htmlFor="dash-channel"
            hint={brandFilter === 'all' ? 'Escolha uma marca para reduzir as opções.' : 'Canais desta marca.'}
          >
            <Select id="dash-channel" value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}>
              <option value="all">Todos os canais{brandFilter === 'all' ? ' (as 8 combinações)' : ' da marca'}</option>
              {brandChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end lg:col-span-2">
            <p className="text-[11px] leading-relaxed text-ink-muted">
              {brandFilter === 'all'
                ? 'Visão consolidada: soma de Macramê do Leh e Brilho de Orixá.'
                : `Indicadores restritos a ${scopeTitle}.`}{' '}
              {channelFilter !== 'all'
                ? `Canal ativo: ${state.channels.find((channel) => channel.id === channelFilter)?.name ?? ''}.`
                : ''}
            </p>
          </div>
        </div>
      </Card>

      {/* Indicadores */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Faturamento do período"
          value={formatBRL(metrics.revenue)}
          icon={Banknote}
          hint={`${formatBRL(metrics.confirmedRevenue)} já confirmados`}
          labelTooltip
        />
        <StatCard label="Pedidos" value={formatNumber(metrics.orders)} icon={ShoppingCart} hint={`${metrics.unitsSold} itens vendidos`} />
        <StatCard label="Ticket médio" value={formatBRL(metrics.averageTicket)} icon={TicketCheck} />
        <StatCard
          label="Produtos com estoque baixo"
          value={formatNumber(metrics.lowStockProducts)}
          icon={AlertTriangle}
          tone={metrics.lowStockProducts > 0 ? 'warning' : 'default'}
          hint="Alerta, crítico ou zerado"
          labelTooltip
        />
        <StatCard label="Produtos cadastrados" value={formatNumber(metrics.totalProducts)} icon={Package} labelTooltip />
        <StatCard label="Canais habilitados" value={`${metrics.enabledChannels} de ${metrics.totalChannels}`} icon={Store} />
      </div>

      {/* Comparativo entre marcas — apenas na visão consolidada */}
      {brandFilter === 'all' ? (
        <Card className="mt-4">
          <CardHeader>
            <div>
              <CardTitle>Desempenho por marca</CardTitle>
              <CardDescription>Cada marca é calculada de forma independente ({describePeriod(period, range)}).</CardDescription>
            </div>
          </CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>Marca</Th>
                <Th className="text-right">Faturamento</Th>
                <Th className="hidden text-right sm:table-cell">Confirmado</Th>
                <Th className="text-right">Pedidos</Th>
                <Th className="hidden text-right lg:table-cell">Itens</Th>
                <Th className="hidden text-right lg:table-cell">Ticket médio</Th>
                <Th className="hidden text-right xl:table-cell">Produtos</Th>
                <Th className="hidden text-right xl:table-cell">Estoque baixo</Th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <Tr key={row.brand.id}>
                  <Td>
                    <BrandBadge brandId={row.brand.id} />
                  </Td>
                  <Td className="text-right text-sm font-semibold tabular-nums">{formatBRL(row.revenue)}</Td>
                  <Td className="hidden text-right text-sm tabular-nums text-positive sm:table-cell">{formatBRL(row.confirmedRevenue)}</Td>
                  <Td className="text-right text-sm tabular-nums">{row.orders}</Td>
                  <Td className="hidden text-right text-sm tabular-nums lg:table-cell">{row.unitsSold}</Td>
                  <Td className="hidden text-right text-sm tabular-nums lg:table-cell">{formatBRL(row.averageTicket)}</Td>
                  <Td className="hidden text-right text-sm tabular-nums xl:table-cell">{row.totalProducts}</Td>
                  <Td className={`hidden text-right text-sm tabular-nums xl:table-cell ${row.lowStockProducts > 0 ? 'text-warning' : 'text-ink-muted'}`}>
                    {row.lowStockProducts}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      {/* Gráficos — empilhados em largura total: cada lista tem um número
          diferente de linhas, e lado a lado a mais curta deixaria um buraco. */}
      <div className="mt-4 flex flex-col gap-4">
        {/* Barras horizontais, um período por linha (estilo gráfico de pesquisa):
            mais baixo e mais legível que o antigo gráfico de área. */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Evolução das vendas</CardTitle>
              <CardDescription>
                Faturamento {EVOLUTION_GRAIN_LABELS[evolution.grain]} por pedidos não cancelados (simulado).
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {hasChartSales ? (
              <EvolutionBarList rows={evolution.rows} />
            ) : (
              <EmptyState
                title="Sem vendas no período"
                description="Ajuste os filtros de período, marca ou canal para ver o gráfico."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Faturamento por canal</CardTitle>
              <CardDescription>Canais ordenados por participação no período.</CardDescription>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-[11px] text-ink-muted">Total</span>
              <span className="block text-sm font-semibold text-ink tabular-nums">{formatBRL(channelRevenueTotal)}</span>
            </div>
          </CardHeader>
          {hasChannelSales ? (
            <ChannelRevenueList rows={channelSales} />
          ) : (
            <EmptyState title="Sem faturamento por canal" description="Nenhum pedido no escopo selecionado." />
          )}
        </Card>
      </div>

      {/* Listas */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Últimos pedidos</CardTitle>
              <CardDescription>Mais recentes no escopo selecionado.</CardDescription>
            </div>
            <Link to="/pedidos" className="text-xs font-medium text-terracotta hover:underline">
              Ver central
            </Link>
          </CardHeader>
          {latestOrders.length === 0 ? (
            <EmptyState title="Nenhum pedido" description="O escopo selecionado ainda não possui pedidos fictícios." />
          ) : (
            <ul className="divide-y divide-border">
              {latestOrders.map((order) => {
                const channel = state.channels.find((item) => item.id === order.channelId);
                return (
                  <li key={order.id}>
                    <Link
                      to={`/pedidos?q=${order.orderNumber.replace('#', '')}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-cream/50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-[11px] font-semibold text-ink-soft">
                        {initials(order.customerName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          {order.orderNumber} · {order.customerName}
                        </span>
                        <span className="block text-[11px] text-ink-muted">
                          {channel?.name ?? 'Canal'} · {formatRelative(order.createdAt)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold text-ink tabular-nums">{formatBRL(order.total)}</span>
                        <span className="mt-0.5 block">
                          <OrderStatusBadge status={order.orderStatus} />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Mais vendidos</CardTitle>
              <CardDescription>Por unidades no escopo selecionado.</CardDescription>
            </div>
          </CardHeader>
          {bestSellers.length === 0 ? (
            <EmptyState title="Sem vendas no período" description="Nenhum item vendido com os filtros atuais." />
          ) : (
            <ul className="divide-y divide-border">
              {bestSellers.map((item, index) => (
                <li key={item.productId} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-4 shrink-0 text-center text-xs font-semibold text-ink-muted">{index + 1}º</span>
                  <ProductThumb name={item.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                    <span className="block text-[11px] text-ink-muted">{item.sku}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold text-ink tabular-nums">{item.units} un.</span>
                    <span className="block text-[11px] text-ink-muted tabular-nums">{formatBRL(item.revenue)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Alertas de estoque</CardTitle>
              <CardDescription>
                Alerta ≤ {state.settings.alertThreshold} un. · Crítico ≤ {state.settings.criticalThreshold} un.
              </CardDescription>
            </div>
            <Link to="/estoque" className="text-xs font-medium text-terracotta hover:underline">
              Ver estoque
            </Link>
          </CardHeader>
          {stockAlerts.length === 0 ? (
            <EmptyState title="Estoque saudável" description="Nenhum produto abaixo dos limites configurados." />
          ) : (
            <ul className="divide-y divide-border">
              {stockAlerts.map((product) => (
                <li key={product.id} className="flex items-center gap-3 px-5 py-3">
                  <ProductThumb name={product.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{product.name}</span>
                    <span className="block text-[11px] text-ink-muted">
                      {product.sku} · mín. {product.minStock} un.
                    </span>
                  </span>
                  <StockBadge product={product} settings={state.settings} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Atividade */}
      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Atividades recentes</CardTitle>
            <CardDescription>Eventos gerados pelas ações realizadas na demonstração.</CardDescription>
          </div>
          <Link to="/atividade" className="text-xs font-medium text-terracotta hover:underline">
            Ver tudo
          </Link>
        </CardHeader>
        <CardContent className="divide-y divide-border px-0 py-0">
          {recentActivity.length === 0 ? (
            <EmptyState title="Nenhuma atividade" description="Interaja com os módulos para gerar eventos." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th className="pl-5">Evento</Th>
                  <Th className="hidden md:table-cell">Detalhe</Th>
                  <Th className="text-right">Quando</Th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((event) => (
                  <Tr key={event.id}>
                    <Td className="pl-5">
                      <span className="text-sm text-ink">{event.message}</span>
                    </Td>
                    <Td className="hidden text-xs text-ink-muted md:table-cell">{event.details ?? '—'}</Td>
                    <Td className="text-right text-xs whitespace-nowrap text-ink-muted">
                      {formatRelative(event.timestamp)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="mt-3 text-center text-[11px] text-ink-muted">
        Todos os valores, pedidos e clientes exibidos são fictícios e gerados localmente no navegador.
      </p>
    </>
  );
}
