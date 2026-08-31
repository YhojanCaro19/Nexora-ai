"use server";

// Clientes es admin-exclusivo, igual que Mi Agente y Reportes (no está en
// ASSIGNABLE_MODULES de nav-items.ts): expone el historial completo de
// pedidos y conversaciones de cada cliente, un nivel de detalle que no se
// delega a colaboradores por defecto.
//
// La lista de clientes ya llega server-side vía page.tsx (getCustomersForBusiness),
// pero el detalle (pedidos + conversaciones) es una consulta más pesada
// que solo se dispara cuando el admin toca un cliente puntual — de ahí
// esta action en vez de precargar el detalle de todos los clientes de una.
import { getSessionProfile } from "@/lib/auth/get-session";
import { getCustomerDetail, type CustomerDetail } from "@/lib/services/customerService";

export async function getCustomerDetailAction(
  customerId: string
): Promise<{ error: string | null; data: CustomerDetail | null }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado", data: null };
  }

  const detail = await getCustomerDetail(profile.businessId, customerId);
  if (!detail.customer) {
    return { error: "Cliente no encontrado", data: null };
  }
  return { error: null, data: detail };
}
