"use server";

// Clientes es un módulo asignable a colaboradores vía business_members.permissions
// ("clientes" en ASSIGNABLE_MODULES de nav-items.ts) — estas actions las usan
// tanto la página de admin como la de colaborador
// (app/(dashboard)/colaborador/clientes/page.tsx importa este mismo archivo),
// por eso el guard es requireModuleAccess("clientes"): acepta admin O
// colaborador-con-permiso, y devuelve el mismo error claro a quien no lo tiene.
//
// La lista de clientes ya llega server-side vía page.tsx (getCustomersForBusiness),
// pero el detalle (pedidos + conversaciones) es una consulta más pesada
// que solo se dispara cuando se toca un cliente puntual — de ahí
// esta action en vez de precargar el detalle de todos los clientes de una.
import { requireModuleAccess } from "@/lib/auth/require-module-access";
import { getCustomerDetail, type CustomerDetail } from "@/lib/services/customerService";

export async function getCustomerDetailAction(
  customerId: string
): Promise<{ error: string | null; data: CustomerDetail | null }> {
  const businessId = await requireModuleAccess("clientes");
  if (!businessId) {
    return { error: "No autorizado", data: null };
  }

  const detail = await getCustomerDetail(businessId, customerId);
  if (!detail.customer) {
    return { error: "Cliente no encontrado", data: null };
  }
  return { error: null, data: detail };
}
