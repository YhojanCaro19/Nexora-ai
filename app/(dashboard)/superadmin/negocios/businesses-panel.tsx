"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Building2, UserCircle, Activity, Bot, Power, PowerOff, RotateCcw, Search } from "lucide-react";
import { toggleBusinessActiveAction, getBusinessAgentSummaryAction, resetBusinessOnboardingAction } from "./actions";
import type { BusinessWithOwner, BusinessAgentSummary } from "@/lib/services/adminService";
import { industryTypes } from "@/lib/validators/businessSchema";
import { formatShortDateTime } from "@/lib/utils/date";
import { Button } from "@/components/ui/button";

const industryLabel = (value: string) =>
  industryTypes.find((it) => it.value === value)?.label ?? value;

const fmtUsd = (n: number) => (n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

type Tab = "all" | "active" | "inactive";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function BusinessesPanel({ businesses }: { businesses: BusinessWithOwner[] }) {
  const [tab, setTab] = useState<Tab>("active");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = businesses.find((b) => b.id === selectedId) ?? null;

  // BusinessDetail lleva su propio estado local de is_active (para
  // reflejar el toggle sin parpadeo) — revalidatePath ya se encarga de
  // refrescar la lista de atrás cuando se vuelve a "Volver".
  if (selected) {
    return <BusinessDetail business={selected} onBack={() => setSelectedId(null)} />;
  }

  const activeCount = businesses.filter((b) => b.is_active).length;
  const inactiveCount = businesses.length - activeCount;

  const q = norm(query.trim());
  const filtered = businesses
    .filter((b) => (tab === "all" ? true : tab === "active" ? b.is_active : !b.is_active))
    .filter(
      (b) =>
        !q ||
        norm(b.name).includes(q) ||
        norm(b.ownerName ?? "").includes(q) ||
        norm(b.ownerEmail ?? "").includes(q),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const STATE_TABS: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: businesses.length },
    { key: "active", label: "Activos", count: activeCount },
    { key: "inactive", label: "Inhabilitados", count: inactiveCount },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--nexora-ink-dim)' }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por negocio, dueño o correo…"
            className="w-full rounded-full border py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-white/25"
            style={{
              borderColor: 'var(--nexora-line)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--nexora-ink)',
            }}
          />
        </div>

        {/* Filtro de estado — segmentado discreto, en la misma fila que la
            búsqueda (antes eran dos píldoras grandes flotando solas). */}
        <div
          className="flex shrink-0 self-stretch overflow-hidden rounded-full border text-xs sm:self-center"
          style={{ borderColor: 'var(--nexora-line)' }}
        >
          {STATE_TABS.map((t) => {
            const isActiveTab = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="flex-1 whitespace-nowrap px-3.5 py-1.5 font-medium transition-colors sm:flex-none"
                style={
                  isActiveTab
                    ? { background: 'rgba(255,255,255,0.1)', color: 'var(--nexora-ink)' }
                    : { background: 'transparent', color: 'var(--nexora-ink-dim)' }
                }
              >
                {t.label}{' '}
                <span
                  className="font-mono-data tabular-nums"
                  style={{ color: isActiveTab ? 'var(--nexora-ink-dim)' : 'rgba(238,240,247,0.35)' }}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>
          {query.trim() ? "Ningún negocio coincide con la búsqueda." : "No hay negocios en este estado."}
        </p>
      ) : (
        <>
          {/* Desktop — tabla dentro de un panel con su propio scroll horizontal
              (nunca el body). Cabecera en mayúsculas sutiles, filas con zebra
              tenue y separadores suaves. */}
          <div
            className="hidden overflow-hidden rounded-2xl border md:block"
            style={{ borderColor: 'var(--nexora-line)', background: 'var(--nexora-panel)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {["Negocio", "Dueño", "Plan", "Estado", "Vence"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: 'var(--nexora-ink-dim)' }}
                      >
                        {h}
                      </th>
                    ))}
                    <th className="w-10 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filtered.map((b) => (
                    <BusinessTableRow key={b.id} business={b} onClick={() => setSelectedId(b.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Móvil — cards apiladas: una tabla de 6 columnas no cabe en un
              teléfono. */}
          <div className="space-y-2.5 md:hidden">
            {filtered.map((b) => (
              <BusinessCard key={b.id} business={b} onClick={() => setSelectedId(b.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Verde = activo, rojo tenue = inhabilitado. Además del color, etiqueta
// legible — antes solo había un punto sin texto.
function StatusChip({ active }: { active: boolean }) {
  const color = active ? 'var(--nexora-signal)' : 'var(--nexora-alert)';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color, background: active ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
      {active ? 'Activo' : 'Inhabilitado'}
    </span>
  );
}

// "Sin plan" = ausencia (chip fantasma con borde punteado). Un plan real
// tiene más presencia: borde sólido, fondo tenue y punto de acento.
function PlanChip({ planKey }: { planKey: string | null }) {
  if (!planKey) {
    return (
      <span
        className="inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-[11px]"
        style={{ borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(238,240,247,0.4)' }}
      >
        Sin plan
      </span>
    );
  }
  const label = planKey.charAt(0).toUpperCase() + planKey.slice(1);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ borderColor: 'rgba(255,255,255,0.16)', background: 'rgba(238,240,247,0.06)', color: 'var(--nexora-ink)' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--nexora-nova)' }} />
      {label}
    </span>
  );
}

// Fecha sola cuando existe; "—" discreto cuando no hay plan/fecha. Color de
// alerta si ya venció, ámbar si vence pronto.
function RenewalCell({ renewal }: { renewal: ReturnType<typeof renewalInfo> }) {
  if (renewal.empty) {
    return <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>—</span>;
  }
  return (
    <span className="flex flex-col text-xs" style={{ color: renewal.color }}>
      <span>{renewal.label}</span>
      {renewal.hint && <span className="mt-0.5 opacity-80">{renewal.hint}</span>}
    </span>
  );
}

function BusinessTableRow({ business, onClick }: { business: BusinessWithOwner; onClick: () => void }) {
  const renewal = renewalInfo(business.planRenewsAt);
  const hasOwner = Boolean(business.ownerName || business.ownerEmail);
  return (
    <tr
      onClick={onClick}
      className="group cursor-pointer transition-colors even:bg-white/[0.015] hover:bg-white/[0.045]"
      style={{ opacity: business.is_active ? 1 : 0.55 }}
    >
      <td className="px-4 py-3.5 align-top">
        <div className="font-medium leading-tight" style={{ color: 'var(--nexora-ink)' }}>
          {business.name}
        </div>
        <div className="mt-1 text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
          {industryLabel(business.industry_type)}
        </div>
      </td>
      <td className="px-4 py-3.5 align-top">
        {hasOwner ? (
          <>
            <div className="text-sm" style={{ color: 'var(--nexora-ink)' }}>
              {business.ownerName ?? 'Sin nombre'}
            </div>
            {business.ownerEmail && (
              <div
                className="mt-1 max-w-[220px] truncate font-mono-data text-xs"
                style={{ color: 'var(--nexora-ink-dim)' }}
              >
                {business.ownerEmail}
              </div>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--nexora-ink-dim)' }}>—</span>
        )}
      </td>
      <td className="px-4 py-3.5 align-top whitespace-nowrap">
        <PlanChip planKey={business.planKey} />
      </td>
      <td className="px-4 py-3.5 align-top whitespace-nowrap">
        <StatusChip active={business.is_active} />
      </td>
      <td className="px-4 py-3.5 align-top whitespace-nowrap">
        <RenewalCell renewal={renewal} />
      </td>
      <td className="px-4 py-3.5 text-right align-top">
        <ChevronRight
          size={16}
          className="ml-auto opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
          style={{ color: 'var(--nexora-ink-dim)' }}
        />
      </td>
    </tr>
  );
}

// Equivalente móvil de una fila — la tabla no cabe en un teléfono.
function BusinessCard({ business, onClick }: { business: BusinessWithOwner; onClick: () => void }) {
  const renewal = renewalInfo(business.planRenewsAt);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-white/[0.03]"
      style={{
        borderColor: 'var(--nexora-line)',
        background: 'var(--nexora-panel)',
        opacity: business.is_active ? 1 : 0.6,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium" style={{ color: 'var(--nexora-ink)' }}>{business.name}</div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
            {industryLabel(business.industry_type)}
          </div>
        </div>
        <ChevronRight size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--nexora-ink-dim)' }} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusChip active={business.is_active} />
        <PlanChip planKey={business.planKey} />
      </div>

      <div className="space-y-1 text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
        {(business.ownerName || business.ownerEmail) && (
          <div className="truncate">
            {business.ownerName ?? 'Sin nombre'}
            {business.ownerEmail ? <span className="font-mono-data"> · {business.ownerEmail}</span> : null}
          </div>
        )}
        <div>
          Vence:{' '}
          <span style={{ color: renewal.empty ? 'var(--nexora-ink-dim)' : renewal.color }}>
            {renewal.empty ? '—' : renewal.hint ? `${renewal.label} · ${renewal.hint}` : renewal.label}
          </span>
        </div>
      </div>
    </button>
  );
}

// Fila label (izquierda) / valor (derecha) — mismo patrón que
// admin/perfil/profile-panel.tsx (Row), en vez de texto centrado apilado:
// se lee de un vistazo, no hay que ir línea por línea.
function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium" style={{ color: valueColor ?? 'var(--nexora-ink)' }}>
        {value}
      </dd>
    </div>
  );
}

// Para valores largos (personalidad, lista de herramientas) — Row los
// cortaba con "..." y no había forma de leer el resto. Colapsado se ve
// igual que un Row normal (una línea, truncado); al tocarlo despliega el
// texto completo debajo, envuelto en varias líneas.
function ExpandableRow({ label, value }: { label: string; value: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-2.5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-4 text-left">
        <span className="shrink-0 text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>
          {label}
        </span>
        <span className={`min-w-0 flex-1 text-sm font-medium ${open ? "" : "truncate text-right"}`} style={{ color: 'var(--nexora-ink)' }}>
          {value}
        </span>
        <ChevronDown
          size={14}
          className="shrink-0 transition-transform"
          style={{ color: 'var(--nexora-ink-dim)', transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>
    </div>
  );
}

// Card con encabezado (ícono + título) y una `dl` de Rows con divisores —
// mismo bloque reutilizado en las 4 secciones del detalle, en vez de
// repetir el mismo `<section className="rounded-2xl border p-8...">`
// cuatro veces con contenido distinto adentro.
function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border p-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={18} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--nexora-nova)' }}>
          {title}
        </h3>
      </div>
      <dl className="divide-y divide-white/[0.06]">{children}</dl>
    </section>
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
  // ⚠️ TEMPORAL — botón de pruebas de la experiencia de primer ingreso.
  const [resetConfirming, setResetConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetFeed, setResetFeed] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleReset() {
    setResetting(true);
    setResetFeed(null);
    const result = await resetBusinessOnboardingAction(business.id);
    setResetting(false);
    if (result.error) {
      setResetFeed({ ok: false, text: result.error });
      return;
    }
    setResetConfirming(false);
    setResetFeed({ ok: true, text: "Listo. El dueño volverá a /bienvenida en su próximo ingreso." });
  }

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

  const renewal = renewalInfo(business.planRenewsAt);

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
        style={{ color: 'var(--nexora-ink-dim)' }}
      >
        <ChevronLeft size={16} />
        Volver
      </button>

      <div className="text-center space-y-2">
        <h2 className="font-nexora text-2xl md:text-3xl font-semibold" style={{ color: 'var(--nexora-ink)' }}>
          {business.name}
        </h2>
        <span
          className="inline-block rounded-full px-3 py-1 text-xs uppercase tracking-wide"
          style={{ background: 'rgba(238,240,247,0.08)', color: 'var(--nexora-ink-dim)' }}
        >
          {industryLabel(business.industry_type)}
        </span>
      </div>

      {/* Control de acceso — el estado y la confirmación viven en la MISMA
          tarjeta: al tocar "Inhabilitar" se despliega la advertencia + los
          botones acá adentro, sin abrir otra card abajo. */}
      <div className="mx-auto max-w-sm space-y-3">
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: !isActive ? 'rgba(248,113,113,0.35)' : 'var(--nexora-line)',
          }}
        >
          <div className="flex items-center gap-3">
            {isActive ? (
              <Power size={20} strokeWidth={1.5} style={{ color: 'var(--nexora-signal)' }} />
            ) : (
              <PowerOff size={20} strokeWidth={1.5} style={{ color: 'var(--nexora-alert)' }} />
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
                {isActive ? "Negocio activo" : "Negocio inhabilitado"}
              </p>
              <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                {isActive ? "Tiene acceso a la plataforma" : "No puede iniciar sesión ningún miembro"}
              </p>
            </div>
            {!confirming && (
              <Button type="button" variant={isActive ? "outline" : "default"} size="sm" onClick={() => setConfirming(true)}>
                {isActive ? "Inhabilitar" : "Habilitar"}
              </Button>
            )}
          </div>

          {confirming && (
            <div className="mt-3 space-y-3 border-t pt-3 text-center" style={{ borderColor: 'var(--nexora-line)' }}>
              <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                {isActive
                  ? "El admin y los colaboradores de este negocio no podrán iniciar sesión hasta que lo vuelvas a habilitar."
                  : "El negocio recupera el acceso de inmediato."}
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  type="button"
                  variant={isActive ? "destructive" : "default"}
                  size="sm"
                  disabled={toggling}
                  onClick={handleToggle}
                >
                  {toggling ? "Aplicando..." : isActive ? "Inhabilitar" : "Habilitar"}
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={toggling} onClick={() => setConfirming(false)}>
                  Cancelar
                </Button>
              </div>
              {error && <p className="text-xs" style={{ color: 'var(--nexora-alert)' }}>{error}</p>}
            </div>
          )}
        </div>

        {/* ⚠️ TEMPORAL — herramienta de pruebas. Deja el negocio como recién
            provisionado (onboarding_completed=false + borra agent_configs y
            el módulo de Reservas). No toca la cuenta de Google, el catálogo,
            clientes ni créditos. Quitar cuando la experiencia esté cerrada. */}
        <div
          className="rounded-xl border border-dashed p-4 space-y-3"
          style={{ borderColor: 'rgba(238,240,247,0.2)' }}
        >
          <div className="flex items-center gap-3">
            <RotateCcw size={18} strokeWidth={1.5} style={{ color: 'var(--nexora-ink-dim)' }} />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
                Reiniciar onboarding <span style={{ color: 'var(--nexora-ink-dim)' }}>· solo pruebas</span>
              </p>
              <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                Vuelve a mandar al dueño a /bienvenida. Borra la config del agente y de Reservas.
              </p>
            </div>
            {!resetConfirming && (
              <Button type="button" variant="outline" size="sm" onClick={() => setResetConfirming(true)}>
                Reiniciar
              </Button>
            )}
          </div>

          {resetConfirming && (
            <div className="flex justify-center gap-2">
              <Button type="button" variant="destructive" size="sm" disabled={resetting} onClick={handleReset}>
                {resetting ? "Aplicando..." : "Sí, reiniciar"}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={resetting} onClick={() => setResetConfirming(false)}>
                Cancelar
              </Button>
            </div>
          )}
          {resetFeed && (
            <p
              className="text-center text-xs"
              style={{ color: resetFeed.ok ? 'var(--nexora-signal)' : 'var(--nexora-alert)' }}
            >
              {resetFeed.text}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        <DetailSection icon={Building2} title="Negocio">
          <Row label="Tipo de negocio" value={industryLabel(business.industry_type)} />
          <Row label="Cliente desde" value={formatShortDateTime(business.created_at)} />
          <Row label="Plan" value={business.planKey ? business.planKey.charAt(0).toUpperCase() + business.planKey.slice(1) : "Sin plan"} />
          <Row
            label="Vence"
            value={renewal.empty ? "—" : renewal.hint ? `${renewal.label} · ${renewal.hint}` : renewal.label}
            valueColor={renewal.color}
          />
        </DetailSection>

        <DetailSection icon={UserCircle} title="Administrador">
          <Row label="Nombre" value={business.ownerName ?? "—"} />
          <Row label="Correo" value={business.ownerEmail ?? "—"} />
          <Row label="Teléfono" value={business.ownerPhone ?? "—"} />
        </DetailSection>

        <DetailSection icon={Activity} title="Actividad">
          <Row label="Pedidos totales" value={String(business.orderCount)} />
          <Row label="Reservas totales" value={String(business.reservationCount)} />
          <Row label="Clientes" value={String(business.customerCount)} />
          <Row label="Última actividad" value={business.lastActivityAt ? formatShortDateTime(business.lastActivityAt) : "Sin pedidos aún"} />
        </DetailSection>

        <DetailSection icon={Bot} title="Agente">
          <Row label="Tokens consumidos" value={business.agentTokens.toLocaleString("en-US")} />
          <Row label="Costo del agente" value={fmtUsd(business.agentCostUsd)} />
          {agentSummary === undefined ? (
            <p className="py-3 text-center text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>Cargando configuración...</p>
          ) : agentSummary === null ? (
            <p className="py-3 text-center text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
              Este negocio todavía no tiene un agente configurado.
            </p>
          ) : (
            <>
              <Row label="Nombre del agente" value={agentSummary.agentName} />
              <ExpandableRow label="Personalidad" value={agentSummary.personality} />
              <ExpandableRow
                label="Herramientas activas"
                value={agentSummary.enabledToolLabels.length > 0 ? agentSummary.enabledToolLabels.join(", ") : "Ninguna"}
              />
            </>
          )}
        </DetailSection>
      </div>
    </div>
  );
}

// Días de gracia antes del vencimiento en los que ya se avisa en naranja —
// mismo umbral que usa el cron de recordatorios (planRenewalService.ts),
// para que lo que ve el superadmin acá coincida con cuándo se dispara el
// correo automático.
const RENEWAL_WARNING_DAYS = 5;

// Función aparte (no inline en el componente) — mismo patrón que
// matchesDateFilter en admin/pedidos/orders-table.tsx: Date.now() acá no
// dispara la regla de pureza de React porque no vive dentro del cuerpo
// de un componente.
function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

interface RenewalInfo {
  label: string;
  hint: string;
  color: string;
  empty: boolean;
  overdue: boolean;
  soon: boolean;
}

function renewalInfo(renewsAt: string | null): RenewalInfo {
  if (!renewsAt) {
    return { label: "—", hint: "", color: 'var(--nexora-ink-dim)', empty: true, overdue: false, soon: false };
  }
  const daysLeft = daysUntil(renewsAt);
  const overdue = daysLeft < 0;
  const soon = !overdue && daysLeft <= RENEWAL_WARNING_DAYS;
  const hint = overdue
    ? `vencido hace ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? "día" : "días"}`
    : soon
      ? `en ${daysLeft} ${daysLeft === 1 ? "día" : "días"}`
      : "";
  return {
    label: formatShortDateTime(renewsAt),
    hint,
    color: overdue ? 'var(--nexora-alert)' : soon ? '#F5A623' : 'var(--nexora-ink)',
    empty: false,
    overdue,
    soon,
  };
}

