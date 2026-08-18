import { z } from "zod";

const orderItemInputSchema = z.object({
  productId: z.string().uuid("Producto inválido"),
  quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "El pedido necesita al menos un producto"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
