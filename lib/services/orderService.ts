import { createClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import type { Order, OrderItem, OrderStatus } from "@/lib/types/order";

export type { Order, OrderItem, OrderStatus };
export { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/types/order";

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
