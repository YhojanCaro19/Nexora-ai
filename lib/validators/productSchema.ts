import { z } from "zod";

// Compartido con el Textarea de descripción en product-form.tsx — el
// límite visual y el real (acá) son el mismo número, uno solo.
export const DESCRIPTION_MAX_LENGTH = 500;

export const productSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
  price: z.number().min(0, "El precio no puede ser negativo"),
  stock: z.number().int().min(0, "El stock no puede ser negativo").nullable().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
