// lib/services/dashboardService.ts
//
// Agrega lo que se muestra en el Inicio del admin — reusa los mismos
// servicios que ya alimentan Pedidos, Catálogo, Colaboradores y Reportes
// en vez de escribir consultas nuevas paralelas.
import { getDailySalesSummary, getSalesTrend, type DailyTrendPoint } from "@/lib/services/reportService";
import { getOrders } from "@/lib/services/orderService";
import { getProducts } from "@/lib/services/productService";
import { getCollaborators } from "@/lib/services/collaboratorService";
import { getTimezoneForCountry, startOfDayInTimezone, endOfDayInTimezone } from "@/lib/utils/timezone";

export interface TrendIndicator {
  value: string;
  direction: "up" | "down" | "neutral";
}

export interface PendingOrderPreview {
  id: string;
  number: number;
  total: number;
  createdAt: string;
}

export interface AdminDashboardStats {
  todayRevenue: number;
  todayOrderCount: number;
  avgOrderValue: number;
  revenueTrend: TrendIndicator;
  orderCountTrend: TrendIndicator;
  topProductToday: string | null;
  pendingOrders: number;
  activeProducts: number;
  activeCollaborators: number;
  countryIso2: string | null;
  salesTrend: DailyTrendPoint[];
  // % de los pedidos creados HOY que ya quedaron finalizados (sobre el
  // total de pedidos de hoy, sin contar rechazados) — a pedido explícito:
  // la tarjeta se llama "Pedidos del día completados", así que el cálculo
  // tiene que corresponder al mismo día, no ser un acumulado histórico.
  completionRate: number;
  finishedOrdersCount: number;
  totalRealOrdersCount: number;
  pendingPreview: PendingOrderPreview[];
}

// "nuevo" cuando ayer no hubo nada con qué comparar — más honesto que
// mostrar un porcentaje sin sentido (dividir por cero) o un 0% engañoso.
function computeTrend(current: number, previous: number): TrendIndicator {
  if (previous === 0) {
    return current === 0 ? { value: "0%", direction: "neutral" } : { value: "nuevo", direction: "up" };
  }
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 1) return { value: "0%", direction: "neutral" };
  return { value: `${Math.abs(Math.round(change))}%`, direction: change > 0 ? "up" : "down" };
}

const FINISHED_STATUSES = ["shipped", "picked_up"];

export async function getAdminDashboardStats(businessId: string): Promise<AdminDashboardStats> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [todaySummary, yesterdaySummary, orders, products, collaborators, salesTrend] = await Promise.all([
    getDailySalesSummary(businessId),
    getDailySalesSummary(businessId, yesterday),
    getOrders(businessId),
    getProducts(businessId),
    getCollaborators(businessId),
    getSalesTrend(businessId, 7),
  ]);

  const todayRevenue = todaySummary?.totalRevenue ?? 0;
  const todayOrderCount = todaySummary?.orderCount ?? 0;

  // Misma numeración que usa el módulo de Pedidos (orden de creación, la
  // más antigua es #1) — para que "Pedido #3" en Inicio sea el mismo
  // pedido que "Pedido #3" allá.
  const sortedByCreation = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const orderNumbers = new Map(sortedByCreation.map((o, i) => [o.id, i + 1]));

  // Mismo corte de "hoy" (zona horaria del negocio) que usan las demás
  // tarjetas de esta pantalla — un pedido creado hoy cuenta aunque ya se
  // haya finalizado hoy mismo; uno de ayer no cuenta aquí aunque se
  // finalice hoy (eso lo cubre el histórico en Pedidos, no esta tarjeta).
  const timezone = getTimezoneForCountry(todaySummary?.business.countryIso2 ?? null);
  const todayStart = startOfDayInTimezone(timezone);
  const todayEnd = endOfDayInTimezone(timezone);
  const todaysRealOrders = orders.filter((o) => {
    if (o.status === "rejected") return false;
    const createdAt = new Date(o.created_at).getTime();
    return createdAt >= todayStart.getTime() && createdAt < todayEnd.getTime();
  });
  const finishedCount = todaysRealOrders.filter((o) => FINISHED_STATUSES.includes(o.status)).length;
  const completionRate = todaysRealOrders.length > 0 ? Math.round((finishedCount / todaysRealOrders.length) * 100) : 0;

  const pendingPreview: PendingOrderPreview[] = orders
    .filter((o) => o.status === "pending")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)
    .map((o) => ({
      id: o.id,
      number: orderNumbers.get(o.id) ?? 0,
      total: o.total,
      createdAt: o.created_at,
    }));

  return {
    todayRevenue,
    todayOrderCount,
    avgOrderValue: todayOrderCount > 0 ? todayRevenue / todayOrderCount : 0,
    revenueTrend: computeTrend(todayRevenue, yesterdaySummary?.totalRevenue ?? 0),
    orderCountTrend: computeTrend(todayOrderCount, yesterdaySummary?.orderCount ?? 0),
    topProductToday: todaySummary?.items[0]?.name ?? null,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    activeProducts: products.filter((p) => p.active).length,
    activeCollaborators: collaborators.filter((c) => c.is_active).length,
    countryIso2: todaySummary?.business.countryIso2 ?? null,
    salesTrend,
    completionRate,
    finishedOrdersCount: finishedCount,
    totalRealOrdersCount: todaysRealOrders.length,
    pendingPreview,
  };
}
