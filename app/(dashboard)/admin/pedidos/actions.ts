"use server";

import { revalidatePath } from "next/cache";
import { requireModuleAccess } from "@/lib/auth/require-module-access";
import { updateOrderStatus, type OrderStatus } from "@/lib/services/orderService";

// Esta action la usan tanto la página de admin como la de colaborador
// (app/(dashboard)/colaborador/pedidos/page.tsx importa este mismo
// archivo) — por eso el guard acepta admin O colaborador-con-permiso, no
// solo admin.
export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  const businessId = await requireModuleAccess("pedidos");
  if (!businessId) {
    return { error: "No autorizado" };
  }

  const result = await updateOrderStatus(orderId, businessId, status);
  revalidatePath("/admin/pedidos");
  revalidatePath("/colaborador/pedidos");
  return result;
}
