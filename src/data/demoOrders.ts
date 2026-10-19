/**
 * Pedidos fictícios da demonstração (32 itens).
 * Cada pedido nasce em um canal específico — portanto, em uma marca específica —
 * com totais, eventos e códigos de rastreamento coerentes.
 */
import type { Order, OrderEvent, OrderItem, OrderStatus, PaymentStatus, Product } from '@/types';
import { orderTotals, round2 } from '@/lib/calculations';
import { channelBrand, DEMO_CHANNEL_IDS } from '@/data/demoChannels';

interface SeedOrder {
  daysAgo: number;
  hour: number;
  customer: string;
  city: string;
  channel: string;
  status: OrderStatus;
  items: Array<{ sku: string; qty: number }>;
  shipping?: number;
  discountPercent?: number;
}

const M_NUV = DEMO_CHANNEL_IDS.macrameNuvemshop;
const M_ML = DEMO_CHANNEL_IDS.macrameMercadoLivre;
const M_SHP = DEMO_CHANNEL_IDS.macrameShopee;
const M_TTK = DEMO_CHANNEL_IDS.macrameTiktok;
const B_NUV = DEMO_CHANNEL_IDS.brilhoNuvemshop;
const B_ML = DEMO_CHANNEL_IDS.brilhoMercadoLivre;
const B_SHP = DEMO_CHANNEL_IDS.brilhoShopee;
const B_TTK = DEMO_CHANNEL_IDS.brilhoTiktok;

