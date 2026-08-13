import { createClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";

// La forma de cada línea dentro de orders.items (jsonb) — Postgres no
// valida esto, así que la validación de la forma vive acá, en la app.
// Se guarda name/unit_price "congelados" al momento del pedido a
// propósito: si después cambia el precio o el nombre del producto, los
// pedidos viejos no deben cambiar retroactivamente.
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

export async function getOrders(businessId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getOrders] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return [];
  }
  return data as Order[];
}

export async function createOrder(businessId: string, items: OrderItem[]) {
  if (items.length === 0) {
    return { error: "Agrega al menos un producto", data: null };
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      business_id: businessId,
      items,
      total,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return { error: translateError(error), data: null };
  }
  return { error: null, data };
}

export async function updateOrderStatus(orderId: string, businessId: string, status: OrderStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("business_id", businessId);

  if (error) {
    return { error: translateError(error) };
  }
  return { error: null };
}
