"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import type { PlatformAdminActionEntry } from "@/lib/services/auditLogService";
import { formatShortDateTime } from "@/lib/utils/date";

export function AuditLogPanel({ entries }: { entries: PlatformAdminActionEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.adminEmail.toLowerCase().includes(q) ||
        e.targetBusinessName?.toLowerCase().includes(q) ||
        e.detail?.toLowerCase().includes(q)
    );
  }, [entries, query]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--nexora-line)' }}>
        <Search size={16} className="shrink-0" style={{ color: 'var(--nexora-ink-dim)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por negocio o correo del superadmin..."
          className="flex-1 min-w-0 bg-transparent text-sm outline-none"
          style={{ color: 'var(--nexora-ink)' }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--nexora-ink-dim)' }}>
          No hay acciones que coincidan con la búsqueda.
        </p>
      ) : (
        <div className="divide-y rounded-xl border" style={{ borderColor: 'var(--nexora-line)' }}>
          {filtered.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 px-4 py-3.5">
              <ShieldCheck size={18} strokeWidth={1.75} className="shrink-0 mt-0.5" style={{ color: 'var(--nexora-nova)' }} />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--nexora-ink)' }}>
                    {entry.actionLabel} {entry.targetBusinessName ?? entry.detail ?? ""}
                  </span>
                  <span className="shrink-0 text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                    {formatShortDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--nexora-ink-dim)' }}>
                  {entry.adminEmail}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
