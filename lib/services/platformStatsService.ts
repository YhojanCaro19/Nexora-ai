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
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { estimateCostUsd } from "@/lib/config/modelPricing";
import { getAgentUsageByBusiness } from "@/lib/services/agentUsageService";

// ── Ventana "hoy" en la zona de quien mira ─────────────────────────────
//
// En Superadmin → Inicio "hoy" es el día del reloj del superadmin, no el
// de UTC (a las 10 p. m. en Colombia, en UTC ya es mañana y los KPIs del
// día salían casi vacíos). El componente cliente <LocalNow> escribe la
// cookie `av_tzoffset` con `Date.getTimezoneOffset()` — minutos, con el
// signo de esa API: UTC = hora local + offset (Colombia UTC-5 => 300).
// Mientras la cookie no exista (primer render tras el deploy) caemos a
// Colombia (UTC-5, sin horario de verano) porque el superadmin hoy está
// allí; en la siguiente carga la cookie ya está y el borde del día es
// exacto.
const DEFAULT_TZ_OFFSET_MINUTES = 300; // America/Bogota, sin DST

async function clientTzOffsetMinutes(): Promise<number> {
  const raw = (await cookies()).get("av_tzoffset")?.value;
  const n = raw ? Number(raw) : NaN;
  if (Number.isInteger(n) && Math.abs(n) <= 24 * 60) return n;
  return DEFAULT_TZ_OFFSET_MINUTES;
}

/**
 * `[medianoche local, ahora)` para un offset de zona en minutos (el que
 * devuelve `Date.prototype.getTimezoneOffset`: UTC = hora local + offset).
 * Con offset fijo el borde del día es correcto en zonas sin horario de
 * verano (Colombia); en zonas con DST puede desviarse una hora los dos
 * días del año en que hay cambio — aceptable para un KPI de "hoy" y sin
 * meter una librería de zonas horarias.
 */
export function todayRange(offsetMinutes: number): { from: string; to: string } {
  const now = new Date();
  const local = new Date(now.getTime() - offsetMinutes * 60000);
  const midnightUtcMs =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + offsetMinutes * 60000;
  return { from: new Date(midnightUtcMs).toISOString(), to: now.toISOString() };
}

// Métricas de plataforma para un RANGO [from, to) — mismo set para "hoy"
// (Superadmin → Inicio) y para un mes (Estadísticas). Los conteos "New" y
// "completed*" son del rango; `businessesTotal` es "hasta el final del
// rango" (acumulado, no del período).
export interface PlatformPeriodStats {
  businessesTotal: number;
  businessesNew: number;
  /** Negocios que el superadmin inhabilitó EN EL RANGO (no el total inhabilitado hoy). */
  businessesDisabled: number;
  /** Pedidos creados en el rango que llegaron a un estado final (shipped/picked_up) — no cuenta pendientes ni rechazados. */
  completedOrdersCount: number;
  /** Reservas creadas en el rango con status='completed' — no cuenta pendientes, canceladas ni no-show. */
  completedReservationsCount: number;
  agentTokens: number;
  agentCostUsd: number;
  /** Créditos gastados por TODAS las empresas en el rango, en TODO (agente, copy, imágenes, campañas...), no solo el agente. */
  creditsConsumed: number;
  customersNew: number;
}

export interface PlatformMonthStats extends PlatformPeriodStats {
  /** "2026-09" */
  monthKey: string;
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
 * El núcleo: cuenta las métricas de plataforma para un rango `[from, to)`
 * EN VIVO desde las tablas de origen. Lo usan `computeMonthStats` (un mes)
 * y `computeTodayStats` (el día de hoy en la zona del superadmin).
 */
export async function computeRangeStats(from: string, to: string): Promise<PlatformPeriodStats> {
  const admin = createAdminClient();

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
 * Estadísticas de un mes EN VIVO — no lee ni escribe `platform_monthly_stats`.
 * Sirve para el mes en curso y para recalcular un mes cerrado.
 */
export async function computeMonthStats(monthStart: Date): Promise<PlatformMonthStats> {
  const { from, to } = monthRange(monthStart);
  return { monthKey: monthKeyOf(monthStart), ...(await computeRangeStats(from, to)) };
}

/** Estadísticas de HOY (medianoche local del superadmin → ahora). Superadmin → Inicio. */
export async function computeTodayStats(): Promise<PlatformPeriodStats> {
  const { from, to } = todayRange(await clientTzOffsetMinutes());
  return computeRangeStats(from, to);
}

/**
 * Serie de `months` meses consecutivos que TERMINA en `endMonthKey`
 * (incluido), del más viejo al más nuevo. Cada mes se calcula en vivo. Lo
 * usa Superadmin → Estadísticas para las líneas de tendencia por métrica.
 * `months` acotado (6/12) para no disparar decenas de queries.
 */
export async function getMonthlyStatsSeries(
  endMonthKey: string,
  months: number,
): Promise<PlatformMonthStats[]> {
  const end = monthStartFromKey(endMonthKey);
  const starts: Date[] = [];
  for (let i = months - 1; i >= 0; i--) {
    starts.push(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1)));
  }
  return Promise.all(starts.map((s) => computeMonthStats(s)));
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
 * de TODA la plataforma. Los días se recortan en la zona del superadmin
 * (misma ventana que el resto de Inicio) para que el último punto coincida
 * con "hoy". Un query trae todo el rango, se agrupa en memoria por día.
 */
export async function getAgentTokenTrend(days = 7): Promise<DailyTokenPoint[]> {
  const admin = createAdminClient();
  const { from: todayFrom } = todayRange(await clientTzOffsetMinutes());
  const todayStart = new Date(todayFrom);
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

/** Negocios con más actividad del agente HOY (medianoche local del superadmin → ahora), de mayor a menor. */
export async function getTopBusinessesByAgentActivity(limit = 5): Promise<TopAgentBusiness[]> {
  const { from, to } = todayRange(await clientTzOffsetMinutes());
  const usage = await getAgentUsageByBusiness({ from, to });
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
