import { z } from "zod";

// Compartido con el Textarea de descripción en product-form.tsx — el
// límite visual y el real (acá) son el mismo número, uno solo.
export const DESCRIPTION_MAX_LENGTH = 500;

export const productSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
  price: z.number().min(0, "El precio no puede ser negativo"),
  stock: z.number().int().min(0, "El stock no puede ser negativo").nullable().optional(),
  // Debajo de este número el producto se resalta como stock bajo — antes
  // era un 5 fijo en products-table.tsx igual para cualquier negocio, sin
  // sentido entre un taller que vende tornillos y una joyería que vende
  // anillos. null/undefined -> se usa DEFAULT_LOW_STOCK_THRESHOLD.
  lowStockThreshold: z.number().int().min(1, "El umbral debe ser al menos 1").nullable().optional(),
  category: z.string().max(60).optional(),
});

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export type ProductInput = z.infer<typeof productSchema>;
