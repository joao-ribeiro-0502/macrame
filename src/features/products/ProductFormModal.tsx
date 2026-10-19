import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Form';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { type ProductFormValues } from '@/lib/validation';
import { formatBRL } from '@/lib/formatters';
import { uid } from '@/lib/demoActions';
import { BRANDS } from '@/data/brands';
import type { BrandId, Product, ProductVariant, SalesChannel, Settings } from '@/types';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  existingSkus: string[];
  categories: string[];
  channels: SalesChannel[];
  /** Marca pré-selecionada ao criar (ex.: quando a página já está filtrada por uma marca). */
  defaultBrandId?: BrandId;
  settings?: Settings;
  onSubmit: (values: ProductFormValues & { variants: ProductVariant[] }) => void;
}

interface VariantDraft {
  id: string;
  name: string;
  sku: string;
  stock: number;
}

export function ProductFormModal({
  open,
  onClose,
  product,
  existingSkus,
  categories,
  channels,
  defaultBrandId,
  onSubmit,
}: ProductFormModalProps) {
  const [variants, setVariants] = useState<VariantDraft[]>(
    () => product?.variants.map((variant) => ({ ...variant })) ?? [],
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    defaultValues: {
      brandId: product?.brandId ?? defaultBrandId ?? 'macrame',
      name: '',
      sku: '',
      description: '',
      category: '',
      price: 0,
      costPrice: 0,
      stock: 0,
      minStock: 0,
      status: 'active',
      channels: [],
      image: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    setVariants(product?.variants.map((variant) => ({ ...variant })) ?? []);
    reset({
      brandId: product?.brandId ?? defaultBrandId ?? 'macrame',
      name: product?.name ?? '',
      sku: product?.sku ?? '',
      description: product?.description ?? '',
      category: product?.category ?? '',
      price: product?.price ?? 0,
      costPrice: product?.costPrice ?? 0,
      stock: product?.stock ?? 0,
      minStock: product?.minStock ?? 0,
      status: product?.status ?? 'active',
      channels: product?.channels ?? [],
      image: product?.images[0] ?? '',
    });
  }, [open, product, reset, defaultBrandId]);

  const watchName = watch('name');
  const watchImage = watch('image');
  const watchBrandId = watch('brandId') as BrandId;

  // Um produto só anuncia nos canais da própria marca.
  const brandChannels = channels.filter((channel) => channel.brandId === watchBrandId);

  function onValid(values: ProductFormValues) {
    const sku = values.sku.trim().toUpperCase();
    if (existingSkus.includes(sku)) {
      setError('sku', { message: `O SKU "${sku}" já está cadastrado. Use outro código.` });
      return;
    }
    const cleaned = variants
      .filter((variant) => variant.name.trim().length > 0)
      .map((variant) => ({
        id: variant.id,
        name: variant.name.trim(),
        sku: variant.sku.trim().toUpperCase() || `${sku}-VAR`,
        stock: Math.max(0, Math.trunc(variant.stock || 0)),
      }));
    // Garante que só os canais da marca selecionada sobrevivam ao salvamento.
    const allowed = new Set(brandChannels.map((channel) => channel.id));
    const channels = values.channels.filter((id) => allowed.has(id));
    onSubmit({ ...values, sku, channels, variants: cleaned });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={product ? 'Editar produto' : 'Novo produto'}
      description={
        product
          ? 'Alterações valem apenas para esta demonstração local.'
          : 'Preencha os dados do produto artesanal para o cadastro central.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onValid)} loading={isSubmitting}>
            {product ? 'Salvar alterações' : 'Cadastrar produto'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onValid)} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Marca" htmlFor="product-brand" required error={errors.brandId?.message} className="sm:col-span-2">
            <Select id="product-brand" invalid={Boolean(errors.brandId)} {...register('brandId', { required: true })}>
              {BRANDS.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Nome do produto" htmlFor="product-name" required error={errors.name?.message} className="sm:col-span-2">
            <Input
              id="product-name"
              placeholder="Ex.: Painel de Macramê Sol Boho"
              invalid={Boolean(errors.name)}
              {...register('name', { required: 'Informe o nome do produto.' })}
            />
          </Field>

          <Field
            label="SKU"
            htmlFor="product-sku"
            required
            error={errors.sku?.message}
            hint="Código único no cadastro central."
          >
            <Input
              id="product-sku"
              placeholder="MAC-XXX-000"
              invalid={Boolean(errors.sku)}
              {...register('sku', {
                required: 'Informe o SKU.',
                onChange: (event) => {
                  const target = event.target as HTMLInputElement;
                  target.value = target.value.toUpperCase();
                },
              })}
            />
          </Field>

          <Field label="Categoria" htmlFor="product-category" required error={errors.category?.message}>
            <Input
              id="product-category"
              list="category-suggestions"
              placeholder="Ex.: Decoração"
              invalid={Boolean(errors.category)}
              {...register('category', { required: 'Informe a categoria.' })}
            />
            <datalist id="category-suggestions">
              {categories.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </Field>

          <Field label="Preço de venda (R$)" htmlFor="product-price" required error={errors.price?.message}>
            <Input
              id="product-price"
              type="number"
              step="0.01"
              min="0"
              invalid={Boolean(errors.price)}
              {...register('price', { required: 'Informe o preço.', valueAsNumber: true, min: { value: 0.01, message: 'O preço deve ser maior que zero.' } })}
            />
          </Field>

          <Field label="Custo unitário (R$)" htmlFor="product-cost" required error={errors.costPrice?.message}>
            <Input
              id="product-cost"
              type="number"
              step="0.01"
              min="0"
              invalid={Boolean(errors.costPrice)}
              {...register('costPrice', { required: 'Informe o custo.', valueAsNumber: true, min: { value: 0, message: 'O custo não pode ser negativo.' } })}
            />
          </Field>

          <Field label="Quantidade em estoque" htmlFor="product-stock" required error={errors.stock?.message}>
            <Input
              id="product-stock"
              type="number"
              step="1"
              min="0"
              invalid={Boolean(errors.stock)}
              {...register('stock', { required: 'Informe o estoque.', valueAsNumber: true, min: { value: 0, message: 'O estoque não pode ser negativo.' } })}
            />
          </Field>

          <Field label="Estoque mínimo" htmlFor="product-min" required error={errors.minStock?.message}>
            <Input
              id="product-min"
              type="number"
              step="1"
              min="0"
              invalid={Boolean(errors.minStock)}
              {...register('minStock', { required: 'Informe o estoque mínimo.', valueAsNumber: true, min: { value: 0, message: 'O mínimo não pode ser negativo.' } })}
            />
          </Field>

          <Field label="Status do produto" htmlFor="product-status" required error={errors.status?.message}>
            <Select id="product-status" invalid={Boolean(errors.status)} {...register('status', { required: true })}>
              <option value="active">Ativo</option>
              <option value="draft">Rascunho</option>
              <option value="inactive">Inativo</option>
            </Select>
          </Field>

          <Field
            label="Imagem (URL local ou data URI)"
            htmlFor="product-image"
            className="sm:col-span-2"
            hint="Opcional. A demonstração não carrega imagens externas automaticamente."
          >
            <div className="flex items-center gap-3">
              <ProductThumb name={watchName || 'Novo produto'} image={watchImage || undefined} />
              <Input id="product-image" placeholder="data:image/svg+xml;base64,…" {...register('image')} />
            </div>
          </Field>

          <Field label="Descrição" htmlFor="product-description" className="sm:col-span-2" error={errors.description?.message}>
            <Textarea id="product-description" placeholder="Materiais, medidas e detalhes artesanais…" {...register('description')} />
          </Field>
        </div>

        {/* Variações */}
        <div className="rounded-md border border-border bg-cream/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-ink">Variações</p>
              <p className="text-[11px] text-ink-muted">Opcional — cores, tamanhos ou modelos.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setVariants((current) => [
                  ...current,
                  { id: uid('var'), name: '', sku: `${watch('sku') || 'SKU'}-VAR${current.length + 1}`, stock: 0 },
                ])
              }
            >
              <Plus aria-hidden className="h-3.5 w-3.5" />
              Adicionar variação
            </Button>
          </div>
          {variants.length === 0 ? (
            <p className="text-xs text-ink-muted">Nenhuma variação cadastrada.</p>
          ) : (
            <ul className="space-y-2">
              {variants.map((variant, index) => (
                <li key={variant.id} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1.2fr_1fr_0.6fr_auto]">
                  <Field label={index === 0 ? 'Nome' : ''} htmlFor={`variant-name-${variant.id}`}>
                    <Input
                      id={`variant-name-${variant.id}`}
                      placeholder="Ex.: Cor natural"
                      value={variant.name}
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((item) => (item.id === variant.id ? { ...item, name: event.target.value } : item)),
                        )
                      }
                    />
                  </Field>
                  <Field label={index === 0 ? 'SKU da variação' : ''} htmlFor={`variant-sku-${variant.id}`}>
                    <Input
                      id={`variant-sku-${variant.id}`}
                      value={variant.sku}
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((item) => (item.id === variant.id ? { ...item, sku: event.target.value.toUpperCase() } : item)),
                        )
                      }
                    />
                  </Field>
                  <Field label={index === 0 ? 'Estoque' : ''} htmlFor={`variant-stock-${variant.id}`}>
                    <Input
                      id={`variant-stock-${variant.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={variant.stock}
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((item) =>
                            item.id === variant.id ? { ...item, stock: Math.max(0, Number(event.target.value) || 0) } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Remover variação"
                    className="mb-0.5 text-critical hover:bg-critical-soft"
                    onClick={() => setVariants((current) => current.filter((item) => item.id !== variant.id))}
                  >
                    <Trash2 aria-hidden className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Canais de venda (apenas os da marca do produto) */}
        <fieldset className="rounded-md border border-border p-4">
          <legend className="px-1 text-xs font-semibold text-ink">
            Canais de venda da {BRANDS.find((brand) => brand.id === watchBrandId)?.name ?? 'marca'} (simulados)
          </legend>
          <p className="mb-3 text-[11px] text-ink-muted">
            Um produto só pode ser anunciado nos canais da própria marca. Nenhuma publicação real acontece.
          </p>
          <Controller
            control={control}
            name="channels"
            render={({ field }) => (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {brandChannels.map((channel) => (
                  <Checkbox
                    key={channel.id}
                    id={`channel-${channel.id}`}
                    label={channel.name}
                    description={channel.enabled ? 'Canal habilitado na demo' : 'Canal desabilitado na demo'}
                    checked={field.value.includes(channel.id)}
                    onChange={(event) =>
                      field.onChange(
                        event.target.checked
                          ? [...field.value, channel.id]
                          : field.value.filter((id) => id !== channel.id),
                      )
                    }
                  />
                ))}
              </div>
            )}
          />
        </fieldset>

        {/* Resumo */}
        <p className="rounded-md border border-border bg-cream/40 px-3.5 py-2.5 text-xs text-ink-soft">
          Margem estimada por unidade:{' '}
          <strong className="text-ink">
            {Number(watch('price')) > 0 && Number(watch('costPrice')) >= 0
              ? formatBRL(Number(watch('price')) - Number(watch('costPrice')))
              : '—'}
          </strong>
        </p>

        {/* Envio pelo Enter também */}
        <button type="submit" className="sr-only">
          Salvar
        </button>
      </form>
    </Modal>
  );
}
