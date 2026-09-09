"use client";

import { useRouter, usePathname } from "next/navigation";
import { Dropdown } from "@/components/dashboard/shared/Dropdown";
import type { PlatformMonthStats } from "@/lib/services/platformStatsService";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MONTH_ABBR = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const fmt = (n: number) => n.toLocaleString("en-US");
const fmtUsd = (n: number) => (n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

// Etiqueta de columna: "2026-04" -> "Abr 26".
function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTH_ABBR[m - 1]} ${String(y).slice(-2)}`;
}

type Row = {
  label: string;
  get: (s: PlatformMonthStats) => number;
  format: (n: number) => string;
};

const ROWS: Row[] = [
  { label: "Negocios registrados", get: (s) => s.businessesTotal, format: fmt },
  { label: "Negocios nuevos", get: (s) => s.businessesNew, format: fmt },
  { label: "Negocios inhabilitados", get: (s) => s.businessesDisabled, format: fmt },
  { label: "Pedidos completados", get: (s) => s.completedOrdersCount, format: fmt },
  { label: "Reservas completadas", get: (s) => s.completedReservationsCount, format: fmt },
  { label: "Clientes nuevos", get: (s) => s.customersNew, format: fmt },
  { label: "Tokens del agente", get: (s) => s.agentTokens, format: fmt },
  { label: "Costo del agente", get: (s) => s.agentCostUsd, format: fmtUsd },
  { label: "Créditos consumidos por las empresas", get: (s) => s.creditsConsumed, format: fmt },
];

// Variación vs el mes anterior. Neutra (no verde/rojo): "más" o "menos" no
// siempre es bueno o malo — más tokens es más uso, más inhabilitados es
// malo. Solo informa la dirección y la magnitud.
function delta(cur: number, prev: number | undefined): string | null {
  if (prev === undefined) return null;
  if (prev === 0) return cur === 0 ? null : "nuevo";
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return "=";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`;
}

export function EstadisticasPanel({
  series,
  selectedMonth,
  selectedYear,
  currentYear,
  range,
}: {
  series: PlatformMonthStats[];
  selectedMonth: number;
  selectedYear: number;
  currentYear: number;
  range: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const years = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i);

  function goTo(month: number, year: number, r: number) {
    router.push(`${pathname}?m=${month}&y=${year}&r=${r}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          Hasta
        </span>
        <Dropdown
          className="w-40"
          triggerLabel={MONTH_NAMES[selectedMonth - 1]}
          activeKey={String(selectedMonth)}
          options={MONTH_NAMES.map((label, i) => ({ key: String(i + 1), label }))}
          onSelect={(key) => goTo(Number(key), selectedYear, range)}
        />
        <Dropdown
          className="w-28"
          triggerLabel={String(selectedYear)}
          activeKey={String(selectedYear)}
          options={years.map((y) => ({ key: String(y), label: String(y) }))}
          onSelect={(key) => goTo(selectedMonth, Number(key), range)}
        />
        <div className="flex overflow-hidden rounded-full border" style={{ borderColor: "var(--nexora-line)" }}>
          {[6, 12].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => goTo(selectedMonth, selectedYear, n)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                range === n
                  ? { background: "var(--nexora-nova)", color: "var(--nexora-nova-ink)" }
                  : { background: "transparent", color: "var(--nexora-ink-dim)" }
              }
            >
              {n} meses
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--nexora-void)] px-3 py-2 text-left text-xs font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                Métrica
              </th>
              {series.map((s) => (
                <th
                  key={s.monthKey}
                  className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap"
                  style={{ color: "var(--nexora-ink-dim)" }}
                >
                  {monthLabel(s.monthKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-t" style={{ borderColor: "var(--nexora-line)" }}>
                <td
                  className="sticky left-0 z-10 bg-[var(--nexora-void)] px-3 py-2.5 text-left"
                  style={{ color: "var(--nexora-ink-dim)" }}
                >
                  {row.label}
                </td>
                {series.map((s, i) => {
                  const cur = row.get(s);
                  const d = delta(cur, i > 0 ? row.get(series[i - 1]) : undefined);
                  return (
                    <td key={s.monthKey} className="px-3 py-2.5 text-right whitespace-nowrap">
                      <span className="font-medium" style={{ color: "var(--nexora-ink)" }}>
                        {row.format(cur)}
                      </span>
                      {d && (
                        <span className="ml-2 text-[11px]" style={{ color: "var(--nexora-ink-dim)" }}>
                          {d}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
        Cada columna se calcula en vivo. La variación (%) es contra el mes anterior de la tabla.
      </p>
    </div>
  );
}
