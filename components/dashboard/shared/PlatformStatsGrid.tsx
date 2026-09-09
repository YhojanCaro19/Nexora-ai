// components/dashboard/shared/PlatformStatsGrid.tsx
//
// Grilla de 8 KPIs de plataforma — Superadmin → Inicio. Con `period="hoy"`
// (default) cuenta lo del día; con `period="este mes"` cuenta el mes en
// curso. La comparación mes a mes (varios meses lado a lado) vive en
// Superadmin → Estadísticas, que ya NO usa esta grilla. Reusa IconStatCard.
//
// 2 filas de 4 a propósito (8 = 4×2 exacto). Cada etiqueta dice qué cuenta
// y en qué período — "Pedidos completados hoy" — para no dejar ambigüedad.
import { Building2, PowerOff, ShoppingBag, CalendarDays, Users, Bot, DollarSign, Coins } from "lucide-react";
import { IconStatCard } from "@/components/dashboard/shared/IconStatCard";
import type { PlatformPeriodStats } from "@/lib/services/platformStatsService";

const fmtUsd = (n: number) => (n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
const fmt = (n: number) => n.toLocaleString("en-US");

export function PlatformStatsGrid({
  stats,
  period = "hoy",
}: {
  stats: PlatformPeriodStats;
  /** Palabra de período para las etiquetas: "hoy" o "este mes". */
  period?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <IconStatCard
          icon={Building2}
          label="Negocios registrados"
          value={fmt(stats.businessesTotal)}
          badge={stats.businessesNew > 0 ? { text: `${stats.businessesNew} nuevos` } : undefined}
        />
        <IconStatCard icon={PowerOff} label={`Negocios inhabilitados ${period}`} value={fmt(stats.businessesDisabled)} />
        <IconStatCard icon={ShoppingBag} label={`Pedidos completados ${period}`} value={fmt(stats.completedOrdersCount)} />
        <IconStatCard icon={CalendarDays} label={`Reservas completadas ${period}`} value={fmt(stats.completedReservationsCount)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <IconStatCard icon={Users} label={`Clientes nuevos ${period}`} value={fmt(stats.customersNew)} />
        <IconStatCard icon={Bot} label={`Tokens del agente ${period}`} value={fmt(stats.agentTokens)} />
        <IconStatCard icon={DollarSign} label={`Costo del agente ${period}`} value={fmtUsd(stats.agentCostUsd)} />
        <IconStatCard icon={Coins} label={`Créditos consumidos por las empresas ${period}`} value={fmt(stats.creditsConsumed)} />
      </div>
    </div>
  );
}
