import { useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  PackageSearch,
  Receipt,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDemo } from '@/store/DemoContext';
import { useToast } from '@/store/ToastContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Field, Select } from '@/components/ui/Form';
import { EmptyState, Table, Td, Th, Tr } from '@/components/ui/Table';
import {
  expensesByCategory,
  financeSummary,
  isConfirmedRevenue,
  isRevenueOrder,
  isWithin,
  ordersByStatus,
  periodRange,
  revenueByChannel,
  salesEvolution,
  stockLevel,
  PERIOD_LABELS,
} from '@/lib/calculations';
import { formatBRL, formatDate, formatNumber } from '@/lib/formatters';
import { downloadCsv } from '@/lib/csv';
import { BRANDS, brandName } from '@/data/brands';
import type { BrandId, PeriodKey } from '@/types';

const PIE_COLORS = ['#c4714e', '#a9782f', '#4d6b7c', '#4e7a52', '#b4524a', '#8a6d55', '#6f8a72'];

type BrandFilter = BrandId | 'all';

export function ReportsPage() {
  const { state } = useDemo();
  const { push } = useToast();

  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [channelFilter, setChannelFilter] = useState('all');

  // Canais disponíveis conforme a marca (canal nunca limpa a marca).
  const brandChannels = useMemo(
    () => (brandFilter === 'all' ? state.channels : state.channels.filter((channel) => channel.brandId === brandFilter)),
    [state.channels, brandFilter],
  );

  const scopedOrders = useMemo(() => {
    const range = periodRange(period);
    return state.orders.filter(
      (order) =>
        isWithin(order.createdAt, range) &&
        (brandFilter === 'all' || order.brandId === brandFilter) &&
        (channelFilter === 'all' || order.channelId === channelFilter),
    );
  }, [state.orders, period, brandFilter, channelFilter]);

  const scopedFinance = useMemo(
    () =>
      state.finance.filter(
        (entry) =>
          (brandFilter === 'all' || entry.brandId === brandFilter) &&
          (channelFilter === 'all' || entry.channelId === channelFilter),
      ),
    [state.finance, brandFilter, channelFilter],
  );

  const scopedProducts = useMemo(
    () => state.products.filter((product) => brandFilter === 'all' || product.brandId === brandFilter),
    [state.products, brandFilter],
  );

  const channelSales = useMemo(
    () =>
      revenueByChannel(state, period, { brandId: brandFilter, channelId: channelFilter }).filter(
        (row) => channelFilter === 'all' || row.channel.id === channelFilter,
      ),
    [state, period, brandFilter, channelFilter],
  );
  const bestSellers = useMemo(() => {
    const range = periodRange(period);
    const map = new Map<string, { productId: string; name: string; sku: string; brandId?: BrandId; units: number; revenue: number }>();
    scopedOrders
      .filter(isRevenueOrder)
      .filter((order) => isWithin(order.createdAt, range))
      .forEach((order) => {
        order.items.forEach((item) => {
          const current = map.get(item.productId) ?? {
            productId: item.productId,
            name: item.productName,
            sku: item.sku,
            brandId: state.products.find((product) => product.id === item.productId)?.brandId,
            units: 0,
            revenue: 0,
          };
          current.units += item.quantity;
          current.revenue += item.quantity * item.unitPrice;
          map.set(item.productId, current);
        });
      });
    return [...map.values()].sort((a, b) => b.units - a.units).slice(0, 10);
  }, [scopedOrders, period, state.products]);

  const evolution = useMemo(() => salesEvolution(scopedOrders, period), [scopedOrders, period]);
  const statusDistribution = useMemo(
    () => ordersByStatus(scopedOrders).filter((row) => row.count > 0),
    [scopedOrders],
  );
  const criticalProducts = useMemo(
    () => scopedProducts.filter((product) => ['critical', 'out'].includes(stockLevel(product.stock, state.settings))),
    [scopedProducts, state.settings],
  );
  const finance = useMemo(() => financeSummary(scopedFinance, period), [scopedFinance, period]);
  const expenses = useMemo(() => expensesByCategory(scopedFinance, period), [scopedFinance, period]);

  const revenueOrders = scopedOrders.filter(isRevenueOrder);
  const confirmedOrders = scopedOrders.filter(isConfirmedRevenue);
  const confirmedRevenue = confirmedOrders.reduce((sum, order) => sum + order.total, 0);
  const pendingRevenue = revenueOrders
    .filter((order) => !isConfirmedRevenue(order))
    .reduce((sum, order) => sum + order.total, 0);

  const channelName = (id?: string) => state.channels.find((item) => item.id === id)?.name ?? '—';
  const brandLabel = (id: BrandId) => brandName(id);

  /* ------------------------------ Exportações ------------------------------ */

  function exportSalesByChannel() {
    downloadCsv(
      `vendas-por-canal-${period}.csv`,
      ['Marca', 'Canal', 'Pedidos', 'Itens vendidos', 'Faturamento (R$)'],
      channelSales.map((row) => [
        brandLabel(row.channel.brandId),
        row.channel.name,
        row.orders,
        row.units,
        row.revenue.toFixed(2).replace('.', ','),
      ]),
    );
    push({ tone: 'success', title: 'CSV gerado', description: 'Relatório de vendas por canal exportado.' });
  }

  function exportTopProducts() {
    downloadCsv(
      `produtos-mais-vendidos-${period}.csv`,
      ['Produto', 'SKU', 'Marca', 'Unidades', 'Faturamento (R$)'],
      bestSellers.map((row) => [
        row.name,
        row.sku,
        row.brandId ? brandLabel(row.brandId) : '',
        row.units,
        row.revenue.toFixed(2).replace('.', ','),
      ]),
    );
    push({ tone: 'success', title: 'CSV gerado', description: 'Ranking de produtos exportado.' });
  }

  function exportOrders() {
    downloadCsv(
      `pedidos-${period}.csv`,
      ['Pedido', 'Marca', 'Data', 'Canal', 'Cliente', 'Itens', 'Total (R$)', 'Pagamento', 'Status'],
      revenueOrders.map((order) => [
        order.orderNumber,
        brandLabel(order.brandId),
        formatDate(order.createdAt),
        channelName(order.channelId),
        order.customerName,
        order.items.reduce((sum, item) => sum + item.quantity, 0),
        order.total.toFixed(2).replace('.', ','),
        order.paymentStatus,
        order.orderStatus,
      ]),
    );
    push({ tone: 'success', title: 'CSV gerado', description: 'Pedidos do período exportados.' });
  }

  function exportFinance() {
    downloadCsv(
      `resumo-financeiro-${period}.csv`,
      ['Indicador', 'Valor (R$)'],
      [
        ['Entradas', finance.income.toFixed(2).replace('.', ',')],
        ['Saídas', finance.expense.toFixed(2).replace('.', ',')],
        ['Saldo líquido', finance.net.toFixed(2).replace('.', ',')],
        ...expenses.map((row) => [`Despesa — ${row.category}`, row.total.toFixed(2).replace('.', ',')]),
      ],
    );
    push({ tone: 'success', title: 'CSV gerado', description: 'Resumo financeiro exportado.' });
  }

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Análises calculadas em tempo real a partir dos dados fictícios da aplicação."
        actions={<Badge tone="terracotta">Dados ilustrativos</Badge>}
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 px-4 py-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Período" htmlFor="reports-period">
            <Select id="reports-period" value={period} onChange={(event) => setPeriod(event.target.value as PeriodKey)}>
              {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Marca" htmlFor="reports-brand">
            <Select
              id="reports-brand"
              value={brandFilter}
              onChange={(event) => {
                setBrandFilter(event.target.value as BrandFilter);
                setChannelFilter('all');
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
          <Field label="Canal" htmlFor="reports-channel">
            <Select id="reports-channel" value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}>
              <option value="all">Todos os canais{brandFilter === 'all' ? '' : ' da marca'}</option>
              {brandChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2 lg:col-span-2">
            <Button size="sm" variant="outline" onClick={exportSalesByChannel}>
              <Download aria-hidden className="h-3.5 w-3.5" />
              Vendas por canal (CSV)
            </Button>
            <Button size="sm" variant="outline" onClick={exportTopProducts}>
              <Download aria-hidden className="h-3.5 w-3.5" />
              Top produtos (CSV)
            </Button>
            <Button size="sm" variant="outline" onClick={exportOrders}>
              <Download aria-hidden className="h-3.5 w-3.5" />
              Pedidos (CSV)
            </Button>
            <Button size="sm" variant="outline" onClick={exportFinance}>
              <Download aria-hidden className="h-3.5 w-3.5" />
              Financeiro (CSV)
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumo financeiro do período */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="px-5 py-4">
          <p className="text-xs text-ink-muted">Faturamento total (não cancelados)</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{formatBRL(revenueOrders.reduce((sum, order) => sum + order.total, 0))}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs text-ink-muted">Faturamento confirmado (pagos+)</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-positive">{formatBRL(confirmedRevenue)}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs text-ink-muted">A receber (não pagos)</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-warning">{formatBRL(pendingRevenue)}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs text-ink-muted">Saldo líquido financeiro</p>
          <p className={`mt-0.5 text-lg font-semibold tabular-nums ${finance.net >= 0 ? 'text-positive' : 'text-critical'}`}>{formatBRL(finance.net)}</p>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-1.5">
                <TrendingUp aria-hidden className="h-3.5 w-3.5 text-terracotta" />
                Evolução de vendas
              </CardTitle>
              <CardDescription>Faturamento por dia no período.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {evolution.some((point) => point.faturamento > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd1" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#93826f' }} tickLine={false} axisLine={{ stroke: '#e8dfd1' }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: '#93826f' }} tickLine={false} axisLine={false} width={56} tickFormatter={(value: number) => `${Math.round(value / 100) / 10}k`.replace('.', ',')} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8dfd1', fontSize: 12 }} formatter={(value) => formatBRL(Number(value))} />
                    <Line type="monotone" dataKey="faturamento" stroke="#c4714e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={TrendingUp} title="Sem vendas no período" description="Altere o período ou canal para ver a evolução." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-1.5">
                <BarChart3 aria-hidden className="h-3.5 w-3.5 text-terracotta" />
                Vendas por canal
              </CardTitle>
              <CardDescription>Faturamento e quantidade de pedidos.</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={exportSalesByChannel}>
              <Download aria-hidden className="h-3.5 w-3.5" />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            {channelSales.some((row) => row.revenue > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelSales} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd1" vertical={false} />
                    <XAxis dataKey="channel" tick={{ fontSize: 10, fill: '#93826f' }} tickLine={false} axisLine={{ stroke: '#e8dfd1' }} interval={0} tickFormatter={(value: string) => value.split(' — ')[0]} />
                    <YAxis tick={{ fontSize: 11, fill: '#93826f' }} tickLine={false} axisLine={false} width={56} tickFormatter={(value: number) => `${Math.round(value / 100) / 10}k`.replace('.', ',')} />
                    <Tooltip cursor={{ fill: '#f5efe4' }} contentStyle={{ borderRadius: 8, border: '1px solid #e8dfd1', fontSize: 12 }} formatter={(value) => formatBRL(Number(value))} />
                    <Bar dataKey="revenue" name="Faturamento" radius={[4, 4, 0, 0]}>
                      {channelSales.map((row) => (
                        <Cell key={row.channel.id} fill={row.channel.accent} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={BarChart3} title="Sem vendas por canal" description="Nenhum pedido no recorte selecionado." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-1.5">
                <ShoppingCart aria-hidden className="h-3.5 w-3.5 text-terracotta" />
                Distribuição de pedidos
              </CardTitle>
              <CardDescription>Quantidade por status no recorte.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-52 w-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution.map((row) => ({ name: row.label, value: row.count }))}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {statusDistribution.map((row, index) => (
                          <Cell key={row.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8dfd1', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-1.5">
                  {statusDistribution.map((row, index) => (
                    <li key={row.status} className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex items-center gap-1.5 text-ink-soft">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                        {row.label}
                      </span>
                      <span className="font-semibold tabular-nums text-ink">{formatNumber(row.count)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState icon={ShoppingCart} title="Sem pedidos" description="Nenhum pedido no período selecionado." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-1.5">
                <Receipt aria-hidden className="h-3.5 w-3.5 text-terracotta" />
                Resumo financeiro
              </CardTitle>
              <CardDescription>Entradas, saídas e despesas por categoria.</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={exportFinance}>
              <Download aria-hidden className="h-3.5 w-3.5" />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-positive-soft px-2 py-2.5">
                <p className="text-[10px] text-ink-muted">Entradas</p>
                <p className="text-sm font-semibold tabular-nums text-positive">{formatBRL(finance.income)}</p>
              </div>
              <div className="rounded-md bg-critical-soft px-2 py-2.5">
                <p className="text-[10px] text-ink-muted">Saídas</p>
                <p className="text-sm font-semibold tabular-nums text-critical">{formatBRL(finance.expense)}</p>
              </div>
              <div className="rounded-md bg-cream px-2 py-2.5">
                <p className="text-[10px] text-ink-muted">Saldo</p>
                <p className={`text-sm font-semibold tabular-nums ${finance.net >= 0 ? 'text-positive' : 'text-critical'}`}>{formatBRL(finance.net)}</p>
              </div>
            </div>
            {expenses.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {expenses.map((row) => (
                  <li key={row.category} className="flex items-center justify-between border-b border-border pb-1.5 text-xs last:border-0">
                    <span className="text-ink-soft">{row.category}</span>
                    <span className="font-medium tabular-nums text-ink">{formatBRL(row.total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">Sem despesas registradas no período.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabelas */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-1.5">
                <PackageSearch aria-hidden className="h-3.5 w-3.5 text-terracotta" />
                Produtos mais vendidos
              </CardTitle>
              <CardDescription>Top 10 por unidades no período.</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={exportTopProducts}>
              <Download aria-hidden className="h-3.5 w-3.5" />
              CSV
            </Button>
          </CardHeader>
          {bestSellers.length === 0 ? (
            <EmptyState icon={PackageSearch} title="Sem vendas" description="Nenhum item vendido no recorte selecionado." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Produto</Th>
                  <Th className="hidden sm:table-cell">SKU</Th>
                  <Th className="hidden lg:table-cell">Marca</Th>
                  <Th className="text-right">Unidades</Th>
                  <Th className="text-right">Faturamento</Th>
                </tr>
              </thead>
              <tbody>
                {bestSellers.map((row, index) => (
                  <Tr key={row.productId}>
                    <Td>
                      <span className="mr-2 text-xs font-semibold text-ink-muted">{index + 1}º</span>
                      <span className="text-sm text-ink">{row.name}</span>
                    </Td>
                    <Td className="hidden text-xs text-ink-muted sm:table-cell">{row.sku}</Td>
                    <Td className="hidden text-xs text-ink-soft lg:table-cell">
                      {row.brandId ? brandName(row.brandId) : '—'}
                    </Td>
                    <Td className="text-right text-sm tabular-nums">{row.units}</Td>
                    <Td className="text-right text-sm font-medium tabular-nums">{formatBRL(row.revenue)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Produtos com estoque crítico</CardTitle>
              <CardDescription>
                Situações “crítico” (≤ {state.settings.criticalThreshold}) e “sem estoque”.
              </CardDescription>
            </div>
          </CardHeader>
          {criticalProducts.length === 0 ? (
            <EmptyState title="Estoque saudável" description="Nenhum produto em situação crítica." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Produto</Th>
                  <Th className="hidden sm:table-cell">SKU</Th>
                  <Th className="text-right">Estoque</Th>
                  <Th className="text-right">Mínimo</Th>
                </tr>
              </thead>
              <tbody>
                {criticalProducts.map((product) => (
                  <Tr key={product.id}>
                    <Td className="text-sm text-ink">{product.name}</Td>
                    <Td className="hidden text-xs text-ink-muted sm:table-cell">{product.sku}</Td>
                    <Td className={`text-right text-sm font-semibold tabular-nums ${product.stock === 0 ? 'text-critical' : 'text-warning'}`}>
                      {product.stock} un.
                    </Td>
                    <Td className="text-right text-sm tabular-nums text-ink-muted">{product.minStock} un.</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <p className="mt-3 text-center text-[11px] text-ink-muted">
        Os CSVs são gerados no navegador, com separador “;” e codificação UTF-8 (compatível com Excel pt-BR).
      </p>
    </>
  );
}
