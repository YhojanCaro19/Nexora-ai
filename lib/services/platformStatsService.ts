// lib/services/platformStatsService.ts
//
// Estadísticas mensuales de TODA la plataforma (Superadmin → Estadísticas
// y → Inicio) — negocios, pedidos, reservas, tokens/costo del agente,
// créditos, clientes y registros, por mes.
//
// Estadísticas SIEMPRE calcula en vivo (`computeMonthStats`), para
// cualquier mes/año — nada de distinguir "guardado" vs "en vivo" de cara
// al superadmin (confundía más de lo que ayudaba). `platform_monthly_stats`
// sigue existiendo por debajo (el cron del día 1 sigue guardando un
// respaldo permanente del mes recién cerrado, por si algún día hace falta
// archivar/purgar las tablas de origen), pero la UI ya no depende de eso
// para mostrar nada — todo se recalcula de las tablas reales cada vez.
//
// Todo con service role — es agregado de plataforma, no depende de RLS
// por negocio.
import { createAdminClient } from "@/lib/supabase/server";
import { estimateCostUsd } from "@/lib/config/modelPricing";
import { getAgentUsageByBusiness } from "@/lib/services/agentUsageService";

export interface PlatformMonthStats {
  /** "2026-09" */
  monthKey: string;
  businessesTotal: number;
  businessesNew: number;
  /** Negocios que el superadmin inhabilitó ESE mes (no el total inhabilitado hoy). */
  businessesDisabled: number;
  /** Pedidos creados ese mes que llegaron a un estado final (shipped/picked_up) — no cuenta pendientes ni rechazados. */
  completedOrdersCount: number;
  /** Reservas creadas ese mes con status='completed' — no cuenta pendientes, canceladas ni no-show. */
  completedReservationsCount: number;
  agentTokens: number;
  agentCostUsd: number;
  /** Créditos gastados por TODAS las empresas ese mes, en TODO (agente, copy, imágenes, campañas...), no solo el agente. */
  creditsConsumed: number;
  customersNew: number;
}

