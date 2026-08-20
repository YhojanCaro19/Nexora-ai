"use client";

import { useMemo, useState } from "react";
import { Search, Zap } from "lucide-react";
import type { BusinessAgentUsage } from "@/lib/services/agentUsageService";
import { formatShortDateTime } from "@/lib/utils/date";

const fmt = (n: number) => n.toLocaleString("en-US");

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
        }),
        { tokens: 0, turns: 0 }
      ),
    [usage]
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Resumen de plataforma — dos números grandes, mismo estilo que las
          tarjetas de métricas del Inicio de admin. */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border p-5 text-center" style={{ borderColor: 'var(--nexora-line)' }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
            Tokens totales
          </p>
          <p className="mt-1 text-2xl font-semibold font-nexora" style={{ color: 'var(--nexora-ink)' }}>
            {fmt(totals.tokens)}
          </p>
        </div>
        <div className="rounded-2xl border p-5 text-center" style={{ borderColor: 'var(--nexora-line)' }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
            Turnos del agente
          </p>
          <p className="mt-1 text-2xl font-semibold font-nexora" style={{ color: 'var(--nexora-ink)' }}>
            {fmt(totals.turns)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--nexora-line)' }}>
        <Search size={16} className="shrink-0" style={{ color: 'var(--nexora-ink-dim)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por negocio..."
          className="flex-1 min-w-0 bg-transparent text-sm outline-none"
          style={{ color: 'var(--nexora-ink)' }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--nexora-ink-dim)' }}>
          No hay negocios que coincidan con la búsqueda.
        </p>
      ) : (
        <div className="divide-y rounded-xl border" style={{ borderColor: 'var(--nexora-line)' }}>
          {filtered.map((u) => (
            <ConsumptionRow key={u.businessId} usage={u} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConsumptionRow({ usage }: { usage: BusinessAgentUsage }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <Zap size={18} strokeWidth={1.75} className="shrink-0 mt-0.5" style={{ color: 'var(--nexora-nova)' }} />

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--nexora-ink)' }}>
            {usage.businessName}
          </span>
          <span className="shrink-0 text-sm font-semibold" style={{ color: 'var(--nexora-ink)' }}>
            {fmt(usage.totalTokens)} tokens
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
          {fmt(usage.totalInputTokens)} entrada · {fmt(usage.totalOutputTokens)} salida ·{" "}
          {usage.turnCount} {usage.turnCount === 1 ? "turno" : "turnos"}
        </p>
        <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
          Último uso: {usage.lastUsedAt ? formatShortDateTime(usage.lastUsedAt) : "—"}
        </p>
      </div>
    </div>
  );
}
