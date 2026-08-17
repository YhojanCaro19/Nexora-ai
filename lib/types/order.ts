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
  payment_proof_url: string | null;
  rejection_reason: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

// Ajustar si en Supabase hay un CHECK distinto en orders.status.
export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "picked_up", "rejected"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  shipped: "Enviado",
  picked_up: "Recogido",
  rejected: "Rechazado",
};

// El estado de un pedido nunca retrocede — de "Entregado" no se puede
// volver a "Pendiente". Este mapa es la única fuente de verdad sobre a
// qué estado puede pasar un pedido desde el que tiene ahora; orderService
// lo hace cumplir en el servidor (nunca confiar solo en qué botones
// muestra la UI).
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "rejected"],
  confirmed: ["shipped", "picked_up"],
  shipped: [],
  picked_up: [],
  rejected: [],
};

export function isValidOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}
