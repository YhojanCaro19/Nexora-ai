"use client";

import { useMemo, useState } from "react";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import type { AutoReportLogEntry } from "@/lib/services/reportHistoryService";
import { formatDateOnly, formatShortDateTime } from "@/lib/utils/date";

type StatusFilter = "all" | "sent" | "failed";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "sent", label: "Enviados" },
  { key: "failed", label: "Fallidos" },
];

export function ReportLogPanel({ entries }: { entries: AutoReportLogEntry[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (!q) return true;
      return e.businessName.toLowerCase().includes(q) || e.sentTo.toLowerCase().includes(q);
    });
  }, [entries, query, statusFilter]);

  const sentCount = entries.filter((e) => e.status === "sent").length;
  const failedCount = entries.filter((e) => e.status === "failed").length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Mismo patrón flex + gap que catálogo/pedidos/clientes — un
          <div className="relative"> con el ícono en absolute y el Input
          con padding-left resultó poco confiable (texto/ícono se
          superponían), un flex row con hijos directos sí funciona. */}
      <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--nexora-line)' }}>
        <Search size={16} className="shrink-0" style={{ color: 'var(--nexora-ink-dim)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por negocio o correo..."
          className="flex-1 min-w-0 bg-transparent text-sm outline-none"
          style={{ color: 'var(--nexora-ink)' }}
        />
      </div>

      <div className="flex items-center justify-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            style={
              statusFilter === f.key
                ? { background: 'var(--nexora-nova)', color: 'var(--nexora-nova-ink)' }
                : { background: 'rgba(238,240,247,0.08)', color: 'var(--nexora-ink-dim)' }
            }
          >
            {f.label}
            {f.key === "sent" && ` (${sentCount})`}
            {f.key === "failed" && ` (${failedCount})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--nexora-ink-dim)' }}>
          No hay envíos que coincidan con la búsqueda.
        </p>
      ) : (
        <div className="divide-y rounded-xl border" style={{ borderColor: 'var(--nexora-line)' }}>
          {filtered.map((entry) => (
            <ReportLogRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportLogRow({ entry }: { entry: AutoReportLogEntry }) {
  const ok = entry.status === "sent";
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      {ok ? (
        <CheckCircle2 size={18} strokeWidth={1.75} className="shrink-0 mt-0.5" style={{ color: 'var(--nexora-nova)' }} />
      ) : (
        <XCircle size={18} strokeWidth={1.75} className="shrink-0 mt-0.5" style={{ color: 'var(--nexora-alert)' }} />
      )}

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--nexora-ink)' }}>
            {entry.businessName}
          </span>
          <span className="shrink-0 text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
            {formatShortDateTime(entry.sentAt)}
          </span>
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--nexora-ink-dim)' }}>
          Reporte del {formatDateOnly(entry.reportDate)} · {entry.sentTo}
        </p>
        {!ok && entry.errorMessage && (
          <p className="text-xs" style={{ color: 'var(--nexora-alert)' }}>
            {entry.errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
