// lib/services/loginEventService.ts
//
// "Sesiones activas" honesto (Perfil → Seguridad): Supabase Auth no
// expone listar ni revocar sesiones individuales vía SDK (confirmado
// leyendo el código fuente de @supabase/auth-js). Esto NO es un registro
// de sesiones activas reales — es un log de EVENTOS de inicio de sesión
// (fecha, IP, user-agent), puramente informativo. La única acción de
// revocación real que existe sigue siendo signOutAllSessions() (todos los
// dispositivos a la vez) — nunca se puede cerrar una fila individual de
// aquí, no es técnicamente posible.
//
// Mismo criterio que profile_security_events: sin policy de INSERT (se
// escribe con service role desde el server action de login), la lectura
// sí va por el cliente normal con policy `auth.uid() = user_id` — cada
// quien ve únicamente su propio historial de accesos.
import { createAdminClient, createClient } from "@/lib/supabase/server";

export interface LoginEvent {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

// Nunca debe tumbar el login por esto — es un log informativo, no algo de
// lo que dependa poder entrar. userId/businessId siempre deben venir de
// la sesión recién creada en el caller (login()), nunca de un parámetro
// externo, para que nadie pueda escribir un evento a nombre de otro.
export async function logLoginEvent(
  userId: string,
  businessId: string | null,
  ip: string,
  userAgent: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("user_login_events").insert({
    user_id: userId,
    business_id: businessId,
    ip,
    user_agent: userAgent,
  });

  if (error) {
    console.error("[logLoginEvent] error:", error);
  }
}

// Últimos `limit` eventos del usuario, más reciente primero. Filtra por
// user_id explícito (segunda capa además de RLS) — mismo criterio de
// defensa por IDOR que profileSecurityLogService.ts.
export async function getRecentLoginEvents(userId: string, limit = 10): Promise<LoginEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_login_events")
    .select("id, ip, user_agent, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getRecentLoginEvents] error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    ip: row.ip,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}
