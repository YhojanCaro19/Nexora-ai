"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { BusinessWithOwner } from "@/lib/services/adminService";
import { industryTypes } from "@/lib/validators/businessSchema";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const industryLabel = (value: string) =>
  industryTypes.find((it) => it.value === value)?.label ?? value;

export function BusinessesPanel({ businesses }: { businesses: BusinessWithOwner[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = businesses.find((b) => b.id === selectedId) ?? null;

  return (
    <Card>
      <CardContent className="space-y-2">
        {selected ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedId(null)}
              className="text-sm underline"
              style={{ color: 'var(--nexora-ink-dim)' }}
            >
              ← Volver
            </button>

            <h2 className="font-nexora text-lg" style={{ color: 'var(--nexora-ink)' }}>
              {selected.name}
            </h2>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
                  Tipo de negocio
                </dt>
                <dd style={{ color: 'var(--nexora-ink)' }}>{industryLabel(selected.industry_type)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
                  Cliente desde
                </dt>
                <dd style={{ color: 'var(--nexora-ink)' }}>{dateFormatter.format(new Date(selected.created_at))}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
                  Administrador
                </dt>
                <dd style={{ color: 'var(--nexora-ink)' }}>{selected.ownerName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
                  Correo
                </dt>
                <dd style={{ color: 'var(--nexora-ink)' }}>{selected.ownerEmail ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
                  Teléfono
                </dt>
                <dd style={{ color: 'var(--nexora-ink)' }}>{selected.ownerPhone ?? "—"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          businesses.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className="w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <span className="font-medium" style={{ color: 'var(--nexora-ink)' }}>
                Negocio: {b.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                {dateFormatter.format(new Date(b.created_at))}
              </span>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
