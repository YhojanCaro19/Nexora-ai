"use server";

import { revalidatePath } from "next/cache";
import { requireModuleAccess } from "@/lib/auth/require-module-access";
import { getSessionProfile } from "@/lib/auth/get-session";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { updateOrderStatus, rejectOrder, type OrderStatus } from "@/lib/services/orderService";

// Estas actions las usan tanto la página de admin como la de colaborador
// (app/(dashboard)/colaborador/pedidos/page.tsx importa este mismo
// archivo) — por eso el guard acepta admin O colaborador-con-permiso.
function revalidatePedidos() {
  revalidatePath("/admin/pedidos");
  revalidatePath("/colaborador/pedidos");
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  const businessId = await requireModuleAccess("pedidos");
  if (!businessId) {
    return { error: "No autorizado" };
  }

  const result = await updateOrderStatus(orderId, businessId, status);
  revalidatePedidos();
  return result;
}

export async function rejectOrderAction(orderId: string, reason: string) {
  const businessId = await requireModuleAccess("pedidos");
  const profile = await getSessionProfile();
  if (!businessId || !profile) {
    return { error: "No autorizado" };
  }

  const limit = checkRateLimit(`reject-order:${profile.userId}`, 20, 60 * 1000);
  if (!limit.allowed) {
    return { error: `Demasiados intentos. Espera ${limit.retryAfterSeconds}s.` };
  }

  const result = await rejectOrder(orderId, businessId, reason, profile.userId);
  revalidatePedidos();
  return result;
}
