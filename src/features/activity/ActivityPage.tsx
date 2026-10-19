import { useMemo, useState } from 'react';
import {
  Activity as ActivityIcon,
  Boxes,
  CircleDot,
  Package,
  Radio,
  Settings2,
  ShoppingCart,
  Store,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/store/DemoContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Form';
import { EmptyState, Pagination, Table, Td, Th, Tr } from '@/components/ui/Table';
import { formatDateTime, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/cn';
import type { ActivityEvent, ActivityType } from '@/types';

interface Category {
  key: string;
  label: string;
  types: ActivityType[];
  icon: typeof Package;
  tone: BadgeTone;
}

const CATEGORIES: Category[] = [
  { key: 'all', label: 'Todas as categorias', types: [], icon: ActivityIcon, tone: 'neutral' },
  { key: 'products', label: 'Produtos', types: ['product_created', 'product_updated', 'product_deleted'], icon: Package, tone: 'terracotta' },
  { key: 'publish', label: 'Publicações', types: ['publish_success', 'publish_failure'], icon: Radio, tone: 'info' },
  { key: 'stock', label: 'Estoque', types: ['stock_changed'], icon: Boxes, tone: 'warning' },
  { key: 'orders', label: 'Pedidos', types: ['order_updated'], icon: ShoppingCart, tone: 'positive' },
  { key: 'finance', label: 'Financeiro', types: ['finance_created', 'finance_updated', 'finance_deleted'], icon: Wallet, tone: 'positive' },
  { key: 'channels', label: 'Canais', types: ['channel_toggled', 'channel_synced'], icon: Store, tone: 'info' },
  { key: 'settings', label: 'Configurações e sistema', types: ['settings_changed', 'system'], icon: Settings2, tone: 'neutral' },
];

const PAGE_SIZE = 15;

function categoryOf(event: ActivityEvent): Category | undefined {
  return CATEGORIES.find((category) => category.types.includes(event.type));
}

export function ActivityPage() {
  const { state } = useDemo();
  const [categoryKey, setCategoryKey] = useState('all');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const category = CATEGORIES.find((item) => item.key === categoryKey) ?? CATEGORIES[0];

  const filtered = useMemo(
    () => (categoryKey === 'all' ? state.activity : state.activity.filter((event) => category.types.includes(event.type))),
    [state.activity, categoryKey, category],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Atividade do sistema"
        description="Histórico de eventos gerados pelas suas ações na demonstração."
        actions={
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Categoria
            <Select
              value={categoryKey}
              onChange={(event) => {
                setCategoryKey(event.target.value);
                setPage(1);
              }}
              aria-label="Filtrar por categoria"
              className="h-8 w-52 text-xs"
            >
              {CATEGORIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </label>
        }
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title="Nenhum evento nesta categoria"
            description="Interaje com os módulos do protótipo (produtos, pedidos, estoque…) para gerar atividade."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th className="w-8" />
                  <Th>Evento</Th>
                  <Th className="hidden md:table-cell">Categoria</Th>
                  <Th className="hidden lg:table-cell">Detalhe</Th>
                  <Th className="text-right">Quando</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((event) => {
                  const eventCategory = categoryOf(event);
                  const tone: BadgeTone =
                    event.type === 'publish_failure' || event.type === 'product_deleted'
                      ? 'critical'
                      : event.type === 'publish_success'
                        ? 'positive'
                        : (eventCategory?.tone ?? 'neutral');
                  const isOpen = expanded === event.id;
                  return (
                    <Tr
                      key={event.id}
                      className="cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : event.id)}
                    >
                      <Td className="pl-4">
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full',
                            event.type === 'publish_failure' ? 'bg-critical-soft text-critical' : 'bg-cream text-ink-soft',
                          )}
                        >
                          {eventCategory ? <eventCategory.icon aria-hidden className="h-3 w-3" /> : <CircleDot aria-hidden className="h-3 w-3" />}
                        </span>
                      </Td>
                      <Td>
                        <p className="text-sm text-ink">{event.message}</p>
                        {isOpen ? (
                          <div className="mt-1.5 rounded-md border border-border bg-cream/50 px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
                            <p>
                              <strong>Tipo:</strong> {event.type}
                            </p>
                            {event.details ? (
                              <p>
                                <strong>Detalhe:</strong> {event.details}
                              </p>
                            ) : null}
                            {event.relatedEntityId ? (
                              <p>
                                <strong>Entidade:</strong> {event.relatedEntityId}
                              </p>
                            ) : null}
                            <p>
                              <strong>Horário completo:</strong> {formatDateTime(event.timestamp)}
                            </p>
                          </div>
                        ) : null}
                      </Td>
                      <Td className="hidden md:table-cell">
                        <Badge tone={tone}>{eventCategory?.label ?? 'Sistema'}</Badge>
                      </Td>
                      <Td className="hidden max-w-56 truncate text-xs text-ink-muted lg:table-cell">{event.details ?? '—'}</Td>
                      <Td className="text-right text-xs whitespace-nowrap text-ink-muted" title={formatDateTime(event.timestamp)}>
                        {formatRelative(event.timestamp)}
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
        Os eventos listados correspondem a ações reais executadas durante esta sessão de demonstração —
        nenhum texto aleatório é gerado sem relação com as interações.
      </p>
    </>
  );
}
