import { createClient, createAdminClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import { getAgentUsageByBusiness } from "@/lib/services/agentUsageService";
import { AGENT_TOOLS, sanitizeToolKeys } from "@/lib/config/agentTools";
import { logPlatformAdminAction } from "@/lib/services/auditLogService";

// El alta de cuentas dejó de ser manual: la dispara el pago en Wompi
// (ver lib/services/registrationService.ts + app/api/webhooks/wompi). Acá
// solo queda la gestión de negocios ya existentes.

export async function isCurrentUserPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return !!data;
}

/**
 * Elimina un negocio de verdad: todos sus datos (pedidos, productos,
 * config del agente, reservas, clientes, conversaciones, suscripciones,
 * miembros) y las cuentas de Auth de todos sus miembros (admin y
 * colaboradores) — no es un "desactivar", es borrado real e irreversible.
 *
 * El borrado de las tablas pasa por la función `delete_business_cascade`
 * en Postgres (ver SQL entregado al usuario), en una sola transacción:
 * si algo falla a mitad de camino, no queda nada borrado a medias. Borrar
 * las cuentas de Auth es un paso aparte porque eso no se puede hacer
 * desde SQL — solo con la Admin API.
 *
 * Decisión explícita del negocio: ya NO existe forma de eliminar un
 * negocio desde el panel — se reemplazó por habilitar/inhabilitar
 * (toggleBusinessActive, más abajo). Se quitó por completo, no se dejó
 * como acción de último recurso.
 */
export async function toggleBusinessActive(
  businessId: string,
  isActive: boolean,
  actingAdminUserId: string
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { error } = await admin.from("businesses").update({ is_active: isActive }).eq("id", businessId);

  if (error) {
    console.error("[toggleBusinessActive] error:", error);
    return { error: translateError(error) };
  }

  await logPlatformAdminAction(actingAdminUserId, isActive ? "business_enabled" : "business_disabled", businessId);
  return { error: null };
}

export interface BusinessAgentSummary {
  agentName: string;
  personality: string;
  greetingMessage: string;
  enabledToolLabels: string[];
}

// Cargado aparte del listado de negocios (no dentro de getBusinesses) —
// solo hace falta cuando el superadmin abre el detalle de un negocio
// puntual, no en cada fila de la lista.
export async function getBusinessAgentSummary(businessId: string): Promise<BusinessAgentSummary | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_configs")
    .select("name, personality, greeting_message, enabled_tools")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getBusinessAgentSummary] error:", error);
    return null;
  }

  const toolKeys = sanitizeToolKeys(data.enabled_tools);
  const enabledToolLabels: string[] = toolKeys
    .map((key) => AGENT_TOOLS.find((t) => t.key === key)?.label)
    .filter((label): label is (typeof AGENT_TOOLS)[number]["label"] => !!label);

  return {
    agentName: data.name || "Sin nombre configurado",
    personality: data.personality || "Sin personalidad configurada",
    greetingMessage: data.greeting_message || "Sin mensaje de bienvenida configurado",
    enabledToolLabels,
  };
}

export interface BusinessWithOwner {
  id: string;
  name: string;
  industry_type: string;
  created_at: string;
  owner_id: string;
  is_active: boolean;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  orderCount: number;
  customerCount: number;
  agentTokens: number;
  lastActivityAt: string | null;
}

export async function getBusinesses(): Promise<BusinessWithOwner[]> {
  // Vista de superadmin: cliente admin, no depende de RLS por-negocio.
  const admin = createAdminClient();
  const { data: businesses, error } = await admin
    .from("businesses")
    .select("id, name, industry_type, created_at, owner_id, is_active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getBusinesses] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }
  if (!businesses) return [];

  // Consumo del agente ya viene agregado por negocio en una sola consulta
  // (agentUsageService.ts) — se reutiliza acá en vez de volver a sumar
  // tokens por negocio uno por uno.
  const usageByBusiness = new Map(
    (await getAgentUsageByBusiness()).map((u) => [u.businessId, u])
  );

  // Datos del dueño: full_name/phone viven en business_members, el correo
  // solo existe en Auth (no se duplica en ninguna tabla), así que hace
  // falta una llamada aparte a la Admin API por cada negocio. Los conteos
  // de pedidos/clientes y la última actividad sí son específicos de cada
  // negocio, no hay forma de traerlos en una sola consulta agregada como
  // el consumo del agente.
  return Promise.all(
    businesses.map(async (b) => {
      const [{ data: member }, { data: authUser }, ordersResult, { count: customerCount }] = await Promise.all([
        admin
          .from("business_members")
          .select("full_name, phone")
          .eq("business_id", b.id)
          .eq("user_id", b.owner_id)
          .maybeSingle(),
        admin.auth.admin.getUserById(b.owner_id),
        admin
          .from("orders")
          .select("created_at", { count: "exact" })
          .eq("business_id", b.id)
          .order("created_at", { ascending: false })
          .limit(1),
        admin.from("customers").select("id", { count: "exact", head: true }).eq("business_id", b.id),
      ]);

      const usage = usageByBusiness.get(b.id);

      return {
        ...b,
        ownerName: member?.full_name ?? null,
        ownerEmail: authUser.user?.email ?? null,
        ownerPhone: member?.phone ?? null,
        orderCount: ordersResult.count ?? 0,
        customerCount: customerCount ?? 0,
        agentTokens: usage?.totalTokens ?? 0,
        lastActivityAt: ordersResult.data?.[0]?.created_at ?? null,
      };
    })
  );
}
