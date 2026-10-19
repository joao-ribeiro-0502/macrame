/** Montagem do estado inicial da demonstração. */
import type { DemoState } from '@/types';
import { STATE_VERSION } from '@/lib/storage';
import { BRANDS } from '@/data/brands';
import { createDemoChannels, DEMO_CHANNEL_IDS } from '@/data/demoChannels';
import { createDemoProducts } from '@/data/demoProducts';
import { createDemoOrders } from '@/data/demoOrders';
import { createDemoFinance } from '@/data/demoFinance';
import { createDemoActivity } from '@/data/demoActivity';

export const DEFAULT_SETTINGS = {
  alertThreshold: 10,
  criticalThreshold: 5,
  // Um canal prioritário por marca (recebem disponibilidade quando o estoque é crítico).
  priorityChannels: [DEMO_CHANNEL_IDS.macrameNuvemshop, DEMO_CHANNEL_IDS.brilhoNuvemshop],
  // Distribuição simulada (%) do estoque entre as 8 combinações marca × plataforma.
  channelAllocation: {
    [DEMO_CHANNEL_IDS.macrameNuvemshop]: 16,
    [DEMO_CHANNEL_IDS.macrameMercadoLivre]: 12,
    [DEMO_CHANNEL_IDS.macrameShopee]: 10,
    [DEMO_CHANNEL_IDS.macrameTiktok]: 8,
    [DEMO_CHANNEL_IDS.brilhoNuvemshop]: 16,
    [DEMO_CHANNEL_IDS.brilhoMercadoLivre]: 14,
    [DEMO_CHANNEL_IDS.brilhoShopee]: 14,
    [DEMO_CHANNEL_IDS.brilhoTiktok]: 10,
  },
  notificationsEnabled: true,
  compactTables: false,
  physicalStoreReserve: 0,
} as const;

/**
 * Cria o estado fictício inicial. Um único "now" é compartilhado por todos
 * os módulos para manter coerência temporal entre pedidos e financeiro.
 */
export function createInitialData(now: Date = new Date()): DemoState {
  const channels = createDemoChannels(now);
  const products = createDemoProducts(now);
  const orders = createDemoOrders(products, now);
  const finance = createDemoFinance(orders, channels, now);
  const activity = createDemoActivity(products, orders, channels, now);

  return {
    version: STATE_VERSION,
    seededAt: now.toISOString(),
    brands: BRANDS,
    products,
    channels,
    orders,
    finance,
    activity,
    settings: {
      alertThreshold: DEFAULT_SETTINGS.alertThreshold,
      criticalThreshold: DEFAULT_SETTINGS.criticalThreshold,
      priorityChannels: [...DEFAULT_SETTINGS.priorityChannels],
      channelAllocation: { ...DEFAULT_SETTINGS.channelAllocation },
      notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
      compactTables: DEFAULT_SETTINGS.compactTables,
      physicalStoreReserve: DEFAULT_SETTINGS.physicalStoreReserve,
    },
  };
}
