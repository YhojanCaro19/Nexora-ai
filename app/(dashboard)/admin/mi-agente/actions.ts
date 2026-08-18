"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { updateAgentConfig } from "@/lib/services/agentConfigService";
import { runAgentTurn } from "@/lib/services/agentEngineService";
import { checkRateLimit } from "@/lib/utils/rateLimit";

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

// Canal de prueba interno — el admin conversa con SU propio agente antes
// de que exista el canal real (WhatsApp, fase aparte). "test-<userId>" es
// el identificador de cliente: así cada admin tiene su propio hilo de
// prueba, nunca se mezcla con conversaciones reales.
export async function probarAgenteAction(message: string) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { reply: "", error: "No autorizado" };
  }

  const limit = checkRateLimit(`probar-agente:${profile.userId}`, 15, 60 * 1000);
  if (!limit.allowed) {
    return { reply: "", error: `Demasiados mensajes seguidos. Espera ${limit.retryAfterSeconds}s.` };
  }

  return runAgentTurn(profile.businessId, `test-${profile.userId}`, message);
}
