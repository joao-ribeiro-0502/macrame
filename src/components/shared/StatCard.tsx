import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: 'default' | 'positive' | 'warning' | 'critical';
  /**
   * Exibe o texto completo do título em tooltip acessível ao passar o mouse,
   * ao focar pelo teclado e ao tocar em telas touch. Use apenas em títulos
   * longos, que podem ser truncados pelo espaço disponível.
   */
  labelTooltip?: boolean;
}

const TONE_ICON = {
  default: 'bg-cream text-ink-soft',
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  critical: 'bg-critical-soft text-critical',
} as const;

export function StatCard({ label, value, icon: Icon, hint, tone = 'default', labelTooltip = false }: StatCardProps) {
  return (
    <Card className="flex items-start gap-3.5 px-4 py-4">
      <span className={cn('flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-md', TONE_ICON[tone])}>
        <Icon aria-hidden className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        {labelTooltip ? (
          <div className="group relative">
            <p
              tabIndex={0}
              className="truncate text-xs font-medium text-ink-muted outline-none focus-visible:underline focus-visible:underline-offset-2"
              aria-label={label}
            >
              {label}
            </p>
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full left-0 z-30 mt-1 hidden max-w-[14rem] rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-normal text-ink shadow-md group-hover:block group-focus-within:block"
            >
              {label}
            </span>
          </div>
        ) : (
          <p className="truncate text-xs font-medium text-ink-muted">{label}</p>
        )}
        <p className="mt-0.5 text-lg font-semibold tracking-tight text-ink tabular-nums">{value}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p> : null}
      </div>
    </Card>
  );
}

export function DeltaHint({ delta }: { delta: number }) {
  if (delta === 0) return null;
  const positive = delta > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-medium',
        positive ? 'text-positive' : 'text-critical',
      )}
    >
      <Icon aria-hidden className="h-3 w-3" />
      {Math.abs(delta).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
    </span>
  );
}
