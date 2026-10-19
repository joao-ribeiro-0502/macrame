/**
 * Lançamentos financeiros fictícios + receitas derivadas de pedidos.
 * Cada lançamento aponta para UMA marca; quando não aponta, é explicitamente
 * consolidado (as duas marcas).
 */
import type { BrandId, FinanceEntry, Order, SalesChannel } from '@/types';
import { isConfirmedStatus } from '@/data/demoOrders';
import { DEMO_CHANNEL_IDS } from '@/data/demoChannels';

interface SeedEntry {
  daysAgo: number;
  description: string;
  type: FinanceEntry['type'];
  category: string;
  amount: number;
  /** Marca do lançamento; ausente = consolidado. */
  brand?: BrandId;
  channelId?: string;
  status?: FinanceEntry['status'];
}

const M_NUV = DEMO_CHANNEL_IDS.macrameNuvemshop;
const M_ML = DEMO_CHANNEL_IDS.macrameMercadoLivre;
const B_NUV = DEMO_CHANNEL_IDS.brilhoNuvemshop;
const B_SHP = DEMO_CHANNEL_IDS.brilhoShopee;

const SEED_ENTRIES: SeedEntry[] = [
  // ---- Saídas por marca ----
  { daysAgo: 44, description: 'Fios de algodão 4 mm — Macramê do Leh', type: 'expense', category: 'Insumos', amount: 486.7, brand: 'macrame' },
  { daysAgo: 41, description: 'Contas, missangas e fios de aço — Brilho de Orixá', type: 'expense', category: 'Insumos', amount: 312.4, brand: 'brilho' },
  { daysAgo: 38, description: 'Barbante encerado e argolas de madeira — Macramê do Leh', type: 'expense', category: 'Insumos', amount: 212.4, brand: 'macrame' },
  { daysAgo: 34, description: 'Palha da costa e fitas — Brilho de Orixá', type: 'expense', category: 'Insumos', amount: 168.9, brand: 'brilho' },
  { daysAgo: 22, description: 'Campanha de anúncios (simulada) — Brilho de Orixá / Shopee', type: 'expense', category: 'Marketing', amount: 260, brand: 'brilho', channelId: B_SHP },
  { daysAgo: 16, description: 'Taxas de canal — Macramê do Leh / Nuvemshop', type: 'expense', category: 'Taxas de canais', amount: 148.3, brand: 'macrame', channelId: M_NUV },
  { daysAgo: 15, description: 'Taxas de canal — Brilho de Orixá / Nuvemshop', type: 'expense', category: 'Taxas de canais', amount: 96.4, brand: 'brilho', channelId: B_NUV },
  { daysAgo: 8, description: 'Comissão de vendas — Macramê do Leh / Mercado Livre', type: 'expense', category: 'Taxas de canais', amount: 121.6, brand: 'macrame', channelId: M_ML },
  // ---- Saídas consolidadas (as duas marcas) ----
  { daysAgo: 27, description: 'Aluguel do ateliê (as duas marcas)', type: 'expense', category: 'Estrutura', amount: 950 },
  { daysAgo: 25, description: 'Energia e água do ateliê (as duas marcas)', type: 'expense', category: 'Estrutura', amount: 187.4 },
  { daysAgo: 26, description: 'Caixas kraft e material de embalagem (as duas marcas)', type: 'expense', category: 'Embalagem', amount: 178.9 },
  { daysAgo: 12, description: 'Postagem de pedidos — Correios (simulado, as duas marcas)', type: 'expense', category: 'Logística', amount: 342.8 },
  { daysAgo: 3, description: 'Reposição de argolas e conectores (as duas marcas)', type: 'expense', category: 'Insumos', amount: 143.2 },
  // ---- Entradas avulsas (fora dos pedidos) ----
  { daysAgo: 22, description: 'Venda avulsa — Feira de artesanato (Macramê do Leh)', type: 'income', category: 'Vendas avulsas', amount: 430, brand: 'macrame' },
  { daysAgo: 16, description: 'Workshop de macramê — turma de 8 pessoas', type: 'income', category: 'Serviços', amount: 520, brand: 'macrame' },
  { daysAgo: 9, description: 'Encomenda de guias para casa de santo — Brilho de Orixá', type: 'income', category: 'Vendas avulsas', amount: 640, brand: 'brilho' },
];

function dateFor(daysAgo: number, now: Date): string {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(11, 30, 0, 0);
  return date.toISOString();
}

/**
 * Receitas derivadas de pedidos.
 * REGRA: cada pedido pago gera exatamente UM lançamento (identificado por
 * FinanceEntry.orderId), sempre com a marca do pedido. O reducer rejeita
 * criações duplicadas — mudar o status de um pedido nunca soma duas vezes.
 */
export function createOrderIncomeEntries(orders: Order[], channels: SalesChannel[]): FinanceEntry[] {
  void channels;
  return orders
    .filter((order) => isConfirmedStatus(order.orderStatus))
    .map((order) => ({
      id: `fin-${order.id}`,
      description: `Venda do pedido ${order.orderNumber}`,
      type: 'income' as const,
      category: 'Vendas (pedidos)',
      amount: order.total,
      date: order.createdAt,
      brandId: order.brandId,
      channelId: order.channelId,
      status: 'confirmed' as const,
      orderId: order.id,
    }));
}

export function createDemoFinance(orders: Order[], channels: SalesChannel[], now: Date = new Date()): FinanceEntry[] {
  const manual: FinanceEntry[] = SEED_ENTRIES.map((entry, index) => ({
    id: `fin-manual-${index + 1}`,
    description: entry.description,
    type: entry.type,
    category: entry.category,
    amount: entry.amount,
    date: dateFor(entry.daysAgo, now),
    brandId: entry.brand,
    channelId: entry.channelId,
    status: entry.status ?? 'confirmed',
  }));

  return [...manual, ...createOrderIncomeEntries(orders, channels)];
}
