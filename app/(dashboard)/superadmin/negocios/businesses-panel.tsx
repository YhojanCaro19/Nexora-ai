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
        // Lista de filas-cristal, no una tabla: cada negocio es una tarjeta
        // ligera con su monograma (borde en degradado de marca) que se
        // ilumina al pasar el mouse. Las columnas secundarias (dueño, plan,
        // vence) van apareciendo según el ancho; en móvil queda monograma +
        // nombre + estado, y el detalle completo es al tocar.
        <div className="space-y-1.5">
          {filtered.map((b) => (
            <BusinessRow key={b.id} business={b} onClick={() => setSelectedId(b.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Iniciales para el monograma: la primera letra de las dos primeras
// palabras del nombre, o las dos primeras letras si es una sola palabra.
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Monograma del negocio — disco de vidrio con el borde en degradado de
// marca (misma técnica de máscara que las tarjetas de /bienvenida). Le da
// identidad a cada fila sin depender de un logo. Punto rojo si el negocio
// está inhabilitado.
function Monogram({ name, active }: { name: string; active: boolean }) {
  return (
    <span
      className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl"
      style={{ background: "rgba(255,255,255,0.025)" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          padding: 1,
          background: "linear-gradient(140deg, #4CC2E8, #818CF8, #A78BFA, #E879C7)",
          opacity: active ? 0.55 : 0.18,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <span
        className="font-nexora text-[13px] font-semibold"
        style={{ color: active ? "var(--nexora-ink)" : "var(--nexora-ink-dim)" }}
      >
        {initialsOf(name)}
      </span>
      {!active && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full"
          style={{ background: "var(--nexora-alert)", boxShadow: "0 0 0 2.5px #0a0a0f" }}
        />
      )}
    </span>
  );
}

function BusinessRow({ business, onClick }: { business: BusinessWithOwner; onClick: () => void }) {
  const renewal = renewalInfo(business.planRenewsAt);
  const active = business.is_active;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3.5 rounded-xl border border-white/[0.055] bg-white/[0.018] px-3.5 py-3 text-left transition-colors hover:border-white/[0.13] hover:bg-white/[0.04]"
      style={{ opacity: active ? 1 : 0.6 }}
    >
      <Monogram name={business.name} active={active} />

      {/* Negocio + industria */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium" style={{ color: "var(--nexora-ink)" }}>
            {business.name}
          </span>
          {!active && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{ background: "rgba(248,113,113,0.12)", color: "var(--nexora-alert)" }}
            >
              Inhabilitado
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          {industryLabel(business.industry_type)}
        </div>
      </div>

      {/* Dueño — aparece en pantallas grandes */}
      <div className="hidden min-w-0 basis-52 lg:block">
        <div className="truncate text-sm" style={{ color: "var(--nexora-ink)" }}>
          {business.ownerName ?? "Sin nombre"}
        </div>
        {business.ownerEmail && (
          <div
            className="mt-0.5 truncate font-mono-data text-xs"
            style={{ color: "var(--nexora-ink-dim)" }}
          >
            {business.ownerEmail}
          </div>
        )}
      </div>

      {/* Plan */}
      <div className="hidden shrink-0 basis-24 text-right sm:block">
        {business.planKey ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.035)",
              color: "var(--nexora-ink)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#A78BFA" }} />
            {cap(business.planKey)}
          </span>
        ) : (
          <span className="text-[11px]" style={{ color: "rgba(238,240,247,0.32)" }}>
            Sin plan
          </span>
        )}
      </div>

      {/* Vence — solo si hay fecha; si no, nada */}
      <div className="hidden shrink-0 basis-36 text-right xl:block">
        {renewal.empty ? (
          <span className="text-xs" style={{ color: "rgba(238,240,247,0.28)" }}>—</span>
        ) : (
          <span className="flex flex-col text-xs" style={{ color: renewal.color }}>
            <span className="tabular-nums">{renewal.label}</span>
            {renewal.hint && <span className="mt-0.5 text-[11px] opacity-90">{renewal.hint}</span>}
          </span>
        )}
      </div>

      <ChevronRight
        size={16}
        className="shrink-0 opacity-30 transition-all group-hover:translate-x-0.5 group-hover:opacity-70"
        style={{ color: "var(--nexora-ink-dim)" }}
      />
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

