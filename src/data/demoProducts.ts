/**
 * Catálogo fictício de produtos (18 itens), dividido entre as DUAS marcas.
 * Cada produto pertence a uma única marca e ao estoque dela — nunca há
 * mistura automática de catálogo entre Macramê do Leh e Brilho de Orixá.
 */
import type { BrandId, Product, ProductPublication } from '@/types';
import { DEMO_CHANNEL_IDS } from '@/data/demoChannels';

interface SeedRow {
  brand: BrandId;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  status: Product['status'];
  description: string;
  channels: string[];
  published: string[];
  createdDaysAgo: number;
  variants?: Array<{ name: string; skuSuffix: string; stock: number }>;
}

/* ---- Canais da Macramê do Leh ---- */
const M_NUV = DEMO_CHANNEL_IDS.macrameNuvemshop;
const M_ML = DEMO_CHANNEL_IDS.macrameMercadoLivre;
const M_SHP = DEMO_CHANNEL_IDS.macrameShopee;
const M_TTK = DEMO_CHANNEL_IDS.macrameTiktok;

/* ---- Canais da Brilho de Orixá ---- */
const B_NUV = DEMO_CHANNEL_IDS.brilhoNuvemshop;
const B_ML = DEMO_CHANNEL_IDS.brilhoMercadoLivre;
const B_SHP = DEMO_CHANNEL_IDS.brilhoShopee;
const B_TTK = DEMO_CHANNEL_IDS.brilhoTiktok;

