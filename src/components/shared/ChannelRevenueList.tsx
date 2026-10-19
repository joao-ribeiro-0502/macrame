import { brandName } from '@/data/brands';
import { cn } from '@/lib/cn';
import { formatBRL, formatNumber, formatPercent } from '@/lib/formatters';
import type { ChannelSales } from '@/lib/calculations';

interface ChannelRevenueListProps {
  rows: ChannelSales[];
}

/**
 * Ranking de faturamento por canal.
 *
 * Por que NÃO é um gráfico de barras do Recharts: os rótulos são longos
 * ("Macramê do Leh — Mercado Livre") e, em um SVG estreito, precisam ser
 * truncados — aí fica impossível dizer qual canal é qual "só de bater o olho".
 *
 * Aqui cada linha mostra o nome COMPLETO da plataforma, a marca, o valor, a
 * participação no total e uma barra de proporção (tamanho = faturamento
 * relativo ao líder). Canais sem vendas aparecem no fim, apagados, para que o
 * silêncio deles também seja informação.
 */
export function ChannelRevenueList({ rows }: ChannelRevenueListProps) {
  const ranked = [...rows].sort((a, b) => b.revenue - a.revenue);
  const total = ranked.reduce((sum, row) => sum + row.revenue, 0);
  const leader = ranked[0]?.revenue ?? 0;

  return (
    <ul className="divide-y divide-border">
      {ranked.map((row, index) => {
        const share = total > 0 ? (row.revenue / total) * 100 : 0;
        const width = leader > 0 ? (row.revenue / leader) * 100 : 0;
        const silent = row.revenue <= 0;

        return (
          <li key={row.channel.id} className="px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums',
                    silent ? 'bg-cream text-ink-muted' : 'bg-sand text-ink-soft',
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  {/* Nome da plataforma por extenso — nunca truncado. */}
                  <span className={cn('block truncate text-sm font-medium', silent ? 'text-ink-soft' : 'text-ink')}>
                    {row.channel.platform}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: row.channel.accent }}
                    />
                    <span className="truncate">{brandName(row.channel.brandId)}</span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0 tabular-nums">
                      {formatNumber(row.orders)} {row.orders === 1 ? 'pedido' : 'pedidos'}
                    </span>
                  </span>
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className={cn('block text-sm font-semibold tabular-nums', silent ? 'text-ink-muted' : 'text-ink')}>
                  {formatBRL(row.revenue)}
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-muted tabular-nums">
                  {silent ? 'sem vendas' : `${formatPercent(share)} do total`}
                </span>
              </span>
            </div>

            {/* Barra de proporção: comprimento = faturamento relativo ao líder. */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cream" aria-hidden>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${silent ? 0 : Math.max(width, 2)}%`,
                  backgroundColor: row.channel.accent,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
