// app/(dashboard)/superadmin/estadisticas/page.tsx
//
// Comparación MES A MES de la plataforma — negocios, pedidos, reservas,
// tokens/costo del agente, créditos y clientes, una columna por mes con la
// variación respecto al mes anterior. El snapshot del mes en curso "de un
// vistazo" vive en Superadmin → Inicio; acá el valor está en ver la
// evolución. Siempre se calcula EN VIVO desde las tablas de origen (nunca
// lee `platform_monthly_stats`).
import { getMonthlyStatsSeries } from "@/lib/services/platformStatsService";
import { EstadisticasPanel } from "./estadisticas-panel";

function clampInt(value: string | undefined, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; y?: string; r?: string }>;
}) {
  const { m, y, r } = await searchParams;
  const now = new Date();
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();

  // El mes/año elegido es el ÚLTIMO de la serie; el rango (6 o 12) son los
  // meses hacia atrás que se muestran junto a él.
  const selectedMonth = clampInt(m, 1, 12, currentMonth);
  const selectedYear = clampInt(y, currentYear - 3, currentYear + 1, currentYear);
  const range = r === "12" ? 12 : 6;
  const endMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const series = await getMonthlyStatsSeries(endMonthKey, range);

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Estadísticas
      </h1>
      <EstadisticasPanel
        series={series}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        currentYear={currentYear}
        range={range}
      />
    </div>
  );
}
