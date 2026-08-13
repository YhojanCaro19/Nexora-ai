"use client";

import { useState } from "react";
import { ChevronLeft, Building2, UserCircle } from "lucide-react";
import type { BusinessWithOwner } from "@/lib/services/adminService";
import { industryTypes } from "@/lib/validators/businessSchema";
import { formatShortDateTime } from "@/lib/utils/date";

const industryLabel = (value: string) =>
  industryTypes.find((it) => it.value === value)?.label ?? value;

export function BusinessesPanel({ businesses }: { businesses: BusinessWithOwner[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = businesses.find((b) => b.id === selectedId) ?? null;

  if (selected) {
    return (
      <div className="space-y-8">
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => setSelectedId(null)}
            className="absolute left-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--nexora-ink-dim)' }}
          >
            <ChevronLeft size={16} />
            Volver
          </button>
        </div>

        <div className="text-center space-y-2">
          <h2 className="font-nexora text-3xl font-semibold" style={{ color: 'var(--nexora-ink)' }}>
            {selected.name}
          </h2>
          <span
            className="inline-block rounded-full px-3 py-1 text-xs uppercase tracking-wide"
            style={{ background: 'rgba(238,240,247,0.08)', color: 'var(--nexora-ink-dim)' }}
          >
            {industryLabel(selected.industry_type)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <section
            className="rounded-2xl border p-8 space-y-6 text-center"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="flex flex-col items-center gap-2">
              <Building2 size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
              <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
                Negocio
              </h3>
            </div>
            <div className="space-y-5">
              <InfoRow label="Tipo de negocio" value={industryLabel(selected.industry_type)} />
              <InfoRow label="Cliente desde" value={formatShortDateTime(selected.created_at)} />
            </div>
          </section>

          <section
            className="rounded-2xl border p-8 space-y-6 text-center"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="flex flex-col items-center gap-2">
              <UserCircle size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
              <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
                Administrador
              </h3>
            </div>
            <div className="space-y-5">
              <InfoRow label="Nombre" value={selected.ownerName ?? "—"} />
              <InfoRow label="Correo" value={selected.ownerEmail ?? "—"} />
              <InfoRow label="Teléfono" value={selected.ownerPhone ?? "—"} />
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {businesses.map((b) => (
        <BusinessCard key={b.id} business={b} onClick={() => setSelectedId(b.id)} />
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
        {label}
      </dt>
      <dd className="text-base font-semibold" style={{ color: 'var(--nexora-ink)' }}>
        {value}
      </dd>
    </div>
  );
}

function BusinessCard({ business, onClick }: { business: BusinessWithOwner; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="aspect-square flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all duration-300 hover:scale-105"
      style={{ borderColor: hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)' }}
    >
      <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--nexora-ink-dim)' }}>
        Negocio
      </span>
      <span className="text-lg font-semibold line-clamp-2 px-1 mt-2 text-center" style={{ color: 'var(--nexora-ink)' }}>
        {business.name}
      </span>
    </button>
  );
}
