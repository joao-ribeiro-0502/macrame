import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Send, XCircle } from 'lucide-react';
import { useDemo } from '@/store/DemoContext';
import { useToast } from '@/store/ToastContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/Form';
import { Badge } from '@/components/ui/Badge';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { canPublish, productStockLevel } from '@/lib/calculations';
import { simulatePublication } from '@/lib/demoActions';
import { brandName } from '@/data/brands';
import { formatBRL, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/cn';
import type { Product, ProductPublication, SalesChannel, Settings } from '@/types';

interface PublishModalProps {
  open: boolean;
  product: Product;
  channels: SalesChannel[];
  settings: Settings;
  onClose: () => void;
}

type Step = 'select' | 'processing' | 'done';

export function PublishModal({ open, product, channels, settings, onClose }: PublishModalProps) {
  const { dispatch } = useDemo();
  const { push } = useToast();

  // Um produto só pode ser publicado nos canais da MARCA que o possui.
  const brandChannels = useMemo(
    () => channels.filter((channel) => channel.brandId === product.brandId),
    [channels, product.brandId],
  );

  const [selected, setSelected] = useState<string[]>(() =>
    product.channels.filter((id) => brandChannels.some((c) => c.id === id)),
  );
  const [forcedFailures, setForcedFailures] = useState<string[]>([]);
  const [step, setStep] = useState<Step>('select');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ProductPublication[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    if (!open) return;
    setStep('select');
    setError(null);
    setResults([]);
    setProcessedCount(0);
    setForcedFailures([]);
    setSelected(product.channels.filter((id) => brandChannels.some((c) => c.id === id)));
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [open, product, brandChannels]);

  const publishable = useMemo(() => canPublish(product, settings), [product, settings]);
  const level = productStockLevel(product, settings);

  function start() {
    setError(null);
    if (!publishable.ok) {
      setError(publishable.reason ?? 'Produto não pode ser publicado.');
      return;
    }
    if (selected.length === 0) {
      setError('Selecione ao menos um canal de venda para a publicação simulada.');
      return;
    }

    setStep('processing');
    setProcessedCount(0);
    timers.current.forEach(clearTimeout);
    timers.current = [];

    // Animação de processamento local, sem nenhuma chamada externa.
    selected.forEach((_channelId, index) => {
      const timer = setTimeout(() => {
        setProcessedCount(index + 1);
        if (index === selected.length - 1) finish();
      }, 450 * (index + 1));
      timers.current.push(timer);
    });
  }

  function finish() {
    const publicationResults = simulatePublication({
      channels: brandChannels,
      selectedIds: selected,
      forcedFailures,
      productName: product.name,
    });
    setResults(publicationResults);
    dispatch({ type: 'PRODUCT_PUBLISH_RESULT', productId: product.id, results: publicationResults });
    setStep('done');

    const okCount = publicationResults.filter((item) => item.status === 'published').length;
    const failCount = publicationResults.length - okCount;
    push({
      tone: failCount > 0 ? 'warning' : 'success',
      title: 'Publicação simulada concluída',
      description: `${okCount} canal(is) com sucesso${failCount > 0 ? ` e ${failCount} com falha simulada` : ''}. Nenhuma publicação real foi realizada.`,
    });
  }

  function toggleChannel(channelId: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, channelId] : current.filter((id) => id !== channelId)));
  }

  function toggleForcedFailure(channelId: string, checked: boolean) {
    setForcedFailures((current) => (checked ? [...current, channelId] : current.filter((id) => id !== channelId)));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Publicar produto nos canais"
      description={`Simulação local de publicação nos canais da marca ${brandName(product.brandId)} — nenhum marketplace real é acessado.`}
      footer={
        step === 'select' ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={start}>
              <Send aria-hidden className="h-4 w-4" />
              Publicar nos canais selecionados
            </Button>
          </>
        ) : (
          <Button variant={step === 'done' ? 'primary' : 'outline'} onClick={onClose} disabled={step === 'processing'}>
            {step === 'done' ? 'Concluir' : 'Aguarde…'}
          </Button>
        )
      }
    >
      {/* Resumo do produto */}
      <div className="flex items-center gap-3 rounded-md border border-border bg-cream/50 px-3.5 py-3">
        <ProductThumb name={product.name} image={product.images[0]} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
          <p className="text-[11px] text-ink-muted">
            {product.sku} · {brandName(product.brandId)} · {formatBRL(product.price)} · estoque {product.stock} un.
          </p>
        </div>
        <Badge tone={level === 'normal' ? 'positive' : level === 'low' ? 'warning' : 'critical'}>
          {level === 'out' ? 'Sem estoque' : level === 'critical' ? 'Estoque crítico' : level === 'low' ? 'Estoque baixo' : 'Estoque normal'}
        </Badge>
      </div>

      {!publishable.ok ? (
        <p role="alert" className="mt-3 rounded-md border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-xs font-medium text-critical">
          {publishable.reason}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-md border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-xs font-medium text-critical">
          {error}
        </p>
      ) : null}

      {step === 'select' ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-ink">Canais de venda desta marca</p>
          {brandChannels.map((channel) => {
            const checked = selected.includes(channel.id);
            return (
              <div key={channel.id} className="rounded-md border border-border px-3 py-2.5">
                <Checkbox
                  id={`publish-${channel.id}`}
                  label={channel.name}
                  description={
                    channel.enabled
                      ? 'Habilitado na demonstração'
                      : 'Desabilitado — a publicação simulada resultará em falha'
                  }
                  checked={checked}
                  onChange={(event) => toggleChannel(channel.id, event.target.checked)}
                />
                {checked ? (
                  <label className="mt-2 flex cursor-pointer items-center gap-2 pl-7 text-[11px] text-ink-muted">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-[var(--color-critical)]"
                      checked={forcedFailures.includes(channel.id)}
                      onChange={(event) => toggleForcedFailure(channel.id, event.target.checked)}
                    />
                    Forçar falha simulada neste canal (recurso de apresentação)
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {step === 'processing' || step === 'done' ? (
        <ul className="mt-4 space-y-2">
          {selected.map((channelId, index) => {
            const channel = brandChannels.find((item) => item.id === channelId);
            const done = processedCount > index;
            const result = step === 'done' ? results.find((item) => item.channelId === channelId) : undefined;
            return (
              <li
                key={channelId}
                className={cn(
                  'flex items-center gap-3 rounded-md border px-3.5 py-2.5',
                  step === 'done'
                    ? result?.status === 'published'
                      ? 'border-positive/30 bg-positive-soft'
                      : 'border-critical/30 bg-critical-soft'
                    : 'border-border bg-cream/40',
                )}
              >
                {step === 'done' ? (
                  result?.status === 'published' ? (
                    <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-positive" />
                  ) : (
                    <XCircle aria-hidden className="h-4 w-4 shrink-0 text-critical" />
                  )
                ) : done ? (
                  <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-positive" />
                ) : (
                  <Loader2 aria-hidden className="h-4 w-4 shrink-0 animate-spin text-terracotta" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{channel?.name ?? channelId}</p>
                  <p className="text-[11px] text-ink-muted">
                    {step === 'done'
                      ? (result?.message ?? 'Concluído.')
                      : done
                        ? 'Concluído.'
                        : 'Publicando na demonstração…'}
                  </p>
                </div>
                {step === 'done' && result?.publishedAt ? (
                  <span className="hidden shrink-0 text-[10px] text-ink-muted sm:block">
                    {formatDateTime(result.publishedAt)}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {step === 'done' ? (
        <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
          O registro acima foi gravado apenas no navegador, alimentando o histórico de atividade e o
          status visual do produto. <strong>Nenhuma publicação real foi realizada.</strong>
        </p>
      ) : null}
    </Modal>
  );
}
