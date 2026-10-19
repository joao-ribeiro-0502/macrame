import { cn } from '@/lib/cn';

const PALETTE = ['#e0d2b8', '#d9c3a5', '#e8d8c3', '#dcc9b0', '#e3d5bc', '#d5c1a3'];

function hash(value: string): number {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (result * 31 + value.charCodeAt(i)) % 100000;
  }
  return result;
}

interface ProductThumbProps {
  name: string;
  image?: string;
  className?: string;
}

/**
 * Miniatura de produto com placeholder local determinístico.
 * Nenhum asset externo é carregado — o protótipo funciona offline.
 */
export function ProductThumb({ name, image, className }: ProductThumbProps) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        loading="lazy"
        className={cn('h-10 w-10 shrink-0 rounded-md border border-border object-cover', className)}
      />
    );
  }
  const background = PALETTE[hash(name) % PALETTE.length];
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-sm font-semibold text-ink-soft',
        className,
      )}
      style={{ backgroundColor: background }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
