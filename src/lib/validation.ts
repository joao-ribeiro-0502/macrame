/** Schemas de validação (Zod) para formulários da demonstração. */
import { z } from 'zod';

export const productSchema = z.object({
  brandId: z.enum(['macrame', 'brilho'], {
    errorMap: () => ({ message: 'Selecione a marca do produto.' }),
  }),
  name: z.string().trim().min(3, 'Informe um nome com pelo menos 3 caracteres.'),
  sku: z
    .string()
    .trim()
    .min(2, 'Informe um SKU com pelo menos 2 caracteres.')
    .regex(/^[A-Za-z0-9._-]+$/, 'Use apenas letras, números, ponto, hífen ou sublinhado.'),
  description: z.string().trim().max(600, 'A descrição pode ter no máximo 600 caracteres.').optional().default(''),
  category: z.string().trim().min(2, 'Selecione ou informe uma categoria.'),
  price: z
    .number({ invalid_type_error: 'Informe um preço de venda válido.' })
    .positive('O preço de venda deve ser maior que zero.')
    .max(100000, 'Preço acima do limite demonstrativo.'),
  costPrice: z
    .number({ invalid_type_error: 'Informe um custo válido.' })
    .min(0, 'O custo não pode ser negativo.')
    .max(100000, 'Custo acima do limite demonstrativo.'),
  stock: z
    .number({ invalid_type_error: 'Informe a quantidade em estoque.' })
    .int('A quantidade deve ser um número inteiro.')
    .min(0, 'O estoque não pode ser negativo.'),
  minStock: z
    .number({ invalid_type_error: 'Informe o estoque mínimo.' })
    .int('O estoque mínimo deve ser um número inteiro.')
    .min(0, 'O estoque mínimo não pode ser negativo.'),
  status: z.enum(['active', 'draft', 'inactive'], {
    errorMap: () => ({ message: 'Selecione o status do produto.' }),
  }),
  channels: z.array(z.string()).default([]),
  image: z.string().optional().default(''),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const financeEntrySchema = z.object({
  description: z.string().trim().min(3, 'Descreva o lançamento (mínimo 3 caracteres).'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Selecione o tipo de lançamento.' }),
  }),
  category: z.string().trim().min(2, 'Informe a categoria.'),
  amount: z
    .number({ invalid_type_error: 'Informe um valor válido.' })
    .positive('O valor deve ser maior que zero.')
    .max(1000000, 'Valor acima do limite demonstrativo.'),
  date: z.string().min(1, 'Informe a data.'),
  /** '' = lançamento consolidado (as duas marcas). */
  brandId: z.string().default(''),
  channelId: z.string().optional().default(''),
});

export type FinanceFormValues = z.infer<typeof financeEntrySchema>;

export const settingsSchema = z
  .object({
    alertThreshold: z
      .number({ invalid_type_error: 'Informe um limite válido.' })
      .int('Use números inteiros.')
      .min(0, 'Não pode ser negativo.')
      .max(500, 'Limite alto demais para a demonstração.'),
    criticalThreshold: z
      .number({ invalid_type_error: 'Informe um limite válido.' })
      .int('Use números inteiros.')
      .min(0, 'Não pode ser negativo.')
      .max(500, 'Limite alto demais para a demonstração.'),
    physicalStoreReserve: z
      .number({ invalid_type_error: 'Informe uma reserva válida.' })
      .int('Use números inteiros.')
      .min(0, 'Não pode ser negativo.')
      .max(200, 'Reserva alta demais para a demonstração.'),
    priorityChannels: z.array(z.string()).default([]),
    notificationsEnabled: z.boolean().default(true),
    compactTables: z.boolean().default(false),
  })
  .refine((value) => value.criticalThreshold <= value.alertThreshold, {
    message: 'O limite crítico deve ser menor ou igual ao limite de alerta.',
    path: ['criticalThreshold'],
  });

export type SettingsFormValues = z.infer<typeof settingsSchema>;
