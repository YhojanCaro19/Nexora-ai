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
// siempre es bueno o malo — solo dirección y magnitud.
function deltaText(cur: number, prev: number | undefined): string | null {
  if (prev === undefined) return null;
  if (prev === 0) return cur === 0 ? null : "nuevo";
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return "sin cambio";
  return `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}%`;
}

// Línea de tendencia — SVG de 100×32 (unidades), se estira al ancho del
// contenedor; el trazo no se deforma (vectorEffect non-scaling-stroke).
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 30 - ((v - min) / span) * 28;
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `0,32 ${line} 100,32`;
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-12 w-full" aria-hidden>
      <polygon points={area} fill="url(#spark-fill)" />
      <polyline
        points={line}
        fill="none"
        stroke="#4CC2E8"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
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
  const firstLabel = series.length ? monthLabel(series[0].monthKey) : "";
  const lastLabel = series.length ? monthLabel(series[series.length - 1].monthKey) : "";

  function goTo(month: number, year: number, r: number) {
    router.push(`${pathname}?m=${month}&y=${year}&r=${r}`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <svg width={0} height={0} aria-hidden>
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4CC2E8" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#4CC2E8" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {METRICS.map((m) => {
          const values = series.map(m.get);
          const last = values[values.length - 1] ?? 0;
          const prev = values.length > 1 ? values[values.length - 2] : undefined;
          const d = deltaText(last, prev);
          return (
            <div
              key={m.label}
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--nexora-line)", background: "rgba(255,255,255,0.02)" }}
            >
              <div className="mb-2 flex items-center gap-2">
                <m.icon size={14} strokeWidth={1.75} style={{ color: "var(--nexora-ink-dim)" }} />
                <span className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                  {m.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold" style={{ color: "var(--nexora-ink)" }}>
                  {m.format(last)}
                </span>
                {d && (
                  <span className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                    {d}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <Sparkline values={values} />
              </div>
              <div className="mt-1 flex justify-between text-[10px]" style={{ color: "var(--nexora-ink-dim)" }}>
                <span>{firstLabel}</span>
                <span>{lastLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
