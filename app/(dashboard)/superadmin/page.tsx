// app/(dashboard)/superadmin/page.tsx
//
// Inicio del superadmin — mismo espíritu que app/(dashboard)/admin/page.tsx
// (KPIs arriba + una tarjeta ancha + una fila de gráfica/preview), pero
// con datos de plataforma: negocios nuevos, mensualidades por vencer,
// tendencia de tokens y qué negocios más usan el agente este mes. El
// historial mes a mes completo vive en Superadmin → Estadísticas — acá
// es solo "cómo va todo ahora mismo".
import {
  computeMonthStats,
  getAgentTokenTrend,
  getTopBusinessesByAgentActivity,
  getUpcomingRenewals,
} from "@/lib/services/platformStatsService";
import { PlatformStatsGrid } from "@/components/dashboard/shared/PlatformStatsGrid";
import { AgentTokenTrendChart } from "./agent-token-trend-chart";
import { TopAgentBusinesses } from "./top-agent-businesses";
import { UpcomingRenewalsPreview } from "./upcoming-renewals-preview";

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export default async function SuperAdminIndexPage() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [stats, tokenTrend, topBusinesses, renewals] = await Promise.all([
    computeMonthStats(monthStart),
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
          {MONTH_NAMES[now.getUTCMonth()]} {now.getUTCFullYear()}
        </p>
      </div>

      <div className="mx-auto max-w-5xl space-y-6">
        <PlatformStatsGrid stats={stats} />

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
