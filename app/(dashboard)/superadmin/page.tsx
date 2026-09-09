// app/(dashboard)/superadmin/page.tsx
//
// Inicio del superadmin — "cómo va la plataforma HOY": negocios nuevos del
// día, pedidos/reservas del día, consumo del día, + mensualidades por
// vencer y qué negocios más usan el agente. Todo lo mensual y la evolución
// mes a mes vive en Superadmin → Estadísticas — acá NADA es mensual.
import {
  computeTodayStats,
  getAgentTokenTrend,
  getTopBusinessesByAgentActivity,
  getUpcomingRenewals,
} from "@/lib/services/platformStatsService";
import { PlatformStatsGrid } from "@/components/dashboard/shared/PlatformStatsGrid";
import { AgentTokenTrendChart } from "./agent-token-trend-chart";
import { TopAgentBusinesses } from "./top-agent-businesses";
import { UpcomingRenewalsPreview } from "./upcoming-renewals-preview";

export default async function SuperAdminIndexPage() {
  const today = new Date().toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const [stats, tokenTrend, topBusinesses, renewals] = await Promise.all([
    computeTodayStats(),
    getAgentTokenTrend(7),
    getTopBusinessesByAgentActivity(5),
    getUpcomingRenewals(5),
  ]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="font-nexora text-xl" style={{ color: "var(--nexora-ink)" }}>
          Inicio
        </h1>
        <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          Hoy · {today}
        </p>
      </div>

      <div className="mx-auto max-w-5xl space-y-6">
        <PlatformStatsGrid stats={stats} period="hoy" />

        <UpcomingRenewalsPreview renewals={renewals} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <div className="lg:col-span-2">
            <AgentTokenTrendChart points={tokenTrend} />
          </div>
          <TopAgentBusinesses businesses={topBusinesses} />
        </div>
      </div>
    </div>
  );
}
