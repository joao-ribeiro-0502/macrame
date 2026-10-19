import { formatBRL } from '@/lib/formatters';

export interface EvolutionBarRow {
  label: string;
  faturamento: number;
  pedidos: number;
}

interface EvolutionBarListProps {
  rows: EvolutionBarRow[];
}

/**
 * Evolução das vendas em BARRAS HORIZONTAIS (um período por linha).
 *
 * Formato de gráfico de pesquisa de intenção de voto: rótulo à esquerda, barra
 * proporcional no meio e valor à direita. Substituiu o gráfico de área porque,
 * para casar com a altura do card vizinho, ele ficava esticado na vertical.
 *
 * A ordem é CRONOLÓGICA (do período mais antigo ao mais recente), porque aqui a
 * leitura é de evolução no tempo — não de ranking.
 */
export function EvolutionBarList({ rows }: EvolutionBarListProps) {
  const max = rows.reduce((highest, row) => Math.max(highest, row.faturamento), 0);

  return (
    <ul className="divide-y divide-border">
      {rows.map((row, index) => {
        const width = max > 0 ? (row.faturamento / max) * 100 : 0;
        // Última linha = período mais recente; recebe destaque sutil.
        const isLatest = index === rows.length - 1;

        return (
          <li
            key={`${row.label}-${index}`}
            aria-label={`${row.label}: ${formatBRL(row.faturamento)} em ${row.pedidos} ${
              row.pedidos === 1 ? 'pedido' : 'pedidos'
            }`}
            className="flex items-center gap-3 px-5 py-2.5"
          >
            <span
              className={`w-14 shrink-0 text-[11px] tabular-nums ${isLatest ? 'font-semibold text-ink' : 'text-ink-muted'}`}
            >
              {row.label}
            </span>

            <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-cream" aria-hidden>
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-terracotta"
                style={{ width: `${width}%` }}
              />
            </span>

            <span
              className={`w-24 shrink-0 text-right text-xs tabular-nums ${
                isLatest ? 'font-semibold text-ink' : 'font-medium text-ink-soft'
              }`}
            >
              {formatBRL(row.faturamento)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
