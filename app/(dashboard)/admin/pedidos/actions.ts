"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createOrder, updateOrderStatus, type OrderItem, type OrderStatus } from "@/lib/services/orderService";

async function requireAdminBusinessId() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return null;
  }
  return profile.businessId;
}

export async function createOrderAction(items: OrderItem[]) {
  const businessId = await requireAdminBusinessId();
  if (!businessId) {
    return { error: "No autorizado", data: null };
  }

  const result = await createOrder(businessId, items);
  revalidatePath("/admin/pedidos");
  return result;
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  const businessId = await requireAdminBusinessId();
  if (!businessId) {
    return { error: "No autorizado" };
  }

  const result = await updateOrderStatus(orderId, businessId, status);
  revalidatePath("/admin/pedidos");
  return result;
}
