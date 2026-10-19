/**
 * Canais de venda fictícios = combinações de MARCA × PLATAFORMA.
 *
 * As duas marcas (Macramê do Leh e Brilho de Orixá) vendem nas MESMAS quatro
 * plataformas (Nuvemshop, Mercado Livre, Shopee e TikTok Shop), totalizando
 * 8 operações distintas e identificáveis. Nuvemshop NÃO é uma loja única
 * compartilhada: cada marca tem a própria conta/Nuvemshop.
 */
import type { BrandId, ChannelStatus, ChannelType, SalesChannel } from '@/types';

function makeId(brandId: BrandId, type: ChannelType): string {
  return `ch-${brandId}-${type}`;
}

export const DEMO_CHANNEL_IDS = {
  macrameNuvemshop: makeId('macrame', 'nuvemshop'),
  macrameMercadoLivre: makeId('macrame', 'mercadolivre'),
  macrameShopee: makeId('macrame', 'shopee'),
  macrameTiktok: makeId('macrame', 'tiktok'),
  brilhoNuvemshop: makeId('brilho', 'nuvemshop'),
  brilhoMercadoLivre: makeId('brilho', 'mercadolivre'),
  brilhoShopee: makeId('brilho', 'shopee'),
  brilhoTiktok: makeId('brilho', 'tiktok'),
} as const;

interface PlatformDef {
  type: ChannelType;
  platform: string;
  note: string;
}

const PLATFORMS: PlatformDef[] = [
  { type: 'nuvemshop', platform: 'Nuvemshop', note: 'Loja virtual própria da marca (simulada).' },
  { type: 'mercadolivre', platform: 'Mercado Livre', note: 'Marketplace de amplo alcance (simulado).' },
  { type: 'shopee', platform: 'Shopee', note: 'Marketplace com forte demanda (simulado).' },
  { type: 'tiktok', platform: 'TikTok Shop', note: 'Compra integrada a vídeos (simulado).' },
];

const BRAND_NAMES: Record<BrandId, string> = {
  macrame: 'Macramê do Leh',
  brilho: 'Brilho de Orixá',
};

const BRAND_HANDLES: Record<BrandId, string> = {
  macrame: 'macramedoleh',
  brilho: 'brilhodeorixa',
};

/** Cores temáticas distintas para as 8 combinações (marca → plataforma). */
const ACCENTS: Record<BrandId, Record<ChannelType, string>> = {
  macrame: {
    nuvemshop: '#a85c3d',
    mercadolivre: '#c07a3a',
    shopee: '#b4524a',
    tiktok: '#8a4a2e',
  },
  brilho: {
    nuvemshop: '#4d6b7c',
    mercadolivre: '#6b5b95',
    shopee: '#4e7a52',
    tiktok: '#a9782f',
  },
};

/** Estado demonstrativo inicial: um canal começa com "erro" simulado. */
const INITIAL_STATUS: Record<string, ChannelStatus> = {
  [DEMO_CHANNEL_IDS.brilhoTiktok]: 'error',
};

/** Mapa canal → marca (a relação é sempre 1:1). */
const BRAND_BY_CHANNEL: Record<string, BrandId> = {};
for (const brandId of ['macrame', 'brilho'] as const) {
  for (const platform of PLATFORMS) {
    BRAND_BY_CHANNEL[makeId(brandId, platform.type)] = brandId;
  }
}

/** Descobre a marca proprietária de um canal (usado ao montar os pedidos). */
export function channelBrand(channelId: string): BrandId {
  return BRAND_BY_CHANNEL[channelId] ?? 'macrame';
}

export function createDemoChannels(now: Date = new Date()): SalesChannel[] {
  const channels: SalesChannel[] = [];
  for (const brandId of ['macrame', 'brilho'] as const) {
    for (const platform of PLATFORMS) {
      const id = makeId(brandId, platform.type);
      channels.push({
        id,
        brandId,
        type: platform.type,
        platform: platform.platform,
        name: `${BRAND_NAMES[brandId]} — ${platform.platform}`,
        enabled: true,
        status: INITIAL_STATUS[id] ?? 'enabled',
        accent: ACCENTS[brandId][platform.type],
        description: `${platform.note} Operação da marca ${BRAND_NAMES[brandId]} (fictícia).`,
        accountHandle: `@${BRAND_HANDLES[brandId]}.${platform.type}`,
        lastSyncAt: new Date(now.getTime() - (channels.length + 1) * 37 * 60_000).toISOString(),
      });
    }
  }
  return channels;
}
