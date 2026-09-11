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

// ⚠️ HERRAMIENTA DE PRUEBAS — TEMPORAL. Deja el negocio como recién
// provisionado: `onboarding_completed = false` y borra la config generada
// (agent_configs + todo el módulo de Reservas). El dueño, al volver a
// entrar, cae de nuevo en /bienvenida y recorre el onboarding. NO toca la
// cuenta de Google, ni el catálogo, ni clientes/pedidos/conversaciones, ni
// los créditos. Sirve para probar la experiencia de primer ingreso sin
// crear cuentas nuevas. Quitar cuando la experiencia esté cerrada.
export async function resetBusinessOnboarding(
  businessId: string,
  actingAdminUserId: string,
): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { error: bizError } = await admin
    .from("businesses")
    .update({ onboarding_completed: false })
    .eq("id", businessId);
  if (bizError) {
    console.error("[resetBusinessOnboarding] businesses:", bizError.message);
    return { error: translateError(bizError) };
  }

  // Best-effort: si alguna tabla del módulo de Reservas no está aplicada,
  // se ignora el error (no es fatal para el objetivo de la herramienta).
  const wipe = ["agent_configs", "booking_settings", "booking_resources", "business_hours", "booking_services", "business_closures"] as const;
  for (const table of wipe) {
    const { error } = await admin.from(table).delete().eq("business_id", businessId);
    if (error) console.warn(`[resetBusinessOnboarding] ${table}:`, error.message);
  }

  await logPlatformAdminAction(actingAdminUserId, "business_onboarding_reset", businessId);
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
  reservationCount: number;
  agentTokens: number;
  /** Costo estimado en USD del consumo del agente, a precio de lista de Anthropic. */
  agentCostUsd: number;
  lastActivityAt: string | null;
  /** Cuándo se renueva la mensualidad — null si el negocio no tiene wallet todavía. */
  planRenewsAt: string | null;
  planKey: string | null;
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

  // Fecha de renovación del plan — una sola consulta para todos los
  // negocios (mismo criterio que el consumo del agente), en vez de una
  // por negocio dentro del Promise.all de abajo.
  const { data: wallets } = await admin.from("credit_wallets").select("business_id, plan_renews_at, plan_key");
  const walletByBusiness = new Map(
    (wallets ?? []).map((w) => [w.business_id as string, w as { plan_renews_at: string | null; plan_key: string | null }])
  );

  // Datos del dueño: full_name/phone viven en business_members, el correo
  // solo existe en Auth (no se duplica en ninguna tabla), así que hace
  // falta una llamada aparte a la Admin API por cada negocio. Los conteos
  // de pedidos/clientes y la última actividad sí son específicos de cada
  // negocio, no hay forma de traerlos en una sola consulta agregada como
  // el consumo del agente.
  return Promise.all(
    businesses.map(async (b) => {
      const [{ data: member }, { data: authUser }, ordersResult, { count: customerCount }, { count: reservationCount }] =
        await Promise.all([
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
          admin.from("reservations").select("id", { count: "exact", head: true }).eq("business_id", b.id),
        ]);

      const usage = usageByBusiness.get(b.id);
      const wallet = walletByBusiness.get(b.id);

      return {
        ...b,
        ownerName: member?.full_name ?? null,
        ownerEmail: authUser.user?.email ?? null,
        ownerPhone: member?.phone ?? null,
        orderCount: ordersResult.count ?? 0,
        customerCount: customerCount ?? 0,
        reservationCount: reservationCount ?? 0,
        agentTokens: usage?.totalTokens ?? 0,
        agentCostUsd: usage?.estimatedCostUsd ?? 0,
        lastActivityAt: ordersResult.data?.[0]?.created_at ?? null,
        planRenewsAt: wallet?.plan_renews_at ?? null,
        planKey: wallet?.plan_key ?? null,
      };
    })
  );
}

export interface ClientPlanBreakdown {
  key: string;
  name: string;
  /** Precio mensual en centavos COP (mismo formato que `plans.price_monthly_cop`). */
  priceMonthlyCop: number;
  count: number;
}

export interface ClientsOverview {
  /** Negocios habilitados, con plan real, y con la mensualidad al día — el número grande de "Clientes". */
  activeCount: number;
  /** Habilitados y con plan real, pero `plan_renews_at` ya pasó — no se les corta el acceso (ver cron plan-renewal-reminders), pero no cuentan como "al día". */
  overdueCount: number;
  /** Habilitados pero sin `plan_key` — cuentas de prueba o creadas a mano por el superadmin, un cliente real siempre tiene plan_key desde el pago (ver creditService.ts). */
  noPlanCount: number;
  /** `is_active = false` — negocios que el superadmin inhabilitó. */
  disabledCount: number;
  /** Todos los negocios que se han registrado alguna vez, sin importar su estado actual. */
  totalRegistered: number;
  /** Cuántos negocios habilitados están en cada plan (al día + vencidos), para ver la distribución real entre planes. */
  byPlan: ClientPlanBreakdown[];
}

/**
 * Vista de trazabilidad de "clientes de AVENTHRA" (los negocios que pagan
 * la plataforma) para Superadmin → Clientes. No es lo mismo que
 * `getBusinesses` (esa trae el detalle fila por fila); acá se agregan
 * conteos para el número grande + el desglose por plan.
 */
export async function getClientsOverview(): Promise<ClientsOverview> {
  const admin = createAdminClient();
  const empty: ClientsOverview = {
    activeCount: 0,
    overdueCount: 0,
    noPlanCount: 0,
    disabledCount: 0,
    totalRegistered: 0,
    byPlan: [],
  };

  const [{ data: businesses, error }, { data: wallets }, { data: plans }] = await Promise.all([
    admin.from("businesses").select("id, is_active"),
    admin.from("credit_wallets").select("business_id, plan_key, plan_renews_at"),
    admin
      .from("plans")
      .select("key, name, price_monthly_cop, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (error || !businesses) {
    console.error("[getClientsOverview] error:", error);
    return empty;
  }

  const walletByBusiness = new Map(
    (wallets ?? []).map((w) => [
      w.business_id as string,
      w as { plan_key: string | null; plan_renews_at: string | null },
    ])
  );

  const now = Date.now();
  let activeCount = 0;
  let overdueCount = 0;
  let noPlanCount = 0;
  let disabledCount = 0;
  const countByPlanKey = new Map<string, number>();

  for (const b of businesses) {
    if (!b.is_active) {
      disabledCount++;
      continue;
    }
    const wallet = walletByBusiness.get(b.id);
    if (!wallet?.plan_key) {
      noPlanCount++;
      continue;
    }
    const overdue = wallet.plan_renews_at ? new Date(wallet.plan_renews_at).getTime() < now : false;
    if (overdue) overdueCount++;
    else activeCount++;
    countByPlanKey.set(wallet.plan_key, (countByPlanKey.get(wallet.plan_key) ?? 0) + 1);
  }

  const byPlan: ClientPlanBreakdown[] = (plans ?? []).map((p) => ({
    key: p.key as string,
    name: p.name as string,
    priceMonthlyCop: p.price_monthly_cop as number,
    count: countByPlanKey.get(p.key as string) ?? 0,
  }));

  return {
    activeCount,
    overdueCount,
    noPlanCount,
    disabledCount,
    totalRegistered: businesses.length,
    byPlan,
  };
}