const ROWS: SeedRow[] = [
  /* ---------------------- Macramê do Leh ---------------------- */
  {
    brand: 'macrame',
    sku: 'MAC-PAN-001',
    name: 'Painel de Macramê Sol Boho',
    category: 'Decoração',
    price: 189.9,
    cost: 72,
    stock: 24,
    minStock: 8,
    status: 'active',
    description:
      'Painel de parede em nó duplo com detalhe de sol, algodão cru 4 mm. Peça assinada à mão no ateliê.',
    channels: [M_NUV, M_ML, M_SHP],
    published: [M_NUV, M_ML, M_SHP],
    createdDaysAgo: 210,
  },
  {
    brand: 'macrame',
    sku: 'MAC-SUP-002',
    name: 'Suporte para Plantas Pendurado',
    category: 'Decoração',
    price: 79.9,
    cost: 28,
    stock: 41,
    minStock: 10,
    status: 'active',
    description: 'Rede suspensa para vasos de até 15 cm, com argola de madeira natural.',
    channels: [M_NUV, M_ML, M_SHP],
    published: [M_NUV, M_ML, M_SHP],
    createdDaysAgo: 190,
  },
  {
    brand: 'macrame',
    sku: 'MAC-CHV-003',
    name: 'Chaveiro de Algodão Nó Celta',
    category: 'Acessórios',
    price: 24.9,
    cost: 8.5,
    stock: 6,
    minStock: 12,
    status: 'active',
    description: 'Chaveiro artesanal com nó celta e pingente de latão. Ótima opção para presente.',
    channels: [M_NUV, M_SHP],
    published: [M_NUV, M_SHP],
    createdDaysAgo: 160,
  },
  {
    brand: 'macrame',
    sku: 'MAC-BOL-004',
    name: 'Bolsa Artesanal Trançada',
    category: 'Acessórios',
    price: 149.9,
    cost: 55,
    stock: 3,
    minStock: 6,
    status: 'active',
    description: 'Bolsa transversal em macramê com alça ajustável e forro de algodão.',
    channels: [M_NUV, M_ML],
    published: [M_NUV, M_ML],
    createdDaysAgo: 150,
    variants: [
      { name: 'Cor natural', skuSuffix: '-NAT', stock: 2 },
      { name: 'Cor terracota', skuSuffix: '-TER', stock: 1 },
    ],
  },
  {
    brand: 'macrame',
    sku: 'MAC-CAM-005',
    name: 'Caminho de Mesa Macramê',
    category: 'Decoração',
    price: 119.9,
    cost: 42,
    stock: 0,
    minStock: 5,
    status: 'active',
    description: 'Caminho de mesa 40 × 120 cm com franjas, ideal para mesas rústicas e boho.',
    channels: [M_NUV],
    published: [M_NUV],
    createdDaysAgo: 140,
  },
  {
    brand: 'macrame',
    sku: 'MAC-LUM-008',
    name: 'Luminária Artesanal de Algodão',
    category: 'Decoração',
    price: 165,
    cost: 60,
    stock: 9,
    minStock: 5,
    status: 'active',
    description: 'Abajur pendente com cúpula em macramê e cabos de linho. Fio e soquete inclusos.',
    channels: [M_NUV, M_ML, M_SHP],
    published: [M_NUV, M_ML],
    createdDaysAgo: 100,
  },
  {
    brand: 'macrame',
    sku: 'MAC-KIT-009',
    name: 'Kit Decoração Boho (5 peças)',
    category: 'Kits',
    price: 249.9,
    cost: 95,
    stock: 15,
    minStock: 5,
    status: 'active',
    description:
      'Conjunto com painel pequeno, suporte de planta, chaveiro, enfeite floral e mini cortina.',
    channels: [M_NUV, M_SHP],
    published: [M_NUV, M_SHP],
    createdDaysAgo: 90,
  },
  {
    brand: 'macrame',
    sku: 'MAC-PUL-014',
    name: 'Pulseira Artesanal Ajustável',
    category: 'Acessórios',
    price: 19.9,
    cost: 6,
    stock: 55,
    minStock: 15,
    status: 'active',
    description: 'Pulseira em barbante encerado com fecho de latão. Várias cores disponíveis.',
    channels: [M_NUV, M_SHP, M_TTK],
    published: [M_NUV, M_SHP],
    createdDaysAgo: 55,
  },
  {
    brand: 'macrame',
    sku: 'MAC-MOB-017',
    name: 'Mobile Decorativo Infantil',
    category: 'Infantil',
    price: 109.9,
    cost: 39,
    stock: 0,
    minStock: 4,
    status: 'draft',
    description: 'Mobile artesanal com nuvens e estrelas, ideal para quarto infantil.',
    channels: [M_NUV, M_ML],
    published: [],
    createdDaysAgo: 15,
  },
  {
    brand: 'macrame',
    sku: 'MAC-TRE-018',
    name: 'Porta-Treco de Mesa',
    category: 'Utilidades',
    price: 49.9,
    cost: 17,
    stock: 10,
    minStock: 6,
    status: 'inactive',
    description:
      'Bandeja pequena em macramê com base firme. Descontinuado na demonstração para servir de exemplo de produto inativo.',
    channels: [M_NUV],
    published: [],
    createdDaysAgo: 45,
  },

  /* ---------------------- Brilho de Orixá ---------------------- */
  {
    brand: 'brilho',
    sku: 'BRI-GUI-001',
    name: 'Colar de Guia em Contas',
    category: 'Guias e colares',
    price: 139.9,
    cost: 52,
    stock: 22,
    minStock: 6,
    status: 'active',
    description: 'Guia em fio de contas coloridas, montada à mão com acabamento em firmeza.',
    channels: [B_NUV, B_ML, B_SHP],
    published: [B_NUV, B_ML, B_SHP],
    createdDaysAgo: 180,
  },
  {
    brand: 'brilho',
    sku: 'BRI-GUI-002',
    name: 'Guia de Orixá com Palha da Costa',
    category: 'Guias e colares',
    price: 159.9,
    cost: 61,
    stock: 14,
    minStock: 6,
    status: 'active',
    description: 'Guia trançada com palha da costa e contas selecionadas. Peça de fé, feita à mão.',
    channels: [B_NUV, B_SHP],
    published: [B_NUV, B_SHP],
    createdDaysAgo: 165,
  },
  {
    brand: 'brilho',
    sku: 'BRI-COL-003',
    name: 'Colar de Contas Coloridas',
    category: 'Guias e colares',
    price: 89.9,
    cost: 31,
    stock: 7,
    minStock: 8,
    status: 'active',
    description: 'Colar leve de contas em tons vibrantes, ideal para o dia a dia.',
    channels: [B_NUV, B_ML, B_SHP],
    published: [B_NUV, B_ML, B_SHP],
    createdDaysAgo: 150,
  },
  {
    brand: 'brilho',
    sku: 'BRI-PUL-004',
    name: 'Pulseira de Contas e Firmeza',
    category: 'Pulseiras',
    price: 39.9,
    cost: 13,
    stock: 48,
    minStock: 15,
    status: 'active',
    description: 'Pulseira de contas com fio de firmeza, disponível em várias combinações.',
    channels: [B_NUV, B_ML, B_SHP, B_TTK],
    published: [B_NUV, B_ML, B_SHP, B_TTK],
    createdDaysAgo: 130,
  },
  {
    brand: 'brilho',
    sku: 'BRI-BRC-005',
    name: 'Brinco de Contas e Missangas',
    category: 'Acessórios',
    price: 34.9,
    cost: 11,
    stock: 4,
    minStock: 10,
    status: 'active',
    description: 'Brinco artesanal com missangas e contas, fecho antialérgico.',
    channels: [B_NUV, B_SHP],
    published: [B_NUV, B_SHP],
    createdDaysAgo: 110,
  },
  {
    brand: 'brilho',
    sku: 'BRI-VEL-006',
    name: 'Vela Aromática Artesanal',
    category: 'Casa e fé',
    price: 49.9,
    cost: 18,
    stock: 0,
    minStock: 8,
    status: 'active',
    description: 'Vela de cera vegetal com aroma suave, produzida em pequenos lotes.',
    channels: [B_NUV, B_TTK],
    published: [B_NUV],
    createdDaysAgo: 85,
  },
  {
    brand: 'brilho',
    sku: 'BRI-TRE-007',
    name: 'Porta-Treco de Contas',
    category: 'Casa e fé',
    price: 54.9,
    cost: 20,
    stock: 19,
    minStock: 6,
    status: 'draft',
    description: 'Pequeno porta-treco revestido de contas. Rascunho aguardando publicação.',
    channels: [B_NUV, B_ML],
    published: [],
    createdDaysAgo: 30,
  },
  {
    brand: 'brilho',
    sku: 'BRI-KIT-008',
    name: 'Kit Presente de Fé',
    category: 'Kits',
    price: 179.9,
    cost: 68,
    stock: 11,
    minStock: 4,
    status: 'active',
    description: 'Kit com colar, pulseira e vela aromática em embalagem artesanal para presente.',
    channels: [B_NUV, B_SHP],
    published: [B_NUV, B_SHP],
    createdDaysAgo: 70,
  },
];

