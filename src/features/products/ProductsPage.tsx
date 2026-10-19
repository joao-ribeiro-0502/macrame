import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Pencil, Plus, Send, Trash2, PackageX } from 'lucide-react';
import { useDemo } from '@/store/DemoContext';
import { useToast } from '@/store/ToastContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { OrderStatusBadge, ProductStatusBadge, StockBadge } from '@/components/shared/DomainBadges';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { EmptyState, Pagination, Table, Td, Th, Tr } from '@/components/ui/Table';
import { productSchema } from '@/lib/validation';
import { stockLevel } from '@/lib/calculations';
import { formatBRL, formatDate } from '@/lib/formatters';
import { uid } from '@/lib/demoActions';
import { ProductFormModal } from '@/features/products/ProductFormModal';
import { PublishModal } from '@/features/products/PublishModal';
import { BRANDS, brandById } from '@/data/brands';
import type { BrandId, Product } from '@/types';

const PAGE_SIZE = 8;

type BrandFilter = BrandId | 'all';

type SortKey = 'name-asc' | 'name-desc' | 'price-desc' | 'price-asc' | 'stock-asc' | 'updated-desc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'updated-desc', label: 'Mais recentes' },
  { value: 'name-asc', label: 'Nome (A–Z)' },
  { value: 'name-desc', label: 'Nome (Z–A)' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'stock-asc', label: 'Menor estoque' },
];

