"use client";

import { useMemo, useState } from "react";
import { Search, Zap } from "lucide-react";
import type { BusinessAgentUsage } from "@/lib/services/agentUsageService";
import { formatShortDateTime } from "@/lib/utils/date";

const fmt = (n: number) => n.toLocaleString("en-US");
const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

// Montos chicos (centavos) necesitan 4 decimales para no verse como "$0.00";
// de US$1 en adelante, 2 decimales alcanzan.
const fmtUsd = (n: number) => (n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

export function ConsumptionPanel({ usage }: { usage: BusinessAgentUsage[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return usage;
    return usage.filter((u) => u.businessName.toLowerCase().includes(q));
  }, [usage, query]);

  const totals = useMemo(
    () =>
      usage.reduce(
        (acc, u) => ({
          tokens: acc.tokens + u.totalTokens,
          turns: acc.turns + u.turnCount,
          costUsd: acc.costUsd + u.estimatedCostUsd,
          savingsUsd: acc.savingsUsd + u.cacheSavingsUsd,
          cacheRead: acc.cacheRead + u.totalCacheReadTokens,
          inputFresh: acc.inputFresh + u.totalInputTokens,
        }),
        { tokens: 0, turns: 0, costUsd: 0, savingsUsd: 0, cacheRead: 0, inputFresh: 0 }
      ),
    [usage]
  );

  const globalHitRatio =
    totals.cacheRead + totals.inputFresh > 0
      ? totals.cacheRead / (totals.cacheRead + totals.inputFresh)
      : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Resumen de plataforma. El costo es lo que de verdad importa para
          tarifar; tokens y turnos quedan como contexto de volumen. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Costo estimado" value={fmtUsd(totals.costUsd)} />
        <SummaryCard label="Tokens totales" value={fmt(totals.tokens)} />
        <SummaryCard label="Turnos del agente" value={fmt(totals.turns)} />
      </div>

      <p className="text-xs text-center" style={{ color: "var(--nexora-ink-dim)" }}>
        Costo a precio de lista de Anthropic — no incluye descuentos ni Batch API.{" "}
        {totals.savingsUsd > 0 ? (
          <>
            Caché de prompt: <strong style={{ color: "var(--nexora-signal)" }}>ahorrando {fmtUsd(totals.savingsUsd)}</strong>{" "}
            ({pct(globalHitRatio)} de la entrada servida desde caché).
          </>
        ) : (
          <>
            Caché de prompt: <strong style={{ color: "var(--nexora-alert)" }}>sin efecto todavía</strong> (0% servido
            desde caché — normal en conversaciones cortas o de un solo turno).
          </>
        )}
      </p>

      <div
        className="flex items-center gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: "var(--nexora-line)" }}
      >
        <Search size={16} className="shrink-0" style={{ color: "var(--nexora-ink-dim)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por negocio..."
          className="flex-1 min-w-0 bg-transparent text-sm outline-none"
          style={{ color: "var(--nexora-ink)" }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: "var(--nexora-ink-dim)" }}>
          No hay negocios que coincidan con la búsqueda.
        </p>
      ) : (
        <div className="divide-y rounded-xl border" style={{ borderColor: "var(--nexora-line)" }}>
          {filtered.map((u) => (
            <ConsumptionRow key={u.businessId} usage={u} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-5 text-center" style={{ borderColor: "var(--nexora-line)" }}>
      <p className="text-xs uppercase tracking-wide" style={{ color: "var(--nexora-ink-dim)" }}>
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-semibold font-nexora"
        style={{ color: "var(--nexora-ink)" }}
      >
        {value}
      </p>
    </div>
  );
}

function ConsumptionRow({ usage }: { usage: BusinessAgentUsage }) {
  const cacheWorking = usage.totalCacheReadTokens > 0;

  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <Zap
        size={18}
        strokeWidth={1.75}
        className="shrink-0 mt-0.5"
        style={{ color: "var(--nexora-nova)" }}
      />

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold truncate" style={{ color: "var(--nexora-ink)" }}>
            {usage.businessName}
          </span>
          <span
            className="shrink-0 text-sm font-semibold"
            style={{ color: "var(--nexora-ink)" }}
          >
            {fmtUsd(usage.estimatedCostUsd)}
          </span>
        </div>

        <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          {fmt(usage.totalInputTokens)} entrada · {fmt(usage.totalCacheReadTokens)} caché ·{" "}
          {fmt(usage.totalOutputTokens)} salida · {usage.turnCount}{" "}
          {usage.turnCount === 1 ? "turno" : "turnos"}
        </p>

        <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          {cacheWorking ? (
            <>
              <span style={{ color: "var(--nexora-signal)" }}>{pct(usage.cacheHitRatio)} desde caché</span>
              {usage.cacheSavingsUsd > 0 && <> · ahorro {fmtUsd(usage.cacheSavingsUsd)}</>}
            </>
          ) : (
            <span style={{ color: "var(--nexora-alert)" }}>caché sin efecto (0% reutilizado)</span>
          )}
          {usage.totalTokens > 0 && (
            <> · {fmt(usage.totalTokens)} tokens totales</>
          )}
        </p>

        <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          {usage.model ?? "modelo desconocido"} · último uso:{" "}
          {usage.lastUsedAt ? formatShortDateTime(usage.lastUsedAt) : "—"}
        </p>
      </div>
    </div>
  );
}
