"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, Megaphone, Plug } from "lucide-react";
import type { MarketingStrategy, StrategyStatus, MarketingKpis } from "@/lib/services/marketingService";
import { formatShortDate } from "@/lib/utils/date";

const STATUS_LABEL: Record<StrategyStatus, string> = {
  draft: "Borrador",
  ready: "Lista",
  active: "Activa",
  paused: "En pausa",
  ended: "Finalizada",
  archived: "Archivada",
  rejected: "Rechazada",
};

const STATUS_COLOR: Record<StrategyStatus, string> = {
  draft: "var(--nexora-ink-dim)",
  ready: "var(--nexora-nova)",
  active: "var(--nexora-signal)",
  paused: "#e8b64c",
  ended: "var(--nexora-ink-dim)",
  archived: "var(--nexora-ink-dim)",
  rejected: "var(--nexora-alert)",
};

type Tab = "todas" | "activas" | "pausa" | "borradores" | "archivadas";
const TABS: { key: Tab; label: string; match: (s: StrategyStatus) => boolean }[] = [
  { key: "todas", label: "Todas", match: (s) => s !== "archived" },
  { key: "activas", label: "Activas", match: (s) => s === "active" },
  { key: "pausa", label: "En pausa", match: (s) => s === "paused" },
  { key: "borradores", label: "Borradores", match: (s) => s === "draft" || s === "ready" },
  { key: "archivadas", label: "Archivadas", match: (s) => s === "archived" },
];

function fmtMoney(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}
function fmtCompact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}>
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--nexora-ink-dim)" }}>
        {label}
      </p>
      <p className="mt-1 font-nexora text-2xl font-semibold" style={{ color: "var(--nexora-ink)" }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>{sub}</p>
    </div>
  );
}

export function EstrategiasView({ strategies, kpis }: { strategies: MarketingStrategy[]; kpis: MarketingKpis }) {
  const [tab, setTab] = useState<Tab>("todas");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const active = strategies.filter((s) => s.status === "active").length;
    const paused = strategies.filter((s) => s.status === "paused").length;
    return { active, paused };
  }, [strategies]);

  const filtered = useMemo(() => {
    const matcher = TABS.find((t) => t.key === tab)!.match;
    const q = query.trim().toLowerCase();
    return strategies.filter((s) => matcher(s.status) && (!q || s.name.toLowerCase().includes(q)));
  }, [strategies, tab, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div>
          <h1 className="font-nexora text-2xl" style={{ color: "var(--nexora-ink)" }}>
            Mis estrategias
          </h1>
          <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
            {counts.active} activa{counts.active === 1 ? "" : "s"}, {counts.paused} en pausa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/marketing/conexiones"
            className="aventhra-iridescent-bg inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-black"
          >
            <Plug size={16} />
            Conexiones
          </Link>
          <Link
            href="/admin/marketing/nueva"
            className="aventhra-iridescent-bg inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-black"
          >
            <Plus size={16} />
            Nueva estrategia
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-4 border-b" style={{ borderColor: "var(--nexora-line)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="-mb-px border-b-2 pb-2 text-xs uppercase tracking-wide transition-colors"
            style={{
              borderColor: tab === t.key ? "var(--nexora-nova)" : "transparent",
              color: tab === t.key ? "var(--nexora-ink)" : "var(--nexora-ink-dim)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Importe invertido" value={fmtMoney(kpis.spendCop)} sub="en pauta" />
        <Kpi label="Ventas totales" value={`${kpis.salesCount}`} sub="atribuidas a campañas" />
        <Kpi label="Cuentas alcanzadas" value={fmtCompact(kpis.reach)} sub="personas" />
      </div>

      {/* Búsqueda */}
      <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "var(--nexora-line)" }}>
        <Search size={16} style={{ color: "var(--nexora-ink-dim)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar estrategia..."
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--nexora-ink)" }}
        />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-center"
          style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink-dim)" }}
        >
          <Megaphone size={22} strokeWidth={1.5} />
          <p className="text-sm">
            {strategies.length === 0
              ? "Todavía no tienes estrategias. Crea la primera."
              : "Nada en esta pestaña."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/admin/marketing/${s.id}`}
              className="rounded-2xl border p-5 transition-colors hover:border-white/20"
              style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                  {s.channel ?? "Sin canal"}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                  style={{ color: STATUS_COLOR[s.status], background: "rgba(255,255,255,0.04)" }}
                >
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
              <p className="mt-3 text-[15px] font-medium" style={{ color: "var(--nexora-ink)" }}>
                {s.name}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                {formatShortDate(s.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
