import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Form';
import { type FinanceFormValues } from '@/lib/validation';
import { BRANDS, CONSOLIDATED_LABEL } from '@/data/brands';
import type { BrandId, FinanceEntry, SalesChannel } from '@/types';

interface FinanceEntryModalProps {
  open: boolean;
  entry: FinanceEntry | null;
  channels: SalesChannel[];
  /** Marca pré-selecionada ao criar (ex.: quando a página já está filtrada por uma marca). */
  defaultBrandId?: BrandId;
  onClose: () => void;
  onSubmit: (values: FinanceFormValues, id: string | null) => void;
}

const CATEGORIES = {
  income: ['Vendas (pedidos)', 'Vendas avulsas', 'Serviços', 'Outras receitas'],
  expense: ['Insumos', 'Embalagem', 'Logística', 'Marketing', 'Taxas de canais', 'Estrutura', 'Capacitação', 'Outras despesas'],
} as const;

export function FinanceEntryModal({ open, entry, channels, defaultBrandId, onClose, onSubmit }: FinanceEntryModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FinanceFormValues>({
    defaultValues: {
      description: '',
      type: 'expense',
      category: CATEGORIES.expense[0],
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      channelId: '',
      brandId: defaultBrandId ?? '',
    },
  });

  const type = watch('type');
  const watchBrandId = watch('brandId') as BrandId | '';

  // Um lançamento de canal deve pertencer à marca selecionada.
  const brandChannels = watchBrandId ? channels.filter((channel) => channel.brandId === watchBrandId) : channels;

  useEffect(() => {
    if (!open) return;
    reset({
      description: entry?.description ?? '',
      type: entry?.type ?? 'expense',
      category: entry?.category ?? CATEGORIES.expense[0],
      amount: entry?.amount ?? 0,
      date: (entry?.date ?? new Date().toISOString()).slice(0, 10),
      channelId: entry?.channelId ?? '',
      brandId: entry?.brandId ?? defaultBrandId ?? '',
    });
  }, [open, entry, reset, defaultBrandId]);

  function onValid(values: FinanceFormValues) {
    onSubmit(values, entry?.id ?? null);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Editar lançamento' : 'Novo lançamento'}
      description="Registros fictícios — não representam movimentações financeiras reais."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onValid)} loading={isSubmitting}>
            {entry ? 'Salvar alterações' : 'Criar lançamento'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onValid)} className="space-y-4" noValidate>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1.5 text-xs font-medium text-ink-soft">
            Tipo de lançamento<span className="ml-0.5 text-terracotta">*</span>
          </legend>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <>
                {(['income', 'expense'] as const).map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                      field.value === option
                        ? option === 'income'
                          ? 'border-positive/40 bg-positive-soft text-positive'
                          : 'border-critical/40 bg-critical-soft text-critical'
                        : 'border-border bg-surface text-ink-muted hover:bg-cream'
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={field.value === option}
                      onChange={() => field.onChange(option)}
                    />
                    {option === 'income' ? 'Entrada' : 'Saída'}
                  </label>
                ))}
              </>
            )}
          />
        </fieldset>

        <Field label="Descrição" htmlFor="entry-description" required error={errors.description?.message}>
          <Input
            id="entry-description"
            placeholder="Ex.: Compra de fios de algodão"
            invalid={Boolean(errors.description)}
            {...register('description', { required: 'Informe a descrição.' })}
          />
        </Field>

        <Field label="Marca" htmlFor="entry-brand" hint="Deixe vazio para um lançamento consolidado (ambas as marcas).">
          <Select id="entry-brand" {...register('brandId')}>
            <option value="">{CONSOLIDATED_LABEL}</option>
            {BRANDS.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Categoria" htmlFor="entry-category" required error={errors.category?.message}>
            <Input
              id="entry-category"
              list="entry-categories"
              invalid={Boolean(errors.category)}
              {...register('category', { required: 'Informe a categoria.' })}
            />
            <datalist id="entry-categories">
              {CATEGORIES[type].map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </Field>

          <Field label="Valor (R$)" htmlFor="entry-amount" required error={errors.amount?.message}>
            <Input
              id="entry-amount"
              type="number"
              step="0.01"
              min="0"
              invalid={Boolean(errors.amount)}
              {...register('amount', {
                required: 'Informe o valor.',
                valueAsNumber: true,
                min: { value: 0.01, message: 'O valor deve ser maior que zero.' },
              })}
            />
          </Field>

          <Field label="Data" htmlFor="entry-date" required error={errors.date?.message}>
            <Input
              id="entry-date"
              type="date"
              invalid={Boolean(errors.date)}
              {...register('date', { required: 'Informe a data.' })}
            />
          </Field>

          <Field
            label={watchBrandId ? 'Canal desta marca (opcional)' : 'Canal (opcional)'}
            htmlFor="entry-channel"
            hint="Use para receitas e taxas por canal."
          >
            <Select id="entry-channel" {...register('channelId')}>
              <option value="">Sem canal específico</option>
              {brandChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {entry?.orderId ? (
          <p className="rounded-md border border-border bg-cream/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-muted">
            Este lançamento foi gerado automaticamente a partir de um pedido pago. Ele pode ser
            editado, mas nunca duplicado — e será cancelado caso o pedido seja cancelado.
          </p>
        ) : null}

        <button type="submit" className="sr-only">
          Salvar
        </button>
      </form>
    </Modal>
  );
}
