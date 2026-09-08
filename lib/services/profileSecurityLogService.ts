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
import { SECURITY_EVENT_LABELS, type ProfileSecurityEventType } from "@/lib/constants/securityEventLabels";

// Reexportados para el código de SERVIDOR que ya los importaba de acá
// (platformLogService.ts, etc.) — un componente CLIENTE debe importar
// directo de lib/constants/securityEventLabels (ver comentario ahí).
export { SECURITY_EVENT_LABELS };
export type { ProfileSecurityEventType };

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

export interface PlatformSecurityEvent {
  id: string;
  eventType: ProfileSecurityEventType;
  userId: string;
  businessId: string;
  businessName: string | null;
  createdAt: string;
}

/**
 * TODOS los eventos de seguridad de TODOS los negocios, para
 * Superadmin → Logs (service role, no depende de la policy "cada quien
 * ve lo suyo" — acá el que lee es la plataforma, no la persona dueña del
 * evento).
 */
export async function getAllProfileSecurityEvents(limit = 300): Promise<PlatformSecurityEvent[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profile_security_events")
    .select("id, user_id, business_id, event_type, created_at, businesses(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error("[getAllProfileSecurityEvents] error:", error.message);
    return [];
  }

  return (data as unknown as Array<{
    id: string;
    user_id: string;
    business_id: string;
    event_type: string;
    created_at: string;
    businesses: { name: string } | null;
  }>).map((row) => ({
    id: row.id,
    eventType: row.event_type as ProfileSecurityEventType,
    userId: row.user_id,
    businessId: row.business_id,
    businessName: row.businesses?.name ?? null,
    createdAt: row.created_at,
  }));
}