const ORDERS: SeedOrder[] = [
  /* ---------------------- Macramê do Leh ---------------------- */
  { daysAgo: 47, hour: 9, customer: 'Marina Duarte', city: 'Santos/SP', channel: M_SHP, status: 'cancelled', items: [{ sku: 'MAC-CHV-003', qty: 2 }], shipping: 19.9 },
  { daysAgo: 54, hour: 10, customer: 'Ana Beatriz Souza', city: 'Curitiba/PR', channel: M_NUV, status: 'delivered', items: [{ sku: 'MAC-PAN-001', qty: 1 }], shipping: 0, discountPercent: 10 },
  { daysAgo: 50, hour: 14, customer: 'Carlos Menezes', city: 'Fortaleza/CE', channel: M_ML, status: 'delivered', items: [{ sku: 'MAC-SUP-002', qty: 2 }], shipping: 0 },
  { daysAgo: 46, hour: 11, customer: 'Juliana Prado', city: 'Belo Horizonte/MG', channel: M_SHP, status: 'delivered', items: [{ sku: 'MAC-PUL-014', qty: 4 }], shipping: 19.9 },
  { daysAgo: 42, hour: 16, customer: 'Fernanda Lima', city: 'Porto Alegre/RS', channel: M_NUV, status: 'delivered', items: [{ sku: 'MAC-LUM-008', qty: 1 }], shipping: 0 },
  { daysAgo: 39, hour: 9, customer: 'Rafael Nogueira', city: 'Salvador/BA', channel: M_NUV, status: 'delivered', items: [{ sku: 'MAC-KIT-009', qty: 1 }], shipping: 0 },
  { daysAgo: 36, hour: 13, customer: 'Patrícia Campos', city: 'Campinas/SP', channel: M_ML, status: 'delivered', items: [{ sku: 'MAC-PUL-014', qty: 3 }], shipping: 0 },
  { daysAgo: 33, hour: 18, customer: 'Beatriz Cardoso', city: 'Ribeirão Preto/SP', channel: M_SHP, status: 'delivered', items: [{ sku: 'MAC-PAN-001', qty: 1 }], shipping: 0 },
  { daysAgo: 29, hour: 11, customer: 'Larissa Moreira', city: 'Natal/RN', channel: M_NUV, status: 'delivered', items: [{ sku: 'MAC-PAN-001', qty: 1 }, { sku: 'MAC-CHV-003', qty: 1 }], shipping: 0 },
  { daysAgo: 25, hour: 9, customer: 'Camila Ferreira', city: 'Florianópolis/SC', channel: M_NUV, status: 'delivered', items: [{ sku: 'MAC-SUP-002', qty: 1 }, { sku: 'MAC-PUL-014', qty: 2 }], shipping: 0 },
  { daysAgo: 16, hour: 10, customer: 'Amanda Ribeiro', city: 'Sorocaba/SP', channel: M_NUV, status: 'delivered', items: [{ sku: 'MAC-BOL-004', qty: 1 }], shipping: 0 },
  { daysAgo: 12, hour: 11, customer: 'Vanessa Klippel', city: 'Blumenau/SC', channel: M_NUV, status: 'shipped', items: [{ sku: 'MAC-PUL-014', qty: 3 }], shipping: 0 },
  { daysAgo: 8, hour: 15, customer: 'Paulo Henrique Dias', city: 'Uberlândia/MG', channel: M_ML, status: 'shipped', items: [{ sku: 'MAC-KIT-009', qty: 1 }], shipping: 0 },
  { daysAgo: 4, hour: 11, customer: 'Felipe Antunes', city: 'Montes Claros/MG', channel: M_TTK, status: 'separating', items: [{ sku: 'MAC-CHV-003', qty: 3 }], shipping: 0 },
  { daysAgo: 1, hour: 14, customer: 'Nathalia Reis', city: 'Cuiabá/MT', channel: M_NUV, status: 'awaiting_payment', items: [{ sku: 'MAC-SUP-002', qty: 1 }, { sku: 'MAC-PUL-014', qty: 2 }], shipping: 0 },
  { daysAgo: 0, hour: 20, customer: 'Caio Bertoldo', city: 'Limeira/SP', channel: M_ML, status: 'new', items: [{ sku: 'MAC-KIT-009', qty: 1 }], shipping: 0 },

  /* ---------------------- Brilho de Orixá ---------------------- */
  { daysAgo: 45, hour: 9, customer: 'Renata Alves', city: 'Goiânia/GO', channel: B_SHP, status: 'cancelled', items: [{ sku: 'BRI-COL-003', qty: 1 }], shipping: 19.9 },
  { daysAgo: 52, hour: 10, customer: 'Débora Nascimento', city: 'Salvador/BA', channel: B_NUV, status: 'delivered', items: [{ sku: 'BRI-GUI-001', qty: 1 }], shipping: 0, discountPercent: 10 },
  { daysAgo: 48, hour: 14, customer: 'Luciana Rios', city: 'Rio de Janeiro/RJ', channel: B_ML, status: 'delivered', items: [{ sku: 'BRI-PUL-004', qty: 3 }], shipping: 0 },
  { daysAgo: 43, hour: 11, customer: 'Adriana Mendes', city: 'Santo André/SP', channel: B_NUV, status: 'delivered', items: [{ sku: 'BRI-GUI-002', qty: 1 }], shipping: 0 },
  { daysAgo: 41, hour: 16, customer: 'Rosângela Pires', city: 'Camaçari/BA', channel: B_SHP, status: 'delivered', items: [{ sku: 'BRI-COL-003', qty: 2 }], shipping: 0 },
  { daysAgo: 38, hour: 9, customer: 'Márcia Valente', city: 'Feira de Santana/BA', channel: B_NUV, status: 'delivered', items: [{ sku: 'BRI-KIT-008', qty: 1 }], shipping: 0 },
  { daysAgo: 35, hour: 13, customer: 'Cintia Barbosa', city: 'Belford Roxo/RJ', channel: B_ML, status: 'delivered', items: [{ sku: 'BRI-GUI-001', qty: 2 }], shipping: 0 },
  { daysAgo: 30, hour: 10, customer: 'Denise Coutinho', city: 'Niterói/RJ', channel: B_NUV, status: 'delivered', items: [{ sku: 'BRI-VEL-006', qty: 2 }], shipping: 0 },
  { daysAgo: 26, hour: 11, customer: 'Vera Lúcia Sales', city: 'Jaboatão/PE', channel: B_SHP, status: 'delivered', items: [{ sku: 'BRI-PUL-004', qty: 4 }], shipping: 19.9 },
  { daysAgo: 15, hour: 10, customer: 'Elaine Furtado', city: 'Maceió/AL', channel: B_NUV, status: 'delivered', items: [{ sku: 'BRI-GUI-001', qty: 1 }], shipping: 0 },
  { daysAgo: 11, hour: 14, customer: 'Priscila Nunes', city: 'Contagem/MG', channel: B_SHP, status: 'shipped', items: [{ sku: 'BRI-PUL-004', qty: 2 }], shipping: 0 },
  { daysAgo: 7, hour: 10, customer: 'Tânia Mara Rocha', city: 'Cuiabá/MT', channel: B_NUV, status: 'paid', items: [{ sku: 'BRI-GUI-002', qty: 1 }], shipping: 0 },
  { daysAgo: 5, hour: 11, customer: 'Simone Barreto', city: 'Campinas/SP', channel: B_ML, status: 'separating', items: [{ sku: 'BRI-COL-003', qty: 2 }], shipping: 0 },
  { daysAgo: 2, hour: 9, customer: 'Karina Lopes', city: 'Recife/PE', channel: B_TTK, status: 'awaiting_payment', items: [{ sku: 'BRI-BRC-005', qty: 2 }], shipping: 19.9 },
  { daysAgo: 1, hour: 17, customer: 'Gabriela Matos', city: 'São Gonçalo/RJ', channel: B_NUV, status: 'paid', items: [{ sku: 'BRI-VEL-006', qty: 1 }], shipping: 0 },
  { daysAgo: 0, hour: 8, customer: 'Roberta Pinheiro', city: 'Olinda/PE', channel: B_TTK, status: 'new', items: [{ sku: 'BRI-PUL-004', qty: 1 }], shipping: 0 },
];

