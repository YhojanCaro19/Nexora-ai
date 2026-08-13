// lib/types/order.ts
//
// Tipos y constantes de pedidos que SÍ pueden importarse desde
// componentes cliente. orderService.ts (que sí toca la base de datos, con
// next/headers) importa de acá — no al revés — para que un componente
// cliente nunca arrastre ese módulo solo por necesitar, por ejemplo, la
// lista de estados posibles.
export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  business_id: string;
  customer_id: string | null;
  status: string;
  items: OrderItem[];
  total: number;
  created_at: string;
  updated_at: string;
}

// Ajustar si en Supabase hay un CHECK distinto en orders.status.
export const ORDER_STATUSES = ["pending", "confirmed", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};
