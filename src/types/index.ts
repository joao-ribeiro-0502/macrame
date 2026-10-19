/**
 * Tipos de domínio do protótipo de gestão multimarcas.
 * Todos os dados destes tipos são fictícios e vivem apenas no navegador.
 *
 * Estrutura lógica do negócio:
 *   Marca → Produtos da marca → Canais de venda da marca → Anúncios →
 *   Pedidos → Movimentações de estoque → Registros financeiros.
 */

/* ------------------------------------------------------------------ */
/* Marcas                                                              */
/* ------------------------------------------------------------------ */

/**
 * As duas marcas comerciais independentes geridas pelo sistema.
 * - `macrame` → Macramê do Leh
 * - `brilho`  → Brilho de Orixá
 */
export type BrandId = 'macrame' | 'brilho';

export interface Brand {
  id: BrandId;
  /** Nome oficial que deve aparecer em toda a interface. */
  name: string;
  /** Forma curta para espaços reduzidos. */
  shortName: string;
  /** Cor temática usada em gráficos e cards. */
  accent: string;
  description: string;
}

/**
 * Escopo de análise dos módulos: permite combinar marca e canal.
 * A seleção de um canal NÃO substitui a seleção da marca — os filtros
 * funcionam em conjunto (um canal pertence sempre a uma única marca).
 */
export interface DataScope {
  brandId: BrandId | 'all';
  channelId: string | 'all';
}

/* ------------------------------------------------------------------ */
/* Canais de venda                                                     */
/* ------------------------------------------------------------------ */

/** Plataformas de venda usadas pelas DUAS marcas. */
export type ChannelType = 'nuvemshop' | 'mercadolivre' | 'shopee' | 'tiktok';

/** Estado demonstrativo da conexão (não reflete nenhuma conta real). */
export type ChannelStatus = 'enabled' | 'disabled' | 'error';

/**
 * Uma combinação de marca × plataforma.
 * Exemplo: "Macramê do Leh — Nuvemshop" e "Brilho de Orixá — Nuvemshop"
 * são canais distintos, com conta, catálogo e pedidos próprios.
 */
export interface SalesChannel {
  id: string;
  brandId: BrandId;
  /** Tipo de plataforma. */
  type: ChannelType;
  /** Nome da plataforma (Nuvemshop, Mercado Livre, Shopee, TikTok Shop). */
  platform: string;
  /** Rótulo completo: "Macramê do Leh — Nuvemshop". */
  name: string;
  enabled: boolean;
  status: ChannelStatus;
  /** Cor temática usada em cards e gráficos. */
  accent: string;
  description: string;
  /** Identificador fictício da conta da marca na plataforma. */
  accountHandle: string;
  /** Última sincronização simulada (ISO). */
  lastSyncAt: string;
}

/* ------------------------------------------------------------------ */
/* Produtos                                                            */
/* ------------------------------------------------------------------ */

export type ProductStatus = 'active' | 'draft' | 'inactive';

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  stock: number;
}

export type PublicationStatus = 'published' | 'failed' | 'pending';

export interface ProductPublication {
  channelId: string;
  status: PublicationStatus;
  publishedAt?: string;
  message?: string;
}

