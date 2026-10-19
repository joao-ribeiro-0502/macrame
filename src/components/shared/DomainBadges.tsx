import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { ORDER_STATUS_META, STOCK_LEVEL_META, stockLevel } from '@/lib/calculations';
import { brandById, CONSOLIDATED_LABEL } from '@/data/brands';
import type { BrandId, OrderStatus, PaymentStatus, Product, ProductStatus, Settings, StockLevel } from '@/types';

/* ------------------------------------------------------------------ */
/* Marca                                                               */
/* ------------------------------------------------------------------ */

/**
 * Identifica a MARCA proprietária de um registro. Ausente de qualquer
 * genérico como "Loja 1"/"Loja 2" — sempre o nome oficial da marca.
 */
export function BrandBadge({
  brandId,
  size = 'sm',
  className,
}: {
  brandId?: BrandId;
  size?: 'sm' | 'xs';
  className?: string;
}) {
  const brand = brandId ? brandById(brandId) : null;
  const label = brand ? brand.name : CONSOLIDATED_LABEL;
  const accent = brand ? brand.accent : '#8a6d55';
  return (
    <Badge tone="neutral" className={className}>
      <span
        aria-hidden
        className={`shrink-0 rounded-full ${size === 'xs' ? 'h-1.5 w-1.5' : 'h-2 w-2'}`}
        style={{ backgroundColor: accent }}
      />
      {label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Estoque                                                             */
/* ------------------------------------------------------------------ */

export function StockBadge({ product, settings }: { product: Product; settings: Settings }) {
  const level: StockLevel = stockLevel(product.stock, settings);
  const meta = STOCK_LEVEL_META[level];
  return (
    <Badge tone={meta.tone === 'neutral' ? 'neutral' : (meta.tone as BadgeTone)}>
      {meta.label} · {product.stock} un.
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Produto                                                             */
/* ------------------------------------------------------------------ */

const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Ativo', tone: 'positive' },
  draft: { label: 'Rascunho', tone: 'warning' },
  inactive: { label: 'Inativo', tone: 'neutral' },
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const meta = PRODUCT_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/* ------------------------------------------------------------------ */
/* Pedido                                                              */
/* ------------------------------------------------------------------ */

const STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  new: 'info',
  awaiting_payment: 'warning',
  paid: 'positive',
  separating: 'terracotta',
  shipped: 'info',
  delivered: 'positive',
  cancelled: 'critical',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{ORDER_STATUS_META[status].label}</Badge>;
}

const PAYMENT_META: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  paid: { label: 'Pago', tone: 'positive' },
  pending: { label: 'Pendente', tone: 'warning' },
  refunded: { label: 'Estornado', tone: 'critical' },
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
