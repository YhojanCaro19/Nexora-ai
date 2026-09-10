// app/(dashboard)/admin/home-dashboard.tsx
//
// Cuerpo del Inicio del panel — "cómo va el negocio HOY". Lo renderizan
// tanto el admin (app/(dashboard)/admin/page.tsx) como el colaborador
// (app/(dashboard)/colaborador/page.tsx): el colaborador ve exactamente la
// misma información del negocio, no un tablero recortado.
import { Wallet, ShoppingBag, Receipt } from "lucide-react";
import { getAdminDashboardStats } from "@/lib/services/dashboardService";
import { getBookingSettings } from "@/lib/services/bookingConfigService";
import { getTodayReservations } from "@/lib/services/reservationService";
import { IconStatCard } from "@/components/dashboard/shared/IconStatCard";
import { SalesTrendChart } from "./sales-trend-chart";
import { OrdersLineChart } from "./orders-line-chart";
import { CompletionRingCard } from "./completion-ring-card";
import { PendingOrdersPreview } from "./pending-orders-preview";
import { TodayReservations } from "./today-reservations";
import { formatCurrency } from "@/lib/utils/currency";

export async function HomeDashboard({
  businessId,
  // El colaborador ve todo el tablero MENOS "Colaboradores activos" — la
  // plantilla del negocio no es asunto suyo.
  showCollaborators = true,
}: {
  businessId: string | null;
  showCollaborators?: boolean;
}) {
  const stats = businessId ? await getAdminDashboardStats(businessId) : null;
  const bookingSettings = businessId ? await getBookingSettings(businessId) : null;
  const todayReservations =
    businessId && bookingSettings && bookingSettings.mode !== "off"
      ? await getTodayReservations(businessId)
      : [];

  const countryIso2 = stats?.countryIso2 ?? null;
  const todayRevenue = stats?.todayRevenue ?? 0;
  const todayOrderCount = stats?.todayOrderCount ?? 0;
  const avgOrderValue = stats?.avgOrderValue ?? 0;
  const salesTrend = stats?.salesTrend ?? [];
  const completionRate = stats?.completionRate ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Inicio
      </h1>

      {/* Los KPIs de "cómo va hoy" — todos comparables entre sí. Pedidos
          pendientes ya no sale acá como número suelto: el detalle
          completo está más abajo, en la lista. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <IconStatCard
          icon={Wallet}
          label="Ventas de hoy"
          value={formatCurrency(todayRevenue, countryIso2)}
        />
        <IconStatCard
          icon={ShoppingBag}
          label="Pedidos de hoy"
          value={String(todayOrderCount)}
          badge={
            pendingOrders > 0
              ? { text: `${pendingOrders} ${pendingOrders === 1 ? "nuevo" : "nuevos"}` }
              : undefined
          }
        />
        <IconStatCard icon={Receipt} label="Ticket promedio del día" value={formatCurrency(avgOrderValue, countryIso2)} />
      </div>

      {bookingSettings && bookingSettings.mode !== "off" && (
        <TodayReservations mode={bookingSettings.mode} reservations={todayReservations} />
      )}

      {/* Dos filas reales de cuadrícula — cada fila comparte alto
          (items-stretch), sin dejar hueco. Fila 1: la gráfica grande con
          pendientes al lado. Fila 2: completados (ancho, se centra solo)
          con "Pedidos de la semana" angosto al lado — así ese gráfico deja
          de verse estirado. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2">
          <SalesTrendChart points={salesTrend} todayRevenue={todayRevenue} countryIso2={countryIso2} />
        </div>
        <PendingOrdersPreview
          orders={stats?.pendingPreview ?? []}
          countryIso2={countryIso2}
          totalCount={pendingOrders}
        />
      </div>

      {/* Mitad y mitad — reemplaza una proporción escrita a mano
          (grid-cols-[13fr_12fr]) que resultó de varios ajustes del 10% en
          cadena; esa sintaxis de fracción es frágil en Tailwind y no se
          estaba aplicando de forma confiable. 50/50 es prácticamente el
          mismo resultado visual (13:12 ≈ 52:48) pero con una clase
          estándar, sin riesgo. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <CompletionRingCard
          finishedCount={stats?.finishedOrdersCount ?? 0}
          totalCount={stats?.totalRealOrdersCount ?? 0}
          percent={completionRate}
        />
        <OrdersLineChart points={salesTrend} />
      </div>

      {/* Estado general del negocio (no es "de hoy") — un solo bloque
          ancho, en horizontal. */}
      <div
        className={`rounded-2xl border p-4 sm:p-6 grid grid-cols-1 gap-6 text-center ${
          showCollaborators ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
        style={{ background: 'var(--nexora-panel)', borderColor: 'var(--nexora-line)' }}
      >
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>Más vendido hoy</p>
          <p className="text-base font-semibold mt-1" style={{ color: 'var(--nexora-ink)' }}>{stats?.topProductToday ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>Productos activos</p>
          <p className="text-base font-semibold mt-1" style={{ color: 'var(--nexora-ink)' }}>{stats?.activeProducts ?? 0}</p>
        </div>
        {showCollaborators && (
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>Colaboradores activos</p>
            <p className="text-base font-semibold mt-1" style={{ color: 'var(--nexora-ink)' }}>{stats?.activeCollaborators ?? 0}</p>
          </div>
        )}
      </div>
    </div>
  );
}
