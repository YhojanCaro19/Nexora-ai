"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { updateAgentConfig } from "@/lib/services/agentConfigService";

// Mi Agente configura el agente de TODO el negocio — es admin-exclusivo a
// propósito, igual que Reportes (ver nav-items.ts, ASSIGNABLE_MODULES no
// lo incluye).
export async function updateAgentConfigAction(input: { name: string; personality: string; enabledTools: string[] }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado" };
  }

  const result = await updateAgentConfig(profile.businessId, input);
  revalidatePath("/admin/mi-agente");
  return result;
}
