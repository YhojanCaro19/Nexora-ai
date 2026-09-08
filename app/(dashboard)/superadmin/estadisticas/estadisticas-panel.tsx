"use client";

import { useRouter, usePathname } from "next/navigation";
import { Dropdown } from "@/components/dashboard/shared/Dropdown";
import { PlatformStatsGrid } from "@/components/dashboard/shared/PlatformStatsGrid";
import type { PlatformMonthStats } from "@/lib/services/platformStatsService";

// Enero arriba, diciembre abajo — orden cronológico, no el orden alfabético
// ni "más reciente primero" que tenía el desplegable combinado de antes.
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function EstadisticasPanel({
  stats,
  selectedMonth,
  selectedYear,
  currentYear,
}: {
  stats: PlatformMonthStats;
  selectedMonth: number;
  selectedYear: number;
  currentYear: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Rango de años seleccionable — personalizable de verdad, no atado a
  // "los últimos 12 meses" como antes. 3 años atrás a 1 adelante alcanza
  // para cualquier caso real; se puede ampliar el día que haga falta.
  const years = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i);

  function goTo(month: number, year: number) {
    router.push(`${pathname}?m=${month}&y=${year}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Dropdown
          className="w-40"
          triggerLabel={MONTH_NAMES[selectedMonth - 1]}
          activeKey={String(selectedMonth)}
          options={MONTH_NAMES.map((label, i) => ({ key: String(i + 1), label }))}
          onSelect={(key) => goTo(Number(key), selectedYear)}
        />
        <Dropdown
          className="w-28"
          triggerLabel={String(selectedYear)}
          activeKey={String(selectedYear)}
          options={years.map((y) => ({ key: String(y), label: String(y) }))}
          onSelect={(key) => goTo(selectedMonth, Number(key))}
        />
      </div>

      <PlatformStatsGrid stats={stats} />
    </div>
  );
}