function monthKeyOf(monthStart: Date): string {
  return `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Primer día (00:00 UTC) del mes de `monthKey` ("2026-09"). */
export function monthStartFromKey(monthKey: string): Date {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

/** [inicio, fin) del mes que empieza en `monthStart`. */
function monthRange(monthStart: Date): { from: string; to: string } {
  const to = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  return { from: monthStart.toISOString(), to: to.toISOString() };
}

/**
 * Calcula las estadísticas de un mes EN VIVO desde las tablas de origen —
 * no lee ni escribe `platform_monthly_stats`. Sirve tanto para el mes en
 * curso (siempre en vivo) como para recalcular un mes cerrado si hiciera
 * falta.
 */
export async function computeMonthStats(monthStart: Date): Promise<PlatformMonthStats> {
  const admin = createAdminClient();
  const { from, to } = monthRange(monthStart);

  const [
    businessesTotalRes,
    businessesNewRes,
    businessesDisabledRes,
    completedOrdersRes,
    completedReservationsRes,
    usageRes,
    creditLedgerRes,
    customersNewRes,
  ] = await Promise.all([
    admin.from("businesses").select("id", { count: "exact", head: true }).lt("created_at", to),
    admin.from("businesses").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to),
    admin
      .from("platform_admin_actions")
      .select("id", { count: "exact", head: true })
      .eq("action", "business_disabled")
      .gte("created_at", from)
      .lt("created_at", to),
    // "Completado" = llegó a un estado final, no solo "se creó" — un
    // pedido pendiente o rechazado no cuenta acá.
    admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["shipped", "picked_up"])
      .gte("created_at", from)
      .lt("created_at", to),
    admin
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("created_at", from)
      .lt("created_at", to),
    admin
      .from("agent_usage_log")
      .select("input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, model")
      .gte("created_at", from)
      .lt("created_at", to),
    // Créditos gastados por TODOS los conceptos (agente, copy, imágenes,
    // campañas...), no solo el agente — delta negativo = consumo.
    admin.from("credit_ledger").select("delta").lt("delta", 0).gte("created_at", from).lt("created_at", to),
    admin.from("customers").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to),
  ]);

  let agentTokens = 0;
  let agentCostUsd = 0;
  for (const row of usageRes.data ?? []) {
    const input = row.input_tokens ?? 0;
    const output = row.output_tokens ?? 0;
    const cacheRead = row.cache_read_input_tokens ?? 0;
    const cacheCreation = row.cache_creation_input_tokens ?? 0;
    agentTokens += input + output + cacheRead + cacheCreation;
    agentCostUsd += estimateCostUsd(row.model, {
      inputTokens: input,
      outputTokens: output,
      cacheReadTokens: cacheRead,
      cacheCreationTokens: cacheCreation,
    });
  }

  const creditsConsumed = (creditLedgerRes.data ?? []).reduce((sum, r) => sum + Math.abs(r.delta ?? 0), 0);

  return {
    monthKey: monthKeyOf(monthStart),
    businessesTotal: businessesTotalRes.count ?? 0,
    businessesNew: businessesNewRes.count ?? 0,
    businessesDisabled: businessesDisabledRes.count ?? 0,
    completedOrdersCount: completedOrdersRes.count ?? 0,
    completedReservationsCount: completedReservationsRes.count ?? 0,
    agentTokens,
    agentCostUsd,
    creditsConsumed,
    customersNew: customersNewRes.count ?? 0,
  };
}

/**
 * ¿Ya existe un snapshot guardado para este mes? Solo para el gating del
 * cron (no reintentar un mes ya cerrado) — la UI de Estadísticas ya NO
 * lee `platform_monthly_stats` para mostrar nada (siempre calcula en
 * vivo), así que esto no necesita devolver los valores, solo si existen.
 */
export async function monthIsSaved(monthKey: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_monthly_stats")
    .select("month")
    .eq("month", `${monthKey}-01`)
    .maybeSingle();

  if (error) {
    console.error("[monthIsSaved] error:", error.message);
    return false;
  }
  return Boolean(data);
}

/**
 * Calcula y GUARDA (upsert) un respaldo permanente del mes — hoy la UI no
 * depende de esto para mostrar nada (Estadísticas siempre calcula en
 * vivo), es solo por si algún día hace falta archivar/purgar las tablas
 * de origen. Solo guarda las 6 columnas que tiene la tabla; las métricas
 * agregadas después (créditos, clientes, etc.) no se persisten acá, se
 * recalculan en vivo cuando se necesiten.
 */
export async function snapshotMonth(monthStart: Date, isFinal: boolean): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const stats = await computeMonthStats(monthStart);
  const monthDate = `${stats.monthKey}-01`;

  const { error } = await admin.from("platform_monthly_stats").upsert(
    {
      month: monthDate,
      businesses_total: stats.businessesTotal,
      businesses_new: stats.businessesNew,
      orders_count: stats.completedOrdersCount,
      reservations_count: stats.completedReservationsCount,
      agent_tokens: stats.agentTokens,
      agent_cost_usd: stats.agentCostUsd,
      captured_at: new Date().toISOString(),
      is_final: isFinal,
    },
    { onConflict: "month" }
  );

  if (error) {
    console.error("[snapshotMonth] error:", error.message);
    return { error: "No se pudo guardar el snapshot del mes." };
  }
  return { error: null };
}

// ── Para Superadmin → Inicio (dashboard, no el historial de Estadísticas) ──

export interface DailyTokenPoint {
  /** "Lun", "Mar"... mismo formato que el DailyTrendPoint de admin. */
  label: string;
  date: string;
  tokens: number;
}

/**
 * Tokens del agente por día, últimos `days` días (hoy incluido, al final)
 * — mismo espíritu que `getSalesTrend` de admin (reportService.ts), pero
 * de TODA la plataforma y en UTC (no hay un solo país al que ajustar el
 * "día" acá). Un query trae todo el rango, se agrupa en memoria por día.
 */
export async function getAgentTokenTrend(days = 7): Promise<DailyTokenPoint[]> {
  const admin = createAdminClient();
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const rangeStart = new Date(todayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

  const { data, error } = await admin
    .from("agent_usage_log")
    .select("input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, created_at")
    .gte("created_at", rangeStart.toISOString());

  if (error) {
    console.error("[getAgentTokenTrend] error:", error.message);
    return [];
  }

  const rows = data ?? [];
  const points: DailyTokenPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayRows = rows.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });
    const tokens = dayRows.reduce(
      (sum, r) =>
        sum +
        (r.input_tokens ?? 0) +
        (r.output_tokens ?? 0) +
        (r.cache_read_input_tokens ?? 0) +
        (r.cache_creation_input_tokens ?? 0),
      0
    );
    const label = new Intl.DateTimeFormat("es", { weekday: "short", timeZone: "UTC" })
      .format(dayStart)
      .replace(/\.$/, "");
    points.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      date: dayStart.toISOString(),
      tokens,
    });
  }
  return points;
}

export interface TopAgentBusiness {
  businessId: string;
  businessName: string;
  tokens: number;
  costUsd: number;
}

/** Negocios con más actividad del agente en lo que va del mes, de mayor a menor. */
export async function getTopBusinessesByAgentActivity(limit = 5): Promise<TopAgentBusiness[]> {
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const usage = await getAgentUsageByBusiness(monthRange(monthStart));
  return usage
    .filter((u) => u.totalTokens > 0)
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, limit)
    .map((u) => ({ businessId: u.businessId, businessName: u.businessName, tokens: u.totalTokens, costUsd: u.estimatedCostUsd }));
}

export interface UpcomingRenewal {
  businessId: string;
  businessName: string;
  planRenewsAt: string;
}

/**
 * Negocios cuyo vencimiento cae dentro de `withinDays` (o ya pasó) — para
 * el preview de Inicio. A diferencia de
 * `planRenewalService.getBusinessesDueForReminder`, esto NO filtra por si
 * ya se envió el correo: es solo una vista, no dispara ni condiciona nada.
 */
export async function getUpcomingRenewals(withinDays = 5): Promise<UpcomingRenewal[]> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("credit_wallets")
    .select("business_id, plan_renews_at, businesses(name)")
    .not("plan_renews_at", "is", null)
    .lte("plan_renews_at", cutoff)
    .order("plan_renews_at", { ascending: true });

  if (error) {
    console.error("[getUpcomingRenewals] error:", error.message);
    return [];
  }

  type Row = { business_id: string; plan_renews_at: string; businesses: { name: string } | null };
  return (data as unknown as Row[])
    .filter((r) => r.businesses)
    .map((r) => ({ businessId: r.business_id, businessName: r.businesses!.name, planRenewsAt: r.plan_renews_at }));
}