function createdAtFor(order: SeedOrder, now: Date): Date {
  const date = new Date(now);
  date.setDate(date.getDate() - order.daysAgo);
  date.setHours(order.hour, (order.daysAgo * 13) % 60, 0, 0);
  return date;
}

function paymentStatusForSeed(status: OrderStatus): PaymentStatus {
  if (status === 'cancelled') return 'refunded';
  if (status === 'new' || status === 'awaiting_payment') return 'pending';
  return 'paid';
}

export function isConfirmedStatus(status: OrderStatus): boolean {
  return ['paid', 'separating', 'shipped', 'delivered'].includes(status);
}

function buildEvents(createdAt: Date, status: OrderStatus): OrderEvent[] {
  const events: OrderEvent[] = [
    { id: `evt-${createdAt.getTime()}-0`, timestamp: createdAt.toISOString(), message: 'Pedido recebido na demonstração.' },
  ];
  let cursor = new Date(createdAt);
  const step = (hours: number) => {
    cursor = new Date(cursor.getTime() + hours * 3600_000);
    return cursor.toISOString();
  };

  const flow: Array<[OrderStatus, string, number]> = [
    ['awaiting_payment', 'Aguardando confirmação de pagamento (simulado).', 1],
    ['paid', 'Pagamento confirmado (simulação) — baixa de estoque registrada.', 12],
    ['separating', 'Separando itens no ateliê.', 10],
    ['shipped', 'Pedido enviado — código de rastreamento fictício emitido.', 20],
    ['delivered', 'Entrega confirmada (registro fictício).', 48],
  ];

  const targetIndex = flow.findIndex(([key]) => key === status);
  if (status === 'cancelled') {
    events.push({
      id: `evt-${createdAt.getTime()}-c`,
      timestamp: step(26),
      message: 'Pedido cancelado na demonstração.',
    });
    return events;
  }

  const limit = status === 'new' ? 1 : targetIndex + 1;
  for (let i = 0; i < limit && i < flow.length; i += 1) {
    const [, message, hours] = flow[i];
    events.push({ id: `evt-${createdAt.getTime()}-${i + 1}`, timestamp: step(hours), message });
  }
  return events;
}

function trackingFor(order: SeedOrder, orderNumber: string): string | undefined {
  if (order.status === 'shipped' || order.status === 'delivered') {
    const digits = orderNumber.replace(/\D/g, '');
    return `BRMDL${digits.padStart(8, '0')}`;
  }
  return undefined;
}

function emailFor(customer: string): string {
  const slug = customer
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.');
  return `${slug}@exemplo.com.br`;
}

export function createDemoOrders(products: Product[], now: Date = new Date()): Order[] {
  const bySku = new Map(products.map((product) => [product.sku, product]));

  return ORDERS.map((seed, index) => {
    const number = 10000 + index + 1;
    const orderNumber = `#${number}`;
    const createdAt = createdAtFor(seed, now);

    const items: OrderItem[] = seed.items.map((entry) => {
      const product = bySku.get(entry.sku);
      return {
        productId: product?.id ?? `unknown-${entry.sku}`,
        productName: product?.name ?? entry.sku,
        sku: entry.sku,
        quantity: entry.qty,
        unitPrice: product?.price ?? 0,
      };
    });

    const subtotal = round2(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
    const shipping = seed.shipping ?? (subtotal >= 199 ? 0 : 24.9);
    const discount = seed.discountPercent ? round2((subtotal * seed.discountPercent) / 100) : 0;
    const { total } = orderTotals(items, shipping, discount);

    return {
      id: `order-${number}`,
      orderNumber,
      brandId: channelBrand(seed.channel),
      channelId: seed.channel,
      customerName: seed.customer,
      customerCity: seed.city,
      customerEmail: emailFor(seed.customer),
      items,
      subtotal,
      shipping,
      discount,
      total,
      paymentStatus: paymentStatusForSeed(seed.status),
      orderStatus: seed.status,
      createdAt: createdAt.toISOString(),
      trackingCode: trackingFor(seed, orderNumber),
      events: buildEvents(createdAt, seed.status),
      stockDeducted: isConfirmedStatus(seed.status),
      stockRestored: false,
    } satisfies Order;
  });
}
