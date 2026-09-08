// lib/services/platformLogService.ts
//
// "Logs" del superadmin (antes "Auditoría") — un solo feed con todo lo que
// pasa en la plataforma que antes vivía repartido en pantallas separadas
// o no se veía en ningún lado:
//   - acciones del superadmin (platform_admin_actions, vía auditLogService)
//   - inicios de sesión de TODOS los negocios (user_login_events) — no
//     solo el propio, como en Perfil → Historial de seguridad
//   - eventos de seguridad de TODOS los negocios (profile_security_events)
//     — conexiones OAuth (Meta/Google/TikTok Ads, Messenger, Instagram),
//     cerrar sesión, cambiar foto, crear colaborador, crear producto, etc.
//     Mismo dato que ya alimenta Perfil → "Historial de seguridad", solo
//     que ahí cada quien ve el suyo — acá se ve el de todos.
//   - altas de cuenta completadas (pending_registrations)
//
// Todo se lee con service role (createAdminClient) — mismo patrón que
// adminService.ts, no depende de RLS por negocio porque el superadmin no
// es miembro de ninguno.
import { createAdminClient } from "@/lib/supabase/server";
import { getPlatformAdminActions, type PlatformAdminActionEntry, type PlatformAdminAction } from "@/lib/services/auditLogService";
import {
  getAllProfileSecurityEvents,
  SECURITY_EVENT_LABELS,
  type ProfileSecurityEventType,
} from "@/lib/services/profileSecurityLogService";
import { getAutoReportSendLog } from "@/lib/services/reportHistoryService";

export type PlatformLogType =
  | PlatformAdminAction
  | ProfileSecurityEventType
  | "login"
  | "registration_completed"
  | "report_sent"
  | "report_failed";

export interface PlatformLogEntry {
  id: string;
  type: PlatformLogType;
  /** Quién hizo la acción — null cuando no aplica (ej. alta disparada por pago). */
  actor: string | null;
  /** Qué pasó, ya redactado — ej. "Conectó Google Ads". Sin repetir el actor. */
  description: string;
  businessName: string | null;
  /** Contexto extra que no cabe en `description` (ej. el cambio de correo de una solicitud). */
  detail: string | null;
  createdAt: string;
}

/**
 * Nombre para mostrar de cada `user_id`: full_name en business_members si
 * tiene negocio, si no el correo de Auth (ej. el propio superadmin). Se
 * resuelve una vez por persona única — lo comparten los inicios de sesión
 * y los eventos de seguridad, que pueden repetir el mismo usuario muchas
 * veces en el mismo feed.
 */
async function resolveUserNames(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[]
): Promise<Map<string, string>> {
  const nameById = new Map<string, string>();
  await Promise.all(
    [...new Set(userIds)].map(async (id) => {
      const { data: member } = await admin
        .from("business_members")
        .select("full_name")
        .eq("user_id", id)
        .limit(1)
        .maybeSingle();
      if (member?.full_name) {
        nameById.set(id, member.full_name);
        return;
      }
      const { data: authUser } = await admin.auth.admin.getUserById(id);
      nameById.set(id, authUser.user?.email ?? "Alguien");
    })
  );
  return nameById;
}

function fromAdminAction(e: PlatformAdminActionEntry): PlatformLogEntry {
  // Cuando hay `targetBusinessName`, `detail` es información extra (ej. el
  // cambio de correo "actual → nuevo" de una solicitud), no el nombre del
  // negocio — la columna Negocio ya lo cubre, así que no se repite acá.
  return {
    id: `admin:${e.id}`,
    type: e.action,
    actor: e.adminEmail,
    description: e.actionLabel,
    businessName: e.targetBusinessName,
    detail: e.targetBusinessName ? e.detail : null,
    createdAt: e.createdAt,
  };
}

interface LoginRow {
  id: string;
  user_id: string;
  created_at: string;
  businesses: { name: string } | null;
}

async function getLoginLogEntries(limit: number): Promise<PlatformLogEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_login_events")
    .select("id, user_id, created_at, businesses(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error("[getLoginLogEntries] error:", error.message);
    return [];
  }

  const rows = data as unknown as LoginRow[];
  const nameById = await resolveUserNames(admin, rows.map((r) => r.user_id));

  return rows.map((r) => ({
    id: `login:${r.id}`,
    type: "login" as const,
    actor: nameById.get(r.user_id) ?? "Alguien",
    description: "Inició sesión",
    businessName: r.businesses?.name ?? "Superadmin",
    detail: null,
    createdAt: r.created_at,
  }));
}

async function getSecurityLogEntries(limit: number): Promise<PlatformLogEntry[]> {
  const admin = createAdminClient();
  const events = await getAllProfileSecurityEvents(limit);
  const nameById = await resolveUserNames(admin, events.map((e) => e.userId));

  return events.map((e) => ({
    id: `security:${e.id}`,
    type: e.eventType,
    actor: nameById.get(e.userId) ?? "Alguien",
    description: SECURITY_EVENT_LABELS[e.eventType] ?? e.eventType,
    businessName: e.businessName,
    detail: null,
    createdAt: e.createdAt,
  }));
}

interface RegistrationRow {
  id: string;
  email: string;
  completed_at: string;
  businesses: { name: string } | null;
}

async function getRegistrationLogEntries(limit: number): Promise<PlatformLogEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pending_registrations")
    .select("id, email, completed_at, businesses(name)")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error("[getRegistrationLogEntries] error:", error.message);
    return [];
  }

  return (data as unknown as RegistrationRow[]).map((r) => ({
    id: `registration:${r.id}`,
    type: "registration_completed" as const,
    // Sin actor humano — la dispara el pago aprobado en Wompi, no una
    // persona haciendo clic en algo.
    actor: null,
    description: "Se creó la cuenta",
    businessName: r.businesses?.name ?? null,
    detail: r.email,
    createdAt: r.completed_at,
  }));
}

// Reemplaza al módulo "Reportes" (Superadmin), que era su propia pantalla
// aparte — mismo dato (report_email_log, vía reportHistoryService), ahora
// como una fuente más del feed único de Logs.
async function getReportLogEntries(limit: number): Promise<PlatformLogEntry[]> {
  const entries = await getAutoReportSendLog(limit);
  return entries.map((e) => ({
    id: `report:${e.id}`,
    type: e.status === "sent" ? ("report_sent" as const) : ("report_failed" as const),
    actor: null,
    description: e.status === "sent" ? "Reporte diario enviado" : "Reporte diario — envío fallido",
    businessName: e.businessName,
    detail: e.status === "sent" ? e.sentTo : (e.errorMessage ?? e.sentTo),
    createdAt: e.sentAt,
  }));
}

/** Feed unificado de logs de plataforma, más reciente primero. */
export async function getPlatformLogs(limit = 300): Promise<PlatformLogEntry[]> {
  const [adminActions, logins, security, registrations, reports] = await Promise.all([
    getPlatformAdminActions(limit),
    getLoginLogEntries(limit),
    getSecurityLogEntries(limit),
    getRegistrationLogEntries(limit),
    getReportLogEntries(limit),
  ]);

  const merged = [...adminActions.map(fromAdminAction), ...logins, ...security, ...registrations, ...reports];
  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return merged.slice(0, limit);
}
