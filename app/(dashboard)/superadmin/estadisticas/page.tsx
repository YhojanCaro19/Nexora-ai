// app/(dashboard)/superadmin/estadisticas/page.tsx
//
// Historial mensual de la plataforma — negocios, pedidos, reservas,
// tokens/costo del agente, créditos, clientes y registros, mes por mes.
// Cualquier mes/año se puede consultar: siempre se calcula EN VIVO desde
// las tablas de origen (nunca lee `platform_monthly_stats` — esa tabla es
// solo un respaldo de fondo, ver platformStatsService.ts).
import { computeMonthStats, monthStartFromKey } from "@/lib/services/platformStatsService";
import { EstadisticasPanel } from "./estadisticas-panel";

function clampInt(value: string | undefined, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; y?: string }>;
}) {
  const { m, y } = await searchParams;
  const now = new Date();
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();

  // Año personalizable de verdad — no limitado a "los últimos 12 meses".
  // El rango (3 años atrás a 1 año adelante) es solo para el selector; un
  // mes futuro simplemente sale en ceros, no hace falta bloquearlo.
  const selectedMonth = clampInt(m, 1, 12, currentMonth);
  const selectedYear = clampInt(y, currentYear - 3, currentYear + 1, currentYear);
  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const stats = await computeMonthStats(monthStartFromKey(monthKey));

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Estadísticas
      </h1>
      <EstadisticasPanel
        stats={stats}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        currentYear={currentYear}
      />
    </div>
  );
}
