/**
 * Marcas comerciais independentes geridas pela plataforma.
 * São exatamente DUAS marcas oficiais — nunca identificadas de forma genérica
 * como "Loja 1"/"Loja 2". Cada marca vende nas quatro plataformas e possui
 * catálogo e controle de estoque próprios (dados fictícios).
 */
import type { Brand, BrandId } from '@/types';

export const BRANDS: Brand[] = [
  {
    id: 'macrame',
    name: 'Macramê do Leh',
    shortName: 'Macramê',
    accent: '#a85c3d',
    description:
      'Peças artesanais em macramê: decoração, acessórios e utilidades (dados fictícios).',
  },
  {
    id: 'brilho',
    name: 'Brilho de Orixá',
    shortName: 'Brilho',
    accent: '#8b6327',
    description:
      'Adornos e itens de fé feitos à mão: guias, colares, pulseiras e velas (dados fictícios).',
  },
];

export const BRAND_IDS: BrandId[] = BRANDS.map((brand) => brand.id);

/** Rótulo usado para lançamentos e visões que somam as duas marcas. */
export const CONSOLIDATED_LABEL = 'Consolidado (as duas marcas)';

export function brandById(id: BrandId): Brand {
  return BRANDS.find((brand) => brand.id === id) ?? BRANDS[0];
}

/** Nome oficial da marca, ou "Consolidado" quando não há marca definida. */
export function brandName(id?: BrandId): string {
  if (!id) return 'Consolidado';
  return brandById(id).name;
}

/** Forma curta da marca, usada em espaços reduzidos (gráficos, legendas). */
export function brandShortName(id?: BrandId): string {
  if (!id) return 'Consolidado';
  return brandById(id).shortName;
}
