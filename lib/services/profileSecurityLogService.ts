// lib/services/profileSecurityLogService.ts
//
// Historial de seguridad de la propia cuenta (Perfil → "Historial de
// seguridad"): sustituto honesto de "sesiones activas" — un log de
// eventos propios ("Contraseña cambiada", "Sesiones cerradas en todos
// los dispositivos", "Foto de perfil actualizada", "Nombre/teléfono
// actualizado") con fecha, no un tracking real de dispositivos/IPs.
//
// `profile_security_events` no tiene policy de INSERT (mismo criterio
// que `agent_usage_log`), así que el insert va con service role. La
// lectura sí va por el cliente normal: la policy de SELECT está acotada
// a "cada quien ve lo suyo" (auth.uid() = user_id), no basta con ser
// miembro del negocio — un colaborador no debe poder leer el historial
// de seguridad del admin ni de otro colaborador.
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type ProfileSecurityEventType =
  | "password_changed"
  | "signed_out_all_devices"
  | "avatar_updated"
  | "profile_updated"
  // Acceso a datos del negocio — acciones sensibles que quedan en el
  // historial personal de quien las hizo (auth.uid() = user_id).
  | "collaborator_added"
  | "collaborator_updated"
  | "collaborator_deactivated"
  | "collaborator_reactivated"
  | "collaborator_removed"
  | "report_downloaded"
  | "account_change_requested"
  // proxy.ts detectó que la sesión se usó desde otro navegador/equipo
  // (huella de dispositivo distinta) y la cerró por seguridad.
  | "session_device_mismatch";

export interface ProfileSecurityEvent {
  id: string;
  eventType: ProfileSecurityEventType;
  createdAt: string;
}

// Nunca debe tumbar la acción real (cambiar contraseña, cerrar sesión,
// subir foto, editar nombre/teléfono) por esto — es un log de auditoría,
// no algo de lo que dependa la operación. userId/businessId siempre
// deben venir de getSessionProfile() en el caller, jamás de un parámetro
// externo, para que nadie pueda escribir un evento a nombre de otro.
export async function logProfileSecurityEvent(
  userId: string,
  businessId: string,
  eventType: ProfileSecurityEventType
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("profile_security_events").insert({
    user_id: userId,
    business_id: businessId,
    event_type: eventType,
  });

  if (error) {
    console.error("[logProfileSecurityEvent] error:", error);
  }
}

// Últimos `limit` eventos del usuario, más reciente primero. Filtra por
// user_id + business_id explícito (segunda capa además de RLS) — mismo
// criterio de defensa por IDOR que el resto de profileService.ts.
export async function getProfileSecurityEvents(
  userId: string,
  businessId: string,
  limit = 20
): Promise<ProfileSecurityEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_security_events")
    .select("id, event_type, created_at")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getProfileSecurityEvents] error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type as ProfileSecurityEventType,
    createdAt: row.created_at,
  }));
}
