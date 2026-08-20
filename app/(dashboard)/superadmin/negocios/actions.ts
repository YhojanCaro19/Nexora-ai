"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { toggleBusinessActive, getBusinessAgentSummary } from "@/lib/services/adminService";

async function requireSuperadmin() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "superadmin") return null;
  return profile;
}

// Reemplaza la eliminación de negocios (removida por completo del panel):
// un negocio inhabilitado bloquea el login de su admin y colaboradores
// (ver lib/auth/get-session.ts) hasta que se vuelva a habilitar — reversible,
// a diferencia de un borrado.
export async function toggleBusinessActiveAction(businessId: string, isActive: boolean) {
  const profile = await requireSuperadmin();
  if (!profile) return { error: "No autorizado" };

  const result = await toggleBusinessActive(businessId, isActive, profile.userId);
  revalidatePath("/superadmin/negocios");
  return result;
}

export async function getBusinessAgentSummaryAction(businessId: string) {
  const profile = await requireSuperadmin();
  if (!profile) return null;
  return getBusinessAgentSummary(businessId);
}
