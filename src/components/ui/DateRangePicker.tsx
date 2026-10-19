import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatPeriodLabel } from '@/lib/calculations';
import { Button } from '@/components/ui/Button';
import type { CustomRange } from '@/types';

/* ------------------------------------------------------------------ */
/* Helpers de data (sem dependência externa)                           */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Quantos anos para trás/para frente o seletor oferece (crescimento ao longo do tempo). */
const YEAR_WINDOW = 10;

/** `Date` → `yyyy-mm-dd` no fuso LOCAL (nunca via `toISOString`, que desloca o dia). */
export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `yyyy-mm-dd` → `Date` local, ou `null` quando a data não existe (ex.: 2026-02-31). */
function fromISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/* ------------------------------------------------------------------ */
/* DateRangePicker                                                     */
/* ------------------------------------------------------------------ */

interface DateRangePickerProps {
  value: CustomRange | null;
  onApply: (range: CustomRange) => void;
  onClear: () => void;
  className?: string;
}

/**
 * Calendário de INTERVALO com navegação por mês e por ANO.
 *
 * Motivo da existência: o dashboard precisa responder "como minhas vendas
 * estavam há 5 anos?" sem abrir o livro caixa. Os presets cobrem períodos
 * curtos; este componente cobre qualquer intervalo arbitrário.
 *
 * Totalmente acessível: gatilho e dias são `<button>` (foco + Enter),
 * o painel é um `role="dialog"` e o `Esc` fecha.
 */
export function DateRangePicker({ value, onApply, onClear, className }: DateRangePickerProps) {
  const todayISO = toISODate(new Date());

  const [open, setOpen] = useState(false);
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const rootRef = useRef<HTMLDivElement>(null);

  /* Fecha ao clicar fora ou pressionar Esc */
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  /* Abre já posicionado no mês do intervalo atual */
  function toggle() {
    if (!open) {
      const start = value ? fromISODate(value.from) : null;
      setPendingFrom(value?.from ?? null);
      setPendingTo(value?.to ?? null);
      setView(
        start
          ? { year: start.getFullYear(), month: start.getMonth() }
          : { year: new Date().getFullYear(), month: new Date().getMonth() },
      );
    }
    setOpen(!open);
  }

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let year = current - YEAR_WINDOW; year <= current + YEAR_WINDOW; year += 1) years.push(year);
    return years;
  }, []);

  const grid = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const leading = first.getDay();
    const totalDays = new Date(view.year, view.month + 1, 0).getDate();
    const days: Array<{ iso: string; day: number }> = [];
    for (let day = 1; day <= totalDays; day += 1) {
      days.push({ iso: toISODate(new Date(view.year, view.month, day)), day });
    }
    return { leading, days };
  }, [view]);

  const activeFrom = value ? fromISODate(value.from) : null;
  const activeTo = value ? fromISODate(value.to) : null;
  const activeLabel = activeFrom && activeTo ? formatPeriodLabel({ start: activeFrom, end: activeTo }) : null;

  function changeMonth(delta: number) {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function selectDay(iso: string) {
    // Primeiro clique (ou clique após completar um intervalo) inicia uma nova seleção.
    if (!pendingFrom || pendingTo) {
      setPendingFrom(iso);
      setPendingTo(null);
      return;
    }
    // Clique numa data anterior reinicia o intervalo.
    if (iso < pendingFrom) {
      setPendingFrom(iso);
      setPendingTo(null);
      return;
    }
    setPendingTo(iso);
  }

  function apply() {
    if (!pendingFrom) return;
    onApply({ from: pendingFrom, to: pendingTo ?? pendingFrom });
    setOpen(false);
  }

  function clear() {
    setPendingFrom(null);
    setPendingTo(null);
    onClear();
    setOpen(false);
  }

  const pendingFromLabel = pendingFrom ? fromISODate(pendingFrom) : null;
  const pendingToLabel = pendingTo ? fromISODate(pendingTo) : null;

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          'inline-flex h-8 max-w-[16rem] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors',
          activeLabel
            ? 'border-terracotta bg-terracotta-soft text-terracotta-strong'
            : 'border-border bg-cream/60 text-ink-muted hover:border-border-strong hover:text-ink',
        )}
      >
        <CalendarDays aria-hidden className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{activeLabel ?? 'Personalizado'}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Selecionar período personalizado"
          className="absolute right-0 top-full z-40 mt-2 w-[19rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-3 shadow-lg"
        >
          {/* Navegação: mês e ANO, com atalho para meses vizinhos */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => changeMonth(-1)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-cream hover:text-ink"
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </button>

            <select
              aria-label="Mês"
              value={view.month}
              onChange={(event) => setView((current) => ({ ...current, month: Number(event.target.value) }))}
              className="h-8 w-[6.75rem] shrink-0 rounded-md border border-border-strong bg-surface px-2 text-xs font-medium text-ink transition-colors hover:border-ink-muted/60 focus:border-terracotta focus:outline-none"
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>

            <select
              aria-label="Ano"
              value={view.year}
              onChange={(event) => setView((current) => ({ ...current, year: Number(event.target.value) }))}
              className="h-8 w-[4.25rem] shrink-0 rounded-md border border-border-strong bg-surface px-1.5 text-xs font-medium text-ink transition-colors hover:border-ink-muted/60 focus:border-terracotta focus:outline-none"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => changeMonth(1)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-cream hover:text-ink"
            >
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-0.5" aria-hidden>
            {WEEKDAY_LABELS.map((weekday) => (
              <span key={weekday} className="text-center text-[10px] font-semibold uppercase text-ink-muted">
                {weekday}
              </span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-0.5">
            {Array.from({ length: grid.leading }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {grid.days.map((cell) => {
              const isStart = cell.iso === pendingFrom;
              const isEnd = cell.iso === pendingTo;
              const isBetween = Boolean(
                pendingFrom && pendingTo && cell.iso > pendingFrom && cell.iso < pendingTo,
              );
              const isToday = cell.iso === todayISO;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => selectDay(cell.iso)}
                  aria-pressed={isStart || isEnd}
                  aria-label={new Date(
                    Number(cell.iso.slice(0, 4)),
                    Number(cell.iso.slice(5, 7)) - 1,
                    Number(cell.iso.slice(8, 10)),
                  ).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  className={cn(
                    'h-8 rounded-md text-xs font-medium transition-colors',
                    isStart || isEnd
                      ? 'bg-terracotta text-white shadow-xs'
                      : isBetween
                        ? 'bg-terracotta-soft text-ink'
                        : 'text-ink-soft hover:bg-cream',
                    isToday && !isStart && !isEnd && !isBetween && 'ring-1 ring-inset ring-terracotta/50',
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <p className="min-w-0 truncate text-[11px] text-ink-muted">
              {pendingFromLabel
                ? pendingToLabel
                  ? formatPeriodLabel({ start: pendingFromLabel, end: pendingToLabel })
                  : 'Agora escolha a data final'
                : 'Escolha a data inicial'}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={clear}>
                Limpar
              </Button>
              <Button variant="primary" size="sm" onClick={apply} disabled={!pendingFrom}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