export function ProductsPage() {
  const { state, dispatch } = useDemo();
  const { push } = useToast();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [brand, setBrand] = useState<BrandFilter>('all');
  const [category, setCategory] = useState('all');
  const [channel, setChannel] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('updated-desc');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [publishing, setPublishing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [replaceWarning, setReplaceWarning] = useState<Product | null>(null);

  // Sincroniza a busca quando chega um termo da busca global do cabeçalho.
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearch(query);
      setPage(1);
    }
  }, [searchParams]);

  const categories = useMemo(() => {
    const source = brand === 'all' ? state.products : state.products.filter((product) => product.brandId === brand);
    return [...new Set(source.map((product) => product.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [state.products, brand]);

  const brandChannels = useMemo(
    () => (brand === 'all' ? state.channels : state.channels.filter((channel) => channel.brandId === brand)),
    [state.channels, brand],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = state.products.filter((product) => {
      if (brand !== 'all' && product.brandId !== brand) return false;
      if (term && !product.name.toLowerCase().includes(term) && !product.sku.toLowerCase().includes(term)) return false;
      if (category !== 'all' && product.category !== category) return false;
      if (channel !== 'all' && !product.channels.includes(channel)) return false;
      if (stockFilter !== 'all') {
        const level = stockLevel(product.stock, state.settings);
        if (stockFilter !== level) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case 'name-asc':
          return a.name.localeCompare(b.name, 'pt-BR');
        case 'name-desc':
          return b.name.localeCompare(a.name, 'pt-BR');
        case 'price-desc':
          return b.price - a.price;
        case 'price-asc':
          return a.price - b.price;
        case 'stock-asc':
          return a.stock - b.stock;
        case 'updated-desc':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    return rows;
  }, [state.products, state.settings, search, brand, category, channel, stockFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasOrders = (product: Product) => state.orders.some((order) => order.items.some((item) => item.productId === product.id));

  function confirmDelete() {
    if (!deleting) return;
    dispatch({ type: 'PRODUCT_DELETE', productId: deleting.id });
    push({ tone: 'success', title: 'Produto excluído', description: `${deleting.name} foi removido da demonstração.` });
    setDeleting(null);
  }

  function deactivateInstead(product: Product) {
    dispatch({ type: 'PRODUCT_SAVE', product: { ...product, status: 'inactive' }, isNew: false });
    setReplaceWarning(null);
    push({ tone: 'info', title: 'Produto inativado', description: 'O histórico de pedidos foi preservado.' });
  }

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Cadastro centralizado de produtos artesanais, com publicação simulada nos canais."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus aria-hidden className="h-4 w-4" />
            Novo produto
          </Button>
        }
      />

      <Card>
        {/* Filtros */}
        <div className="grid grid-cols-1 gap-3 border-b border-border px-4 py-3.5 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Buscar" htmlFor="filter-search" className="lg:col-span-2">
            <Input
              id="filter-search"
              type="search"
              placeholder="Nome ou SKU…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Marca" htmlFor="filter-brand">
            <Select
              id="filter-brand"
              value={brand}
              onChange={(event) => {
                setBrand(event.target.value as BrandFilter);
                setChannel('all');
                setCategory('all');
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
          <Field label="Categoria" htmlFor="filter-category">
            <Select id="filter-category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
              <option value="all">Todas as categorias</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Canal de venda" htmlFor="filter-channel">
            <Select id="filter-channel" value={channel} onChange={(event) => { setChannel(event.target.value); setPage(1); }}>
              <option value="all">Todos os canais{brand === 'all' ? '' : ' da marca'}</option>
              {brandChannels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Field label="Situação do estoque" htmlFor="filter-stock">
              <Select id="filter-stock" value={stockFilter} onChange={(event) => { setStockFilter(event.target.value); setPage(1); }}>
                <option value="all">Todas as situações</option>
                <option value="normal">Estoque normal</option>
                <option value="low">Estoque baixo</option>
                <option value="critical">Estoque crítico</option>
                <option value="out">Sem estoque</option>
              </Select>
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-cream/40 px-4 py-2.5">
          <p className="text-xs text-ink-muted">
            {filtered.length} produto{filtered.length === 1 ? '' : 's'} encontrado{filtered.length === 1 ? '' : 's'}
          </p>
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Ordenar por
            <Select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} aria-label="Ordenação" className="h-8 w-44 text-xs">
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {/* Tabela */}
        {rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum produto encontrado"
            description="Ajuste os filtros ou cadastre um novo produto artesanal."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus aria-hidden className="h-3.5 w-3.5" />
                Novo produto
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Produto</Th>
                  <Th className="hidden xl:table-cell">Marca</Th>
                  <Th className="hidden lg:table-cell">Categoria</Th>
                  <Th>Preço</Th>
                  <Th>Estoque</Th>
                  <Th className="hidden xl:table-cell">Canais</Th>
                  <Th className="hidden md:table-cell">Status</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => {
                  const publication = product.publications[0];
                  const productBrand = brandById(product.brandId);
                  return (
                    <Tr key={product.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <ProductThumb name={product.name} image={product.images[0]} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                            <p className="text-[11px] text-ink-muted">
                              {product.sku}
                              {product.variants.length > 0 ? ` · ${product.variants.length} variação(ões)` : ''}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td className="hidden xl:table-cell">
                        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: productBrand.accent }} />
                          {productBrand.name}
                        </span>
                      </Td>
                      <Td className="hidden text-xs text-ink-soft lg:table-cell">{product.category}</Td>
                      <Td className="text-sm tabular-nums whitespace-nowrap">{formatBRL(product.price)}</Td>
                      <Td>
                        <StockBadge product={product} settings={state.settings} />
                      </Td>
                      <Td className="hidden xl:table-cell">
                        <div className="flex max-w-56 flex-wrap gap-1">
                          {product.channels.length === 0 ? (
                            <span className="text-[11px] text-ink-muted">Nenhum canal</span>
                          ) : (
                            product.channels.map((channelId) => {
                              const channelItem = state.channels.find((item) => item.id === channelId);
                              const pub = product.publications.find((item) => item.channelId === channelId);
                              return (
                                <Badge
                                  key={channelId}
                                  tone={pub?.status === 'published' ? 'positive' : pub?.status === 'failed' ? 'critical' : 'neutral'}
                                  title={pub?.message ?? channelItem?.name}
                                >
                                  {channelItem?.name.split(' — ')[0] ?? channelId}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </Td>
                      <Td className="hidden md:table-cell">
                        <div className="flex flex-col items-start gap-1">
                          <ProductStatusBadge status={product.status} />
                          {publication?.status === 'published' ? (
                            <span className="text-[10px] text-ink-muted">Publicado (demo)</span>
                          ) : null}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Publicar nos canais selecionados (simulação)"
                            onClick={() => setPublishing(product)}
                          >
                            <Send aria-hidden className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Publicar</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Editar ${product.name}`}
                            onClick={() => {
                              setEditing(product);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil aria-hidden className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Excluir ${product.name}`}
                            className="text-critical hover:bg-critical-soft hover:text-critical"
                            onClick={() => (hasOrders(product) ? setReplaceWarning(product) : setDeleting(product))}
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

      {/* Formulário de cadastro/edição */}
      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
        existingSkus={state.products.filter((item) => item.id !== editing?.id).map((item) => item.sku.toUpperCase())}
        categories={categories}
        channels={state.channels}
        defaultBrandId={brand === 'all' ? undefined : brand}
        onSubmit={(values) => {
          const now = new Date().toISOString();
          const product: Product = {
            id: editing?.id ?? uid('prod'),
            brandId: values.brandId,
            images: values.image ? [values.image] : [],
            variants: values.variants,
            publications: editing?.publications ?? [],
            createdAt: editing?.createdAt ?? now,
            updatedAt: now,
            name: values.name,
            sku: values.sku.toUpperCase(),
            description: values.description,
            category: values.category,
            price: values.price,
            costPrice: values.costPrice,
            stock: values.stock,
            minStock: values.minStock,
            status: values.status,
            channels: values.channels,
          };
          const parsed = productSchema.safeParse({
            brandId: product.brandId,
            name: product.name,
            sku: product.sku,
            description: product.description,
            category: product.category,
            price: product.price,
            costPrice: product.costPrice,
            stock: product.stock,
            minStock: product.minStock,
            status: product.status,
            channels: product.channels,
            image: product.images[0] ?? '',
          });
          if (!parsed.success) {
            push({ tone: 'error', title: 'Verifique o formulário', description: 'Alguns campos estão inválidos.' });
            return;
          }
          dispatch({ type: 'PRODUCT_SAVE', product, isNew: !editing });
          setFormOpen(false);
          push({
            tone: 'success',
            title: editing ? 'Produto atualizado' : 'Produto cadastrado',
            description: `${product.name} salvo na demonstração.`,
          });
        }}
      />

      {/* Publicação simulada */}
      {publishing ? (
        <PublishModal
          open
          product={publishing}
          channels={state.channels}
          settings={state.settings}
          onClose={() => setPublishing(null)}
        />
      ) : null}

      {/* Exclusão simples */}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Excluir produto"
        confirmLabel="Excluir produto"
        message={
          deleting ? (
            <span>
              O produto <strong className="text-ink">{deleting.name}</strong> ({deleting.sku}) será removido
              definitivamente da demonstração.
            </span>
          ) : (
            ''
          )
        }
      />

      {/* Exclusão com histórico */}
      <Modal
        open={Boolean(replaceWarning)}
        onClose={() => setReplaceWarning(null)}
        title="Produto com pedidos associados"
        description="A exclusão direta prejudicaria o histórico da demonstração."
        footer={
          <>
            <Button variant="outline" onClick={() => setReplaceWarning(null)}>
              Cancelar
            </Button>
            {replaceWarning ? (
              <Button variant="primary" onClick={() => deactivateInstead(replaceWarning)}>
                <PackageX aria-hidden className="h-4 w-4" />
                Inativar em vez de excluir
              </Button>
            ) : null}
          </>
        }
      >
        {replaceWarning ? (
          <div className="space-y-3 text-sm leading-relaxed text-ink-soft">
            <p>
              <strong className="text-ink">{replaceWarning.name}</strong> participa de{' '}
              {state.orders.filter((order) => order.items.some((item) => item.productId === replaceWarning.id)).length}{' '}
              pedido(s) da demonstração. Excluir manteria os pedidos com referência quebrada.
            </p>
            <p>
              Recomendação: <strong className="text-ink">inativar o produto</strong>. Ele deixa de aparecer em
              ações de publicação, mas o histórico permanece íntegro.
            </p>
            <div className="rounded-md border border-border bg-cream/60 px-3.5 py-2.5 text-xs">
              {state.orders
                .filter((order) => order.items.some((item) => item.productId === replaceWarning.id))
                .slice(0, 4)
                .map((order) => (
                  <p key={order.id} className="py-0.5">
                    <OrderStatusBadge status={order.orderStatus} />{' '}
                    <span className="ml-1">
                      {order.orderNumber} · {formatDate(order.createdAt)}
                    </span>
                  </p>
                ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