function daysAgoIso(days: number, now: Date): string {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(10 + (days % 8), (days * 7) % 60, 0, 0);
  return date.toISOString();
}

export function createDemoProducts(now: Date = new Date()): Product[] {
  return ROWS.map((row) => {
    const publications: ProductPublication[] = row.published.map((channelId) => ({
      channelId,
      status: 'published',
      publishedAt: daysAgoIso(Math.min(row.createdDaysAgo, 30), now),
      message: 'Publicado na demonstração (registro fictício).',
    }));

    return {
      id: `prod-${row.sku.toLowerCase()}`,
      brandId: row.brand,
      sku: row.sku,
      name: row.name,
      description: row.description,
      category: row.category,
      price: row.price,
      costPrice: row.cost,
      stock: row.stock,
      minStock: row.minStock,
      images: [],
      variants: (row.variants ?? []).map((variant, index) => ({
        id: `var-${row.sku.toLowerCase()}-${index + 1}`,
        name: variant.name,
        sku: `${row.sku}${variant.skuSuffix}`,
        stock: variant.stock,
      })),
      channels: [...row.channels],
      publications,
      status: row.status,
      createdAt: daysAgoIso(row.createdDaysAgo, now),
      updatedAt: daysAgoIso(Math.floor(row.createdDaysAgo / 2), now),
    } satisfies Product;
  });
}
