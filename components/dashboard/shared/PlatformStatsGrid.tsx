// components/dashboard/shared/PlatformStatsGrid.tsx
//
// Grilla de 8 KPIs de plataforma — Superadmin → Inicio, el snapshot "de un
// vistazo" del mes en curso. La comparación mes a mes (varios meses lado a
// lado) vive en Superadmin → Estadísticas, que ya NO usa esta grilla.
// Reusa IconStatCard, la misma tarjeta que Inicio de admin.
//
// 2 filas de 4 a propósito (8 = 4×2 exacto, sin hueco al final de
// ninguna fila). Cada etiqueta dice explícitamente qué cuenta — "Pedidos
// completados este mes", no solo "Pedidos" a secas — para no dejar
// ambigüedad sobre si incluye pendientes/rechazados.
import { Building2, PowerOff, ShoppingBag, CalendarDays, Users, Bot, DollarSign, Coins } from "lucide-react";
import { IconStatCard } from "@/components/dashboard/shared/IconStatCard";
import type { PlatformMonthStats } from "@/lib/services/platformStatsService";

const fmtUsd = (n: number) => (n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
const fmt = (n: number) => n.toLocaleString("en-US");

export function PlatformStatsGrid({ stats }: { stats: PlatformMonthStats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <IconStatCard
          icon={Building2}
          label="Negocios registrados"
          value={fmt(stats.businessesTotal)}
          badge={stats.businessesNew > 0 ? { text: `${stats.businessesNew} nuevos` } : undefined}
        />
        <IconStatCard icon={PowerOff} label="Negocios inhabilitados" value={fmt(stats.businessesDisabled)} />
        <IconStatCard icon={ShoppingBag} label="Pedidos completados este mes" value={fmt(stats.completedOrdersCount)} />
        <IconStatCard icon={CalendarDays} label="Reservas completadas este mes" value={fmt(stats.completedReservationsCount)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <IconStatCard icon={Users} label="Clientes nuevos" value={fmt(stats.customersNew)} />
        <IconStatCard icon={Bot} label="Tokens del agente" value={fmt(stats.agentTokens)} />
        <IconStatCard icon={DollarSign} label="Costo del agente" value={fmtUsd(stats.agentCostUsd)} />
        <IconStatCard icon={Coins} label="Créditos totales consumidos por las empresas" value={fmt(stats.creditsConsumed)} />
      </div>
    </div>
  );
}
