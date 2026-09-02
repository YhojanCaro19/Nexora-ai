"use server";

import { getSessionProfile } from "@/lib/auth/get-session";
import { getSalesSummaryForRange } from "@/lib/services/reportService";

// Comparativa por período es exclusiva del admin (mismo criterio que
// Reportes): expone ventas/ingresos agregados del negocio, no es un dato
// operativo del día a día que se asigne a un colaborador.
async function requireAdminBusinessId() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return null;
  }
  return profile.businessId;
}

export async function getSalesRangeSummaryAction(days: number) {
  const businessId = await requireAdminBusinessId();
  if (!businessId) return null;
  return getSalesSummaryForRange(businessId, days);
}
