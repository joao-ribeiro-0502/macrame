import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'positive' | 'warning' | 'critical' | 'info' | 'terracotta';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-cream text-ink-soft border-border',
  positive: 'bg-positive-soft text-positive border-positive/25',
  warning: 'bg-warning-soft text-warning border-warning/25',
  critical: 'bg-critical-soft text-critical border-critical/25',
  info: 'bg-info-soft text-info border-info/25',
  terracotta: 'bg-terracotta-soft text-terracotta-strong border-terracotta/25',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
