"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Building2, UserCircle, Activity, Bot, Power, PowerOff } from "lucide-react";
import { toggleBusinessActiveAction, getBusinessAgentSummaryAction } from "./actions";
import type { BusinessWithOwner, BusinessAgentSummary } from "@/lib/services/adminService";
import { industryTypes } from "@/lib/validators/businessSchema";
import { formatShortDateTime } from "@/lib/utils/date";
import { InfoRow } from "@/components/dashboard/shared/InfoRow";

const industryLabel = (value: string) =>
  industryTypes.find((it) => it.value === value)?.label ?? value;

type Tab = "active" | "inactive";

export function BusinessesPanel({ businesses }: { businesses: BusinessWithOwner[] }) {
  const [tab, setTab] = useState<Tab>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = businesses.find((b) => b.id === selectedId) ?? null;

  const filtered = businesses.filter((b) => (tab === "active" ? b.is_active : !b.is_active));
  const activeCount = businesses.filter((b) => b.is_active).length;
  const inactiveCount = businesses.length - activeCount;

  if (selected) {
    // BusinessDetail lleva su propio estado local de is_active (para
    // reflejar el toggle sin parpadeo) — revalidatePath ya se encarga de
    // refrescar la lista de atrás cuando se vuelve a "Volver".
    return <BusinessDetail business={selected} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setTab("active")}
          className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          style={
            tab === "active"
              ? { background: 'var(--nexora-nova)', color: 'var(--nexora-nova-ink)' }
              : { background: 'rgba(238,240,247,0.08)', color: 'var(--nexora-ink-dim)' }
          }
        >
          Activos ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setTab("inactive")}
          className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          style={
            tab === "inactive"
              ? { background: 'var(--nexora-nova)', color: 'var(--nexora-nova-ink)' }
              : { background: 'rgba(238,240,247,0.08)', color: 'var(--nexora-ink-dim)' }
          }
        >
          Inhabilitados ({inactiveCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--nexora-ink-dim)' }}>
          {tab === "active" ? "No hay negocios activos." : "No hay negocios inhabilitados."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((b) => (
            <BusinessCard key={b.id} business={b} onClick={() => setSelectedId(b.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function BusinessDetail({
  business,
  onBack,
}: {
  business: BusinessWithOwner;
  onBack: () => void;
}) {
  const [isActive, setIsActive] = useState(business.is_active);
  const [confirming, setConfirming] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentSummary, setAgentSummary] = useState<BusinessAgentSummary | null | undefined>(undefined);

  useEffect(() => {
    getBusinessAgentSummaryAction(business.id).then(setAgentSummary);
  }, [business.id]);

  async function handleToggle() {
    setToggling(true);
    setError(null);
    const result = await toggleBusinessActiveAction(business.id, !isActive);
    setToggling(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setIsActive(!isActive);
    setConfirming(false);
  }

  return (
    <div className="space-y-8">
      <div className="relative flex items-center justify-center">
        <button
          onClick={onBack}
          className="absolute left-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
          style={{ color: 'var(--nexora-ink-dim)' }}
        >
          <ChevronLeft size={16} />
          Volver
        </button>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            title={isActive ? "Inhabilitar este negocio" : "Habilitar este negocio"}
            aria-label={isActive ? "Inhabilitar este negocio" : "Habilitar este negocio"}
            className="absolute right-0 inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors"
            style={
              isActive
                ? { color: 'var(--nexora-alert)' }
                : { color: 'var(--nexora-signal)' }
            }
          >
            {isActive ? <PowerOff size={17} strokeWidth={1.5} /> : <Power size={17} strokeWidth={1.5} />}
          </button>
        ) : null}
      </div>

      <div className="text-center space-y-2">
        <h2 className="font-nexora text-3xl font-semibold" style={{ color: 'var(--nexora-ink)' }}>
          {business.name}
        </h2>
        <div className="flex items-center justify-center gap-2">
          <span
            className="inline-block rounded-full px-3 py-1 text-xs uppercase tracking-wide"
            style={{ background: 'rgba(238,240,247,0.08)', color: 'var(--nexora-ink-dim)' }}
          >
            {industryLabel(business.industry_type)}
          </span>
          <span
            className="inline-block rounded-full px-3 py-1 text-xs uppercase tracking-wide"
            style={
              isActive
                ? { background: 'rgba(52,211,153,0.12)', color: 'var(--nexora-signal)' }
                : { background: 'rgba(248,113,113,0.12)', color: 'var(--nexora-alert)' }
            }
          >
            {isActive ? "Activo" : "Inhabilitado"}
          </span>
        </div>
      </div>

      {confirming && (
        <div className="max-w-sm mx-auto space-y-2 text-center">
          <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
            {isActive
              ? "El admin y los colaboradores de este negocio no podrán iniciar sesión hasta que lo vuelvas a habilitar."
              : "El negocio recupera el acceso de inmediato."}
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              disabled={toggling}
              onClick={handleToggle}
              className="rounded-full px-4 py-1.5 text-xs font-medium"
              style={
                isActive
                  ? { background: 'rgba(248,113,113,0.12)', color: 'var(--nexora-alert)' }
                  : { background: 'rgba(52,211,153,0.12)', color: 'var(--nexora-signal)' }
              }
            >
              {toggling ? "Aplicando..." : isActive ? "Inhabilitar" : "Habilitar"}
            </button>
            <button
              type="button"
              disabled={toggling}
              onClick={() => setConfirming(false)}
              className="rounded-full px-4 py-1.5 text-xs font-medium"
              style={{ background: 'rgba(238,240,247,0.08)', color: 'var(--nexora-ink-dim)' }}
            >
              Cancelar
            </button>
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--nexora-alert)' }}>{error}</p>}
        </div>
      )}

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
            <InfoRow label="Tipo de negocio" value={industryLabel(business.industry_type)} />
            <InfoRow label="Cliente desde" value={formatShortDateTime(business.created_at)} />
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
            <InfoRow label="Nombre" value={business.ownerName ?? "—"} />
            <InfoRow label="Correo" value={business.ownerEmail ?? "—"} />
            <InfoRow label="Teléfono" value={business.ownerPhone ?? "—"} />
          </div>
        </section>

        <section
          className="rounded-2xl border p-8 space-y-6 text-center"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex flex-col items-center gap-2">
            <Activity size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
            <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
              Actividad
            </h3>
          </div>
          <div className="space-y-5">
            <InfoRow label="Pedidos totales" value={String(business.orderCount)} />
            <InfoRow label="Clientes" value={String(business.customerCount)} />
            <InfoRow label="Tokens consumidos" value={business.agentTokens.toLocaleString("en-US")} />
            <InfoRow
              label="Última actividad"
              value={business.lastActivityAt ? formatShortDateTime(business.lastActivityAt) : "Sin pedidos aún"}
            />
          </div>
        </section>

        <section
          className="rounded-2xl border p-8 space-y-6 text-center"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex flex-col items-center gap-2">
            <Bot size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
            <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
              Agente
            </h3>
          </div>
          {agentSummary === undefined ? (
            <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>Cargando...</p>
          ) : agentSummary === null ? (
            <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
              Este negocio todavía no tiene un agente configurado.
            </p>
          ) : (
            <div className="space-y-5">
              <InfoRow label="Nombre del agente" value={agentSummary.agentName} />
              <InfoRow label="Personalidad" value={agentSummary.personality} />
              <InfoRow
                label="Herramientas activas"
                value={agentSummary.enabledToolLabels.length > 0 ? agentSummary.enabledToolLabels.join(", ") : "Ninguna"}
              />
            </div>
          )}
        </section>
      </div>
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
      style={{
        borderColor: hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)',
        opacity: business.is_active ? 1 : 0.55,
      }}
    >
      <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--nexora-ink-dim)' }}>
        {business.is_active ? "Negocio" : "Inhabilitado"}
      </span>
      <span className="text-lg font-semibold line-clamp-2 px-1 mt-2 text-center" style={{ color: 'var(--nexora-ink)' }}>
        {business.name}
      </span>
    </button>
  );
}
