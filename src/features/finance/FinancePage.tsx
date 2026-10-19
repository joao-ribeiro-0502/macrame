import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { Field, Input, Select } from '@/components/ui/Form';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState, Pagination, Table, Td, Th, Tr } from '@/components/ui/Table';
import { expensesByCategory, financeMonthlyEvolution, financeSummary, incomeByChannel, isWithin, periodRange, PERIOD_LABELS } from '@/lib/calculations';
import { formatBRL, formatDate } from '@/lib/formatters';
import { financeEntrySchema, type FinanceFormValues } from '@/lib/validation';
import { uid } from '@/lib/demoActions';
import { FinanceEntryModal } from '@/features/finance/FinanceEntryModal';
import { BRANDS, CONSOLIDATED_LABEL, brandById, brandName } from '@/data/brands';
import type { BrandId, FinanceEntry, PeriodKey } from '@/types';

const PAGE_SIZE = 10;
const PIE_COLORS = ['#c4714e', '#a9782f', '#4d6b7c', '#4e7a52', '#b4524a', '#8a6d55', '#6f8a72', '#c9a227'];

type BrandFilter = BrandId | 'all' | 'consolidated';

export function FinancePage() {
  const { state, dispatch } = useDemo();
  const { push } = useToast();

  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [deleting, setDeleting] = useState<FinanceEntry | null>(null);

  const scopedFinance = useMemo(() => {
    if (brandFilter === 'all') return state.finance;
    if (brandFilter === 'consolidated') return state.finance.filter((entry) => !entry.brandId);
    return state.finance.filter((entry) => entry.brandId === brandFilter);
  }, [state.finance, brandFilter]);

  const summary = useMemo(() => financeSummary(scopedFinance, period), [scopedFinance, period]);
  const monthly = useMemo(() => financeMonthlyEvolution(scopedFinance), [scopedFinance]);
  const byCategory = useMemo(() => expensesByCategory(scopedFinance, period), [scopedFinance, period]);
  const byChannel = useMemo(() => incomeByChannel(scopedFinance, state.channels, period), [scopedFinance, state.channels, period]);

  const filtered = useMemo(() => {
    const range = periodRange(period);
    const term = search.trim().toLowerCase();
    return scopedFinance
      .filter((entry) => {
        if (!isWithin(entry.date, range)) return false;
        if (typeFilter !== 'all' && entry.type !== typeFilter) return false;
        if (term && !entry.description.toLowerCase().includes(term) && !entry.category.toLowerCase().includes(term)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [scopedFinance, period, typeFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function submitEntry(values: FinanceFormValues, id: string | null) {
    const brandId = (values.brandId || undefined) as BrandId | undefined;
    const entry: FinanceEntry = id
      ? {
          ...(state.finance.find((item) => item.id === id) as FinanceEntry),
          description: values.description,
          type: values.type,
          category: values.category,
          amount: Math.round(values.amount * 100) / 100,
          date: new Date(`${values.date}T12:00:00`).toISOString(),
          channelId: values.channelId || undefined,
          brandId,
        }
      : {
          id: uid('fin'),
          description: values.description,
          type: values.type,
          category: values.category,
          amount: Math.round(values.amount * 100) / 100,
          date: new Date(`${values.date}T12:00:00`).toISOString(),
          channelId: values.channelId || undefined,
          brandId,
          status: 'confirmed',
        };

    const parsed = financeEntrySchema.safeParse({
      description: entry.description,
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
      date: values.date,
      channelId: entry.channelId ?? '',
      brandId: entry.brandId ?? '',
    });
    if (!parsed.success) {
      push({ tone: 'error', title: 'Lançamento inválido', description: 'Verifique os valores informados.' });
      return;
    }

    dispatch({ type: 'FINANCE_SAVE', entry, isNew: !id });
    setModalOpen(false);
    setEditing(null);
    push({
      tone: 'success',
      title: id ? 'Lançamento atualizado' : 'Lançamento criado',
      description: `${entry.description} — ${formatBRL(entry.amount)}.`,
    });
  }

  const pieData = byCategory.map((row) => ({ name: row.category, value: row.total }));

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Registros fictícios de entradas e saídas. Não há emissão fiscal, bancos ou gateways."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">Dados fictícios — não representa lucro contábil</Badge>
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus aria-hidden className="h-4 w-4" />
              Novo lançamento
            </Button>
          </div>
        }
      />

      {/* Resumo */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3.5 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-positive-soft text-positive">
            <ArrowDownRight aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-ink-muted">Entradas ({PERIOD_LABELS[period]})</p>
            <p className="text-lg font-semibold tabular-nums text-ink">{formatBRL(summary.income)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3.5 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-critical-soft text-critical">
            <ArrowUpRight aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-ink-muted">Saídas ({PERIOD_LABELS[period]})</p>
            <p className="text-lg font-semibold tabular-nums text-ink">{formatBRL(summary.expense)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3.5 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cream text-ink-soft">
            <Wallet aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-ink-muted">Saldo líquido do período</p>
            <p className={`text-lg font-semibold tabular-nums ${summary.net >= 0 ? 'text-positive' : 'text-critical'}`}>
              {formatBRL(summary.net)}
            </p>
          </div>
        </Card>
      </div>

      <p className="mt-2 text-[11px] text-ink-muted">
        Regra de receita: cada pedido pago gera <strong>um único</strong> lançamento vinculado — editar ou
        alterar o status de um pedido nunca duplica o faturamento.
      </p>

      {/* Gráficos */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Evolução financeira (6 meses)</CardTitle>
              <CardDescription>Entradas e saídas registradas na demonstração.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {monthly.some((row) => row.entradas > 0 || row.saidas > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd1" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#93826f' }} tickLine={false} axisLine={{ stroke: '#e8dfd1' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#93826f' }} tickLine={false} axisLine={false} width={56} tickFormatter={(value: number) => `${Math.round(value / 100) / 10}k`.replace('.', ',')} />
                    <Tooltip
                      cursor={{ fill: '#f5efe4' }}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e8dfd1', fontSize: 12 }}
                      formatter={(value) => formatBRL(Number(value))}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="entradas" name="Entradas" fill="#4e7a52" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saidas" name="Saídas" fill="#c4714e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="Sem dados no período" description="Registre lançamentos para ver a evolução mensal." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Despesas por categoria</CardTitle>
              <CardDescription>{PERIOD_LABELS[period]}.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
                      {pieData.map((row, index) => (
                        <Cell key={row.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8dfd1', fontSize: 12 }} formatter={(value) => formatBRL(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="Sem despesas" description="Nenhuma saída registrada no período." />
            )}
            <ul className="mt-2 space-y-1">
              {pieData.slice(0, 5).map((row, index) => (
                <li key={row.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-ink-soft">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    {row.name}
                  </span>
                  <span className="tabular-nums text-ink">{formatBRL(row.value)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Receitas por canal */}
      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Receitas por canal</CardTitle>
            <CardDescription>Lançamentos de entrada vinculados a canais ({PERIOD_LABELS[period]}).</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {byChannel.length > 0 ? (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {byChannel.map((row) => (
                <li key={row.channel.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-ink">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.channel.accent }} />
                    {row.channel.name}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-ink">{formatBRL(row.total)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sem receitas por canal" description="Nenhuma entrada vinculada a canal no período." />
          )}
        </CardContent>
      </Card>

      {/* Tabela de lançamentos */}
      <Card className="mt-4">
        <div className="grid grid-cols-1 gap-3 border-b border-border px-4 py-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Pesquisar" htmlFor="finance-search">
            <Input
              id="finance-search"
              type="search"
              placeholder="Descrição ou categoria…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Marca" htmlFor="finance-brand">
            <Select
              id="finance-brand"
              value={brandFilter}
              onChange={(event) => {
                setBrandFilter(event.target.value as BrandFilter);
                setPage(1);
              }}
            >
              <option value="all">Todas + consolidado</option>
              {BRANDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
              <option value="consolidated">{CONSOLIDATED_LABEL}</option>
            </Select>
          </Field>
          <Field label="Tipo" htmlFor="finance-type">
            <Select
              id="finance-type"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Entradas e saídas</option>
              <option value="income">Somente entradas</option>
              <option value="expense">Somente saídas</option>
            </Select>
          </Field>
          <Field label="Período" htmlFor="finance-period">
            <Select
              id="finance-period"
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value as PeriodKey);
                setPage(1);
              }}
            >
              {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nenhum lançamento no período"
            description="Ajuste os filtros ou crie um novo lançamento fictício."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
              >
                <Plus aria-hidden className="h-3.5 w-3.5" />
                Novo lançamento
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Descrição</Th>
                  <Th className="hidden xl:table-cell">Marca</Th>
                  <Th className="hidden md:table-cell">Categoria</Th>
                  <Th className="hidden lg:table-cell">Data</Th>
                  <Th className="hidden xl:table-cell">Canal</Th>
                  <Th>Tipo</Th>
                  <Th className="text-right">Valor</Th>
                  <Th className="hidden sm:table-cell">Status</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => {
                  const channel = state.channels.find((item) => item.id === entry.channelId);
                  return (
                    <Tr key={entry.id}>
                      <Td>
                        <p className="text-sm text-ink">{entry.description}</p>
                        {entry.orderId ? <p className="text-[10px] text-ink-muted">Vinculado a um pedido (sem duplicidade)</p> : null}
                      </Td>
                      <Td className="hidden xl:table-cell">
                        {entry.brandId ? (
                          <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-ink-soft">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: brandById(entry.brandId).accent }} />
                            {brandName(entry.brandId)}
                          </span>
                        ) : (
                          <span className="text-xs text-ink-muted">{CONSOLIDATED_LABEL}</span>
                        )}
                      </Td>
                      <Td className="hidden text-xs text-ink-soft md:table-cell">{entry.category}</Td>
                      <Td className="hidden text-xs whitespace-nowrap text-ink-muted lg:table-cell">{formatDate(entry.date)}</Td>
                      <Td className="hidden text-xs text-ink-soft xl:table-cell">{channel?.name ?? '—'}</Td>
                      <Td>
                        <Badge tone={entry.type === 'income' ? 'positive' : 'critical'}>
                          {entry.type === 'income' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </Td>
                      <Td className={`text-right text-sm font-semibold tabular-nums whitespace-nowrap ${entry.type === 'income' ? 'text-positive' : 'text-critical'}`}>
                        {entry.type === 'income' ? '+' : '−'} {formatBRL(entry.amount)}
                      </Td>
                      <Td className="hidden sm:table-cell">
                        <Badge tone={entry.status === 'confirmed' ? 'neutral' : entry.status === 'pending' ? 'warning' : 'critical'}>
                          {entry.status === 'confirmed' ? 'Confirmado' : entry.status === 'pending' ? 'Pendente' : 'Cancelado'}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Editar ${entry.description}`}
                            onClick={() => {
                              setEditing(entry);
                              setModalOpen(true);
                            }}
                          >
                            <Pencil aria-hidden className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Excluir ${entry.description}`}
                            className="text-critical hover:bg-critical-soft"
                            onClick={() => setDeleting(entry)}
                          >
                            <Trash2 aria-hidden className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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

      <FinanceEntryModal
        open={modalOpen}
        entry={editing}
        channels={state.channels}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={submitEntry}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          dispatch({ type: 'FINANCE_DELETE', entryId: deleting.id });
          push({
            tone: 'success',
            title: deleting.orderId ? 'Receita de pedido cancelada' : 'Lançamento excluído',
            description: deleting.orderId
              ? 'O registro foi mantido como cancelado para preservar o histórico.'
              : `${deleting.description} removido.`,
          });
          setDeleting(null);
        }}
        title="Excluir lançamento"
        confirmLabel={deleting?.orderId ? 'Cancelar receita' : 'Excluir'}
        message={
          deleting?.orderId ? (
            <span>
              Este lançamento vem de um pedido pago. Para manter a coerência contábil da demonstração, ele
              será <strong className="text-ink">marcado como cancelado</strong> em vez de excluído.
            </span>
          ) : (
            <span>
              O lançamento <strong className="text-ink">{deleting?.description}</strong> será removido e os
              indicadores serão recalculados.
            </span>
          )
        }
      />
    </>
  );
}
