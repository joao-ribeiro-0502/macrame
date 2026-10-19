import { useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Search, SlidersHorizontal } from 'lucide-react';
import { useDemo } from '@/store/DemoContext';
import { useToast } from '@/store/ToastContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { StockBadge } from '@/components/shared/DomainBadges';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Field, Input, Select, Checkbox } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, Table, Td, Th, Tr } from '@/components/ui/Table';
import { stockDistribution, stockLevel } from '@/lib/calculations';
import { formatNumber, formatPercent } from '@/lib/formatters';
import { BRANDS } from '@/data/brands';
import type { BrandId, Product, Settings } from '@/types';

const REASONS = [
  { value: 'Reposição de produção', label: 'Reposição de produção' },
  { value: 'Correção de inventário', label: 'Correção de inventário' },
  { value: 'Perda ou avaria', label: 'Perda ou avaria' },
  { value: 'Venda avulsa na loja física', label: 'Venda avulsa na loja física' },
  { value: 'Ajuste manual', label: 'Ajuste manual' },
];

/* ------------------------------------------------------------------ */
/* Ajuste de estoque                                                   */
/* ------------------------------------------------------------------ */

function AdjustStockModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { dispatch } = useDemo();
  const { push } = useToast();
  const [quantity, setQuantity] = useState(String(product.stock));
  const [reason, setReason] = useState(REASONS[0].value);
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(quantity);
  const valid = Number.isInteger(parsed) && parsed >= 0;

  function confirm() {
    if (!valid) {
      setError('Informe uma quantidade inteira maior ou igual a zero.');
      return;
    }
    dispatch({ type: 'STOCK_SET', productId: product.id, stock: parsed, reason });
    push({
      tone: 'success',
      title: 'Estoque atualizado',
      description: `${product.name}: ${product.stock} → ${parsed} un. (simulação local).`,
    });
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Ajustar estoque"
      description="Alteração simulada — reflete imediatamente em produtos, dashboard e alertas."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!valid}>
            Aplicar ajuste
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-md border border-border bg-cream/50 px-3.5 py-3">
        <ProductThumb name={product.name} image={product.images[0]} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
          <p className="text-[11px] text-ink-muted">
            {product.sku} · estoque atual {product.stock} un. · mínimo {product.minStock} un.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Nova quantidade"
          htmlFor="adjust-quantity"
          required
          error={error ?? undefined}
          hint="Somente números inteiros."
        >
          <Input
            id="adjust-quantity"
            type="number"
            min="0"
            step="1"
            value={quantity}
            invalid={!valid && quantity !== ''}
            onChange={(event) => {
              setQuantity(event.target.value);
              setError(null);
            }}
          />
        </Field>
        <Field label="Motivo (registrado na atividade)" htmlFor="adjust-reason">
          <Select id="adjust-reason" value={reason} onChange={(event) => setReason(event.target.value)}>
            {REASONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {valid ? (
        <p className="mt-3 rounded-md border border-border bg-cream/40 px-3.5 py-2.5 text-xs text-ink-soft">
          Estoque passará de <strong className="text-ink">{product.stock}</strong> para{' '}
          <strong className="text-ink">{parsed}</strong> un.
          {parsed <= product.minStock ? (
            <span className="ml-1 text-warning"> (abaixo ou igual ao mínimo definido)</span>
          ) : null}
        </p>
      ) : null}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Página de estoque                                                   */
/* ------------------------------------------------------------------ */

export function InventoryPage() {
  const { state, dispatch } = useDemo();
  const { push } = useToast();

  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState<BrandId | 'all'>('all');
  const [situation, setSituation] = useState('all');
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [previewProductId, setPreviewProductId] = useState<string>(() => state.products[0]?.id ?? '');

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.products
      .filter((product) => {
        if (brand !== 'all' && product.brandId !== brand) return false;
        if (term && !product.name.toLowerCase().includes(term) && !product.sku.toLowerCase().includes(term)) return false;
        if (situation !== 'all' && stockLevel(product.stock, state.settings) !== situation) return false;
        return true;
      })
      .sort((a, b) => a.stock - a.minStock - (b.stock - b.minStock));
  }, [state.products, state.settings, search, brand, situation]);

  const brandProducts = useMemo(
    () => (brand === 'all' ? state.products : state.products.filter((product) => product.brandId === brand)),
    [state.products, brand],
  );

  const previewProduct =
    brandProducts.find((product) => product.id === previewProductId) ?? brandProducts[0] ?? state.products[0];
  const distribution = previewProduct ? stockDistribution(previewProduct, state.channels, state.settings) : [];
  const allocatedTotal = distribution.reduce((sum, slice) => sum + slice.allocated, 0);

  const lowCount = state.products.filter((product) => stockLevel(product.stock, state.settings) === 'low').length;
  const criticalCount = state.products.filter((product) => stockLevel(product.stock, state.settings) === 'critical').length;
  const outCount = state.products.filter((product) => stockLevel(product.stock, state.settings) === 'out').length;

  function togglePriority(channelId: string, checked: boolean) {
    const next: Settings = {
      ...state.settings,
      priorityChannels: checked
        ? [...state.settings.priorityChannels, channelId]
        : state.settings.priorityChannels.filter((id) => id !== channelId),
    };
    dispatch({ type: 'SETTINGS_SAVE', settings: next });
    push({ tone: 'info', title: 'Canal prioritário atualizado', description: 'Regra aplicada à distribuição simulada.' });
  }

  function setAllocation(channelId: string, value: number) {
    const next: Settings = {
      ...state.settings,
      channelAllocation: { ...state.settings.channelAllocation, [channelId]: Math.max(0, Math.min(100, value)) },
    };
    dispatch({ type: 'SETTINGS_SAVE', settings: next });
  }

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Visão unificada do estoque, alertas e distribuição simulada por canal."
      />

      {/* Resumo de situações */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="px-4 py-3.5">
          <p className="text-xs text-ink-muted">Produtos monitorados</p>
          <p className="mt-0.5 text-lg font-semibold text-ink tabular-nums">{formatNumber(state.products.length)}</p>
        </Card>
        <Card className="px-4 py-3.5">
          <p className="text-xs text-ink-muted">Estoque baixo</p>
          <p className="mt-0.5 text-lg font-semibold text-warning tabular-nums">{formatNumber(lowCount)}</p>
          <p className="text-[10px] text-ink-muted">≤ {state.settings.alertThreshold} un.</p>
        </Card>
        <Card className="px-4 py-3.5">
          <p className="text-xs text-ink-muted">Estoque crítico</p>
          <p className="mt-0.5 text-lg font-semibold text-critical tabular-nums">{formatNumber(criticalCount)}</p>
          <p className="text-[10px] text-ink-muted">≤ {state.settings.criticalThreshold} un.</p>
        </Card>
        <Card className="px-4 py-3.5">
          <p className="text-xs text-ink-muted">Sem estoque</p>
          <p className="mt-0.5 text-lg font-semibold text-critical tabular-nums">{formatNumber(outCount)}</p>
          <p className="text-[10px] text-ink-muted">Publicação bloqueada</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        {/* Tabela */}
        <Card className="2xl:col-span-2">
          <div className="grid grid-cols-1 gap-3 border-b border-border px-4 py-3.5 sm:grid-cols-3">
            <Field label="Buscar produto" htmlFor="inventory-search">
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  id="inventory-search"
                  type="search"
                  placeholder="Nome ou SKU…"
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </Field>
            <Field label="Marca" htmlFor="inventory-brand">
              <Select
                id="inventory-brand"
                value={brand}
                onChange={(event) => {
                  setBrand(event.target.value as BrandId | 'all');
                  setPreviewProductId('');
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
            <Field label="Situação" htmlFor="inventory-situation">
              <Select id="inventory-situation" value={situation} onChange={(event) => setSituation(event.target.value)}>
                <option value="all">Todas as situações</option>
                <option value="normal">Estoque normal</option>
                <option value="low">Estoque baixo</option>
                <option value="critical">Estoque crítico</option>
                <option value="out">Sem estoque</option>
              </Select>
            </Field>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={Boxes} title="Nenhum produto encontrado" description="Ajuste os filtros de busca ou situação." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Produto</Th>
                  <Th>Atual</Th>
                  <Th className="hidden sm:table-cell">Mínimo</Th>
                  <Th className="hidden lg:table-cell">Canais</Th>
                  <Th>Situação</Th>
                  <Th className="text-right">Ação</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => (
                  <Tr key={product.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <ProductThumb name={product.name} image={product.images[0]} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                          <p className="text-[11px] text-ink-muted">{product.sku}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-sm font-semibold tabular-nums">{product.stock} un.</Td>
                    <Td className="hidden text-sm tabular-nums text-ink-muted sm:table-cell">{product.minStock} un.</Td>
                    <Td className="hidden lg:table-cell">
                      <div className="flex max-w-44 flex-wrap gap-1">
                        {product.channels.length === 0 ? (
                          <span className="text-[11px] text-ink-muted">—</span>
                        ) : (
                          product.channels.map((channelId) => (
                            <Badge key={channelId}>
                              {state.channels.find((item) => item.id === channelId)?.name.split(' — ')[0] ?? channelId}
                            </Badge>
                          ))
                        )}
                      </div>
                    </Td>
                    <Td>
                      <StockBadge product={product} settings={state.settings} />
                    </Td>
                    <Td className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setAdjusting(product)}>
                        Ajustar
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Coluna de configuração */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Distribuição simulada</CardTitle>
                <CardDescription>Como o estoque seria rateado entre os canais habilitados.</CardDescription>
              </div>
              <SlidersHorizontal aria-hidden className="h-4 w-4 text-ink-muted" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Visualizar produto" htmlFor="distribution-product">
                <Select
                  id="distribution-product"
                  value={previewProductId}
                  onChange={(event) => setPreviewProductId(event.target.value)}
                >
                  {brandProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.stock} un.)
                    </option>
                  ))}
                </Select>
              </Field>

              {distribution.length === 0 ? (
                <p className="rounded-md border border-border bg-cream/40 px-3.5 py-3 text-xs text-ink-muted">
                  {previewProduct && previewProduct.stock <= 0
                    ? 'Produto sem estoque: nenhuma quantidade disponível para distribuição.'
                    : 'Selecione um produto com canais habilitados.'}
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {distribution.map((slice) => (
                    <li key={slice.channel.id}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1.5 text-ink">
                          {slice.channel.name}
                          {slice.priority ? <Badge tone="terracotta">prioritário</Badge> : null}
                        </span>
                        <span className="font-semibold tabular-nums text-ink-soft">{slice.allocated} un.</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-sand">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${previewProduct && previewProduct.stock > 0 ? Math.min(100, (slice.allocated / previewProduct.stock) * 100) : 0}%`,
                            backgroundColor: slice.channel.accent,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {distribution.length > 0 ? (
                <p className="text-[11px] text-ink-muted">
                  {formatNumber(allocatedTotal)} de {formatNumber(previewProduct?.stock ?? 0)} un. rateadas ·
                  excedente fica disponível para novos pedidos.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Canais prioritários</CardTitle>
                <CardDescription>
                  Com estoque crítico (≤ {state.settings.criticalThreshold} un.), a disponibilidade é
                  concentrada nestes canais.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {BRANDS.map((brand) => (
                <div key={brand.id} className="space-y-2">
                  <p className="flex items-center gap-1.5 pt-1 text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: brand.accent }} />
                    {brand.name}
                  </p>
                  {state.channels
                    .filter((channel) => channel.brandId === brand.id)
                    .map((channel) => (
                      <div key={channel.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                        <label className="flex min-w-0 items-center gap-2.5">
                          <Checkbox
                            id={`priority-${channel.id}`}
                            checked={state.settings.priorityChannels.includes(channel.id)}
                            onChange={(event) => togglePriority(channel.id, event.target.checked)}
                            disabled={!channel.enabled}
                            label={<span className="truncate text-sm text-ink">{channel.name.split(' — ')[1] ?? channel.name}</span>}
                          />
                        </label>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="5"
                            aria-label={`Percentual de rateio para ${channel.name}`}
                            value={state.settings.channelAllocation[channel.id] ?? 0}
                            onChange={(event) => setAllocation(channel.id, Number(event.target.value))}
                            className="h-8 w-16 text-right text-xs"
                            disabled={!channel.enabled}
                          />
                          <span className="text-xs text-ink-muted">%</span>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
              <p className="text-[11px] text-ink-muted">
                Rateio atual: {formatPercent(Object.values(state.settings.channelAllocation).reduce((sum, value) => sum + value, 0), 0)}.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Loja física (planejamento)</CardTitle>
                <CardDescription>Recurso informativo — sem integração com ponto de venda.</CardDescription>
              </div>
              <AlertTriangle aria-hidden className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <Field
                label="Reserva manual para loja física"
                htmlFor="physical-reserve"
                hint="Sugestão de separação de unidades para vendas presenciais. Não há sincronização real."
              >
                <Input
                  id="physical-reserve"
                  type="number"
                  min="0"
                  step="1"
                  value={state.settings.physicalStoreReserve}
                  onChange={(event) =>
                    dispatch({
                      type: 'SETTINGS_SAVE',
                      settings: {
                        ...state.settings,
                        physicalStoreReserve: Math.max(0, Math.trunc(Number(event.target.value) || 0)),
                      },
                    })
                  }
                />
              </Field>
            </CardContent>
          </Card>
        </div>
      </div>

      {adjusting ? <AdjustStockModal product={adjusting} onClose={() => setAdjusting(null)} /> : null}
    </>
  );
}