export interface Product {
  id: string;
  /** Marca proprietária do produto (catálogo lógico separado por marca). */
  brandId: BrandId;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  costPrice: number;
  /** Estoque próprio do produto (nunca compartilhado entre marcas). */
  stock: number;
  minStock: number;
  /** Data-URIs ou caminhos locais; vazio = placeholder local gerado. */
  images: string[];
  variants: ProductVariant[];
  /** Canais (da mesma marca) selecionados para publicação. */
  channels: string[];
  /** Resultado da última publicação simulada por canal. */
  publications: ProductPublication[];
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Pedidos                                                             */
/* ------------------------------------------------------------------ */

export type PaymentStatus = 'paid' | 'pending' | 'refunded';

export type OrderStatus =
  | 'new'
  | 'awaiting_payment'
  | 'paid'
  | 'separating'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderEvent {
  id: string;
  timestamp: string;
  message: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  /** Marca responsável pela venda. */
  brandId: BrandId;
  /** Canal (marca × plataforma) em que o pedido foi realizado. */
  channelId: string;
  /** Nome 100% fictício. */
  customerName: string;
  customerCity: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
  /** Código fictício, gerado localmente. */
  trackingCode?: string;
  events: OrderEvent[];
  /**
   * Mecanismo idempotente: a baixa de estoque só ocorre na primeira
   * transição para "pago" e a reposição apenas uma vez no cancelamento.
   */
  stockDeducted: boolean;
  stockRestored: boolean;
  /** Referência ao lançamento financeiro gerado pela venda (evita duplicidade). */
  financeEntryId?: string;
}

/* ------------------------------------------------------------------ */
/* Financeiro                                                          */
/* ------------------------------------------------------------------ */

export type FinanceType = 'income' | 'expense';
export type FinanceStatus = 'confirmed' | 'pending' | 'cancelled';

export interface FinanceEntry {
  id: string;
  description: string;
  type: FinanceType;
  category: string;
  amount: number;
  date: string;
  /**
   * Marca à qual o lançamento pertence.
   * Ausente = lançamento explicitamente CONSOLIDADO (as duas marcas).
   */
  brandId?: BrandId;
  channelId?: string;
  status: FinanceStatus;
  /** Quando originado de um pedido pago — garante cálculo sem duplicidade. */
  orderId?: string;
}

/* ------------------------------------------------------------------ */
/* Atividade do sistema                                                */
/* ------------------------------------------------------------------ */

export type ActivityType =
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'publish_success'
  | 'publish_failure'
  | 'stock_changed'
  | 'order_updated'
  | 'finance_created'
  | 'finance_updated'
  | 'finance_deleted'
  | 'channel_toggled'
  | 'channel_synced'
  | 'settings_changed'
  | 'system';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string;
  relatedEntityId?: string;
  /** Rótulo da entidade relacionada para exibição. */
  details?: string;
}

/* ------------------------------------------------------------------ */
/* Configurações                                                       */
/* ------------------------------------------------------------------ */

export interface Settings {
  /** Estoque com quantidade <= este valor é considerado baixo. */
  alertThreshold: number;
  /** Estoque com quantidade <= este valor é considerado crítico. */
  criticalThreshold: number;
  /** Canais que continuam recebendo disponibilidade quando o estoque é crítico. */
  priorityChannels: string[];
  /** Distribuição simulada (%) de estoque por canal (chave = id do canal). */
  channelAllocation: Record<string, number>;
  notificationsEnabled: boolean;
  /** Densidade visual reduzida nas tabelas. */
  compactTables: boolean;
  /** Reserva informativa para a loja física (sem integração real). */
  physicalStoreReserve: number;
}

/* ------------------------------------------------------------------ */
/* Estado global da demonstração                                       */
/* ------------------------------------------------------------------ */

export interface DemoState {
  /** Versão do esquema para migrações futuras. */
  version: number;
  seededAt: string;
  /** Marcas comerciais geridas (Macramê do Leh e Brilho de Orixá). */
  brands: Brand[];
  products: Product[];
  channels: SalesChannel[];
  orders: Order[];
  finance: FinanceEntry[];
  activity: ActivityEvent[];
  settings: Settings;
}

/* ------------------------------------------------------------------ */
/* Utilitários de UI                                                   */
/* ------------------------------------------------------------------ */

export type PeriodKey = 'today' | '7d' | '30d' | 'month';

/**
 * Intervalo arbitrário de datas escolhido pelo usuário no calendário
 * (período personalizado). Datas em formato ISO `yyyy-mm-dd`, fuso local.
 */
export interface CustomRange {
  from: string;
  to: string;
}

/**
 * Entrada de período aceita pelos cálculos: uma pré-definição (Hoje,
 * Últimos 7 dias, …) ou um intervalo personalizado escolhido no calendário.
 */
export type PeriodInput = PeriodKey | CustomRange;

export type StockLevel = 'out' | 'critical' | 'low' | 'normal';

export interface PeriodRange {
  start: Date;
  end: Date;
}
