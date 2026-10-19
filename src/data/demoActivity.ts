/** Eventos de atividade iniciais, coerentes com os dados semente das duas marcas. */
import type { ActivityEvent, Order, Product, SalesChannel } from '@/types';
import { DEMO_CHANNEL_IDS } from '@/data/demoChannels';
import { brandName } from '@/data/brands';

function at(daysAgo: number, hour: number, now: Date): string {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

export function createDemoActivity(
  products: Product[],
  orders: Order[],
  channels: SalesChannel[],
  now: Date = new Date(),
): ActivityEvent[] {
  const channelName = (id: string) => channels.find((channel) => channel.id === id)?.name ?? 'canal demonstrativo';

  const pan = products.find((p) => p.sku === 'MAC-PAN-001');
  const cam = products.find((p) => p.sku === 'MAC-CAM-005');
  const mob = products.find((p) => p.sku === 'MAC-MOB-017');
  const guia = products.find((p) => p.sku === 'BRI-GUI-001');
  const brinco = products.find((p) => p.sku === 'BRI-BRC-005');
  const treco = products.find((p) => p.sku === 'BRI-TRE-007');

  const recentOrder = orders.find((o) => o.orderStatus === 'awaiting_payment') ?? orders[orders.length - 1];
  const shipped = orders.find((o) => o.orderStatus === 'shipped');

  const events: ActivityEvent[] = [
    {
      id: 'act-seed-1',
      type: 'system',
      message:
        'Ambiente demonstrativo multimarcas inicializado: Macramê do Leh e Brilho de Orixá (dados fictícios).',
      timestamp: at(60, 8, now),
    },
    {
      id: 'act-seed-2',
      type: 'product_created',
      message: `Produto cadastrado em Macramê do Leh: ${pan?.name ?? 'Painel de Macramê Sol Boho'}.`,
      timestamp: at(58, 9, now),
      relatedEntityId: pan?.id,
      details: pan?.sku,
    },
    {
      id: 'act-seed-3',
      type: 'publish_success',
      message: `${pan?.name ?? 'Painel de Macramê Sol Boho'} publicado na demonstração em ${channelName(DEMO_CHANNEL_IDS.macrameNuvemshop)}.`,
      timestamp: at(57, 10, now),
      relatedEntityId: pan?.id,
      details: DEMO_CHANNEL_IDS.macrameNuvemshop,
    },
    {
      id: 'act-seed-4',
      type: 'product_created',
      message: `Produto cadastrado em Brilho de Orixá: ${guia?.name ?? 'Colar de Guia em Contas'}.`,
      timestamp: at(54, 10, now),
      relatedEntityId: guia?.id,
      details: guia?.sku,
    },
    {
      id: 'act-seed-5',
      type: 'publish_success',
      message: `${guia?.name ?? 'Colar de Guia em Contas'} publicado na demonstração em ${channelName(DEMO_CHANNEL_IDS.brilhoNuvemshop)}.`,
      timestamp: at(53, 11, now),
      relatedEntityId: guia?.id,
      details: DEMO_CHANNEL_IDS.brilhoNuvemshop,
    },
    {
      id: 'act-seed-6',
      type: 'channel_synced',
      message: `Erro de conexão simulado no canal ${channelName(DEMO_CHANNEL_IDS.brilhoTiktok)} (demonstração).`,
      timestamp: at(48, 14, now),
      details: DEMO_CHANNEL_IDS.brilhoTiktok,
    },
    {
      id: 'act-seed-7',
      type: 'stock_changed',
      message: `${cam?.name ?? 'Caminho de Mesa Macramê'} (Macramê do Leh) ficou sem estoque na simulação.`,
      timestamp: at(12, 9, now),
      relatedEntityId: cam?.id,
      details: '0 unidades',
    },
    {
      id: 'act-seed-8',
      type: 'stock_changed',
      message: `${brinco?.name ?? 'Brinco de Contas e Missangas'} (Brilho de Orixá) atingiu estoque crítico (4 unidades).`,
      timestamp: at(7, 16, now),
      relatedEntityId: brinco?.id,
      details: '4 unidades',
    },
    {
      id: 'act-seed-9',
      type: 'product_created',
      message: `Rascunho criado em Macramê do Leh: ${mob?.name ?? 'Mobile Decorativo Infantil'}.`,
      timestamp: at(20, 11, now),
      relatedEntityId: mob?.id,
      details: mob?.sku,
    },
    {
      id: 'act-seed-10',
      type: 'product_created',
      message: `Rascunho criado em Brilho de Orixá: ${treco?.name ?? 'Porta-Treco de Contas'}.`,
      timestamp: at(15, 11, now),
      relatedEntityId: treco?.id,
      details: treco?.sku,
    },
    {
      id: 'act-seed-11',
      type: 'settings_changed',
      message: 'Regras de estoque configuradas: alerta em 10 e crítico em 5 unidades.',
      timestamp: at(4, 8, now),
    },
  ];

  if (shipped) {
    events.push({
      id: 'act-seed-12',
      type: 'order_updated',
      message: `Pedido ${shipped.orderNumber} (${brandName(shipped.brandId)}) marcado como enviado (simulação).`,
      timestamp: at(3, 10, now),
      relatedEntityId: shipped.id,
      details: shipped.trackingCode,
    });
  }
  if (recentOrder) {
    events.push({
      id: 'act-seed-13',
      type: 'order_updated',
      message: `Novo pedido ${recentOrder.orderNumber} (${brandName(recentOrder.brandId)}) recebido via ${channelName(recentOrder.channelId)}.`,
      timestamp: recentOrder.createdAt,
      relatedEntityId: recentOrder.id,
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
