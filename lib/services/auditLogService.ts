// lib/services/auditLogService.ts
//
// Auditoría de acciones destructivas/sensibles del superadmin — hoy
// inhabilitar/habilitar un negocio y aprobar/rechazar una solicitud no
// dejaban ningún rastro de quién lo hizo y cuándo. Mismo patrón que
// report_email_log y agent_usage_log: tabla de solo insert+select, se
// escribe con service role porque quien llama ya viene autenticado por el
// server action, no por RLS de esta tabla.
import { createAdminClient } from "@/lib/supabase/server";

export type PlatformAdminAction =
  | "business_disabled"
  | "business_enabled"
  | "request_approved"
  | "request_rejected";

const ACTION_LABELS: Record<PlatformAdminAction, string> = {
  business_disabled: "Inhabilitó el negocio",
  business_enabled: "Habilitó el negocio",
  request_approved: "Aprobó la solicitud de",
  request_rejected: "Rechazó la solicitud de",
};

// Nunca debe tumbar la acción real por esto — es un log de auditoría, no
// algo de lo que dependa poder inhabilitar un negocio o aprobar una
// solicitud.
export async function logPlatformAdminAction(
  adminUserId: string,
  action: PlatformAdminAction,
  targetBusinessId: string | null,
  detail?: string | null
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("platform_admin_actions").insert({
    admin_user_id: adminUserId,
    action,
    target_business_id: targetBusinessId,
    detail: detail ?? null,
  });

  if (error) {
    console.error("[logPlatformAdminAction] error:", error);
  }
}

export interface PlatformAdminActionEntry {
  id: string;
  adminEmail: string;
  action: PlatformAdminAction;
  actionLabel: string;
  targetBusinessName: string | null;
  detail: string | null;
  createdAt: string;
}

export async function getPlatformAdminActions(limit = 200): Promise<PlatformAdminActionEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_admin_actions")
    .select("id, admin_user_id, action, target_business_id, detail, created_at, businesses(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getPlatformAdminActions] error:", error);
    return [];
  }

  // Resolver el correo de cada admin de una — sin duplicar llamadas a la
  // Admin API cuando el mismo superadmin aparece en varias filas (hoy
  // normalmente hay uno solo, pero platform_admins ya está pensado para
  // admitir más de uno).
  const uniqueAdminIds = [...new Set((data ?? []).map((row) => row.admin_user_id))];
  const emailById = new Map<string, string>();
  await Promise.all(
    uniqueAdminIds.map(async (id) => {
      const { data: authUser } = await admin.auth.admin.getUserById(id);
      emailById.set(id, authUser.user?.email ?? "—");
    })
  );

  return (data ?? []).map((row) => ({
    id: row.id,
    adminEmail: emailById.get(row.admin_user_id) ?? "—",
    action: row.action as PlatformAdminAction,
    actionLabel: ACTION_LABELS[row.action as PlatformAdminAction] ?? row.action,
    targetBusinessName: (row.businesses as unknown as { name: string } | null)?.name ?? null,
    detail: row.detail,
    createdAt: row.created_at,
  }));
}
