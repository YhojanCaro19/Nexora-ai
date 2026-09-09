"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { updateAgentConfig, type UpdateAgentConfigInput } from "@/lib/services/agentConfigService";
import { getBookingSettings, upsertBookingSettings } from "@/lib/services/bookingConfigService";
import { runAgentTurn } from "@/lib/services/agentEngineService";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { DEFAULT_BOOKING_SETTINGS, type BookingMode } from "@/lib/types/reservation";

// Mi Agente configura el agente de TODO el negocio — es admin-exclusivo a
// propósito, igual que Reportes (ver nav-items.ts, ASSIGNABLE_MODULES no
// lo incluye).
export async function updateAgentConfigAction(input: UpdateAgentConfigInput) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado" };
  }

  const result = await updateAgentConfig(profile.businessId, input);
  revalidatePath("/admin/mi-agente");
  return result;
}

// Interruptor de "¿el negocio agenda reservas o citas?" desde Mi Agente →
// "Sobre el negocio". Escribe solo `booking_settings.mode` (el resto de la
// agenda —horarios, empleados, mesas— se configura en Reservas). Cuando
// pasa de/hacia `off` cambia el menú del panel, así que revalida el layout.
export async function setBookingModeAction(mode: BookingMode) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado" };
  }

  // La fila puede no existir todavía — se toma lo que haya (o los defaults)
  // y se reescribe solo `mode`, para no pisar una agenda ya configurada.
  const current = await getBookingSettings(profile.businessId);
  const result = await upsertBookingSettings(profile.businessId, {
    ...DEFAULT_BOOKING_SETTINGS,
    ...current,
    mode,
  });

  revalidatePath("/admin/mi-agente");
  revalidatePath("/admin", "layout");
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
