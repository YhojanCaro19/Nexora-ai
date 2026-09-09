"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Building2,
  Sparkles,
  PowerOff,
  ShoppingBag,
  CalendarDays,
  Users,
  Bot,
  DollarSign,
  Coins,
  type LucideIcon,
} from "lucide-react";
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

// "2026-04" -> "Abr 26"
function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTH_ABBR[m - 1]} ${String(y).slice(-2)}`;
}

type Metric = {
  label: string;
  icon: LucideIcon;
  get: (s: PlatformMonthStats) => number;
  format: (n: number) => string;
};

const METRICS: Metric[] = [
  { label: "Negocios registrados", icon: Building2, get: (s) => s.businessesTotal, format: fmt },
  { label: "Negocios nuevos", icon: Sparkles, get: (s) => s.businessesNew, format: fmt },
  { label: "Negocios inhabilitados", icon: PowerOff, get: (s) => s.businessesDisabled, format: fmt },
  { label: "Pedidos completados", icon: ShoppingBag, get: (s) => s.completedOrdersCount, format: fmt },
  { label: "Reservas completadas", icon: CalendarDays, get: (s) => s.completedReservationsCount, format: fmt },
  { label: "Clientes nuevos", icon: Users, get: (s) => s.customersNew, format: fmt },
  { label: "Tokens del agente", icon: Bot, get: (s) => s.agentTokens, format: fmt },
  { label: "Costo del agente", icon: DollarSign, get: (s) => s.agentCostUsd, format: fmtUsd },
  { label: "Créditos consumidos", icon: Coins, get: (s) => s.creditsConsumed, format: fmt },
];

// Variación vs el mes anterior. Neutra (no verde/rojo): "más" o "menos" no
// siempre es bueno o malo — más tokens es más uso, más inhabilitados es
// malo. Solo la dirección y la magnitud.
function deltaText(cur: number, prev: number | undefined): string | null {
  if (prev === undefined) return null;
  if (prev === 0) return cur === 0 ? null : "nuevo";
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return "sin cambio";
  return `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}%`;
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
  const monthKeys = series.map((s) => s.monthKey);
  const lastLabel = monthKeys.length ? monthLabel(monthKeys[monthKeys.length - 1]) : "";
  const prevLabel = monthKeys.length > 1 ? monthLabel(monthKeys[monthKeys.length - 2]) : "";

  function goTo(month: number, year: number, r: number) {
    router.push(`${pathname}?m=${month}&y=${year}&r=${r}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          Hasta
        </span>
        <Dropdown
          className="w-36"
          triggerLabel={MONTH_NAMES[selectedMonth - 1]}
          activeKey={String(selectedMonth)}
          options={MONTH_NAMES.map((label, i) => ({ key: String(i + 1), label }))}
          onSelect={(key) => goTo(Number(key), selectedYear, range)}
        />
        <Dropdown
          className="w-24"
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

      {/* Eje de meses (una sola vez, alineado con las barras de abajo) */}
      <div className="flex items-center gap-3 px-4 sm:gap-4">
        <span className="hidden w-40 shrink-0 sm:block" />
        <div className="flex flex-1 gap-1">
          {series.map((s) => (
            <span
              key={s.monthKey}
              className="flex-1 truncate text-center text-[10px] uppercase tracking-wide"
              style={{ color: "var(--nexora-ink-dim)" }}
            >
              {MONTH_ABBR[Number(s.monthKey.split("-")[1]) - 1]}
            </span>
          ))}
        </div>
        <span className="w-24 shrink-0" />
      </div>

      {/* Una fila por métrica: etiqueta · mini-barras por mes · valor del
          último mes + variación vs el anterior. */}
      <div className="space-y-1.5">
        {METRICS.map((m) => {
          const values = series.map(m.get);
          const max = Math.max(...values, 1);
          const last = values[values.length - 1] ?? 0;
          const prev = values.length > 1 ? values[values.length - 2] : undefined;
          const d = deltaText(last, prev);
          return (
            <div
              key={m.label}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 sm:gap-4"
              style={{ borderColor: "var(--nexora-line)", background: "rgba(255,255,255,0.02)" }}
            >
              <span className="flex w-40 shrink-0 items-center gap-2">
                <m.icon size={14} strokeWidth={1.75} style={{ color: "var(--nexora-ink-dim)" }} />
                <span className="truncate text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                  {m.label}
                </span>
              </span>

              <div className="flex h-9 flex-1 items-end gap-1">
                {values.map((v, i) => {
                  const isLast = i === values.length - 1;
                  return (
                    <div
                      key={series[i].monthKey}
                      title={`${monthLabel(series[i].monthKey)}: ${m.format(v)}`}
                      className="flex-1 rounded-t-[3px]"
                      style={{
                        height: `${Math.max((v / max) * 100, v > 0 ? 6 : 3)}%`,
                        minHeight: 2,
                        background: isLast ? "#4CC2E8" : "rgba(76,194,232,0.3)",
                      }}
                    />
                  );
                })}
              </div>

              <span className="w-24 shrink-0 text-right">
                <span className="block text-sm font-semibold" style={{ color: "var(--nexora-ink)" }}>
                  {m.format(last)}
                </span>
                {d && (
                  <span className="block text-[11px]" style={{ color: "var(--nexora-ink-dim)" }}>
                    {d}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
        Cada mes se calcula en vivo. El valor y la variación son de <strong style={{ color: "var(--nexora-ink)" }}>{lastLabel}</strong>
        {prevLabel ? ` vs ${prevLabel}` : ""}. Pasa el mouse sobre una barra para ver ese mes.
      </p>
    </div>
  );
}
