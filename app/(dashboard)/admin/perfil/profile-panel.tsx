"use client";

// Perfil tipo SaaS — sin card de fondo. Un encabezado fijo (foto + nombre
// + rol + correo) y una lista de secciones con el patrón "tocar y entrar"
// que ya usa el resto del panel (catalogo-panel, mi-agente-panel): tocar
// una fila la reemplaza por su vista con un botón Volver, nunca acordeón.
import { useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  User,
  IdCard,
  KeyRound,
  CreditCard,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Languages,
  Share2,
  type LucideIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneField } from "@/components/shared/PhoneField";
import { formatShortDate, formatShortDateTime } from "@/lib/utils/date";
import { setLocale } from "@/app/actions/locale";
import type { Locale } from "@/i18n/locales";
import { AvatarEditor } from "./avatar-editor";
import { SignOutAllDevices } from "./sign-out-all-devices";
import { ActiveSessionsPreview } from "./active-sessions-preview";
import {
  updateOwnProfileAction,
  requestAccountChangeAction,
  cancelAccountChangeAction,
} from "./actions";
import type { ProfileDetails } from "@/lib/services/profileService";
import type { LoginEvent } from "@/lib/services/loginEventService";
import type { ProfileSecurityEvent } from "@/lib/services/profileSecurityLogService";
import type { AccessChangeEligibility } from "@/lib/services/accountChangeService";
import type { BillingSummary } from "@/lib/services/creditService";
import type { OwnAgentUsage } from "@/lib/services/agentUsageService";
import type { ChannelConnectionPublic } from "@/lib/types/channel";
import { ConnectNetworksSection } from "./connect-networks-section";
import { industryTypes } from "@/lib/validators/businessSchema";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  colaborador: "Colaborador",
  superadmin: "Superadmin",
};

const industryLabel = (value: string) =>
  industryTypes.find((it) => it.value === value)?.label ?? value;

const SECURITY_EVENT_LABELS: Record<string, string> = {
  password_changed: "Contraseña cambiada",
  signed_out_all_devices: "Cerró sesión en todos los dispositivos",
  avatar_updated: "Actualizó su foto de perfil",
  profile_updated: "Actualizó su nombre o teléfono",
  collaborator_added: "Agregó un colaborador",
  collaborator_updated: "Editó los datos de un colaborador",
  collaborator_deactivated: "Desactivó a un colaborador",
  collaborator_reactivated: "Reactivó a un colaborador",
  collaborator_removed: "Eliminó a un colaborador",
  report_downloaded: "Descargó un reporte",
  account_change_requested: "Pidió cambiar su cuenta de acceso",
  session_device_mismatch: "Sesión cerrada: se intentó usar desde otro dispositivo",
};

type SectionKey =
  | "personal"
  | "account"
  | "access-change"
  | "connect-networks"
  | "billing"
  | "sign-out-all"
  | "login-history"
  | "security-history"
  | "preferences";

interface ProfilePanelProps {
  details: ProfileDetails;
  loginEvents: LoginEvent[];
  securityEvents: ProfileSecurityEvent[];
  billing: BillingSummary | null;
  agentUsage: OwnAgentUsage | null;
  accessChange: AccessChangeEligibility;
  currentLocale: Locale;
  canManageBilling: boolean;
  channelConnections: ChannelConnectionPublic[];
  canManageChannels: boolean;
}

// ---------- helpers de layout ----------

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="shrink-0 text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
        {label}
      </dt>
      <dd
        className={`min-w-0 truncate text-right text-sm font-medium${mono ? " font-mono-data" : ""}`}
        style={{ color: "var(--nexora-ink)" }}
      >
        {value}
      </dd>
    </div>
  );
}

function SectionView({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        <ChevronLeft size={16} />
        Volver
      </button>
      <h2
        className="text-center font-nexora text-base font-semibold"
        style={{ color: "var(--nexora-ink)" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

// ---------- secciones ----------

function PersonalDataSection({ details }: { details: ProfileDetails }) {
  const [fullName, setFullName] = useState(details.fullName);
  const [phone, setPhone] = useState(details.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const hasChanges = fullName.trim() !== details.fullName || phone !== (details.phone ?? "");

  async function save() {
    setSaving(true);
    setError(null);
    const result = await updateOwnProfileAction({ fullName: fullName.trim(), phone });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-xs space-y-4">
      {error && (
        <p
          className="rounded-lg border p-3 text-center text-sm"
          style={{ borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "var(--nexora-alert)" }}
        >
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="fullName" className="block text-center">
          Nombre
        </Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            setSaved(false);
          }}
          className="text-center"
        />
      </div>

      <PhoneField
        label="Teléfono"
        defaultValue={phone || undefined}
        onChange={(value) => {
          setPhone(value);
          setSaved(false);
        }}
      />

      <div className="flex flex-col items-center gap-2 pt-1">
        <Button
          type="button"
          disabled={saving || !hasChanges || fullName.trim().length < 2}
          onClick={save}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
        {saved && (
          <span className="text-xs" style={{ color: "var(--nexora-signal)" }}>
            Guardado
          </span>
        )}
      </div>
    </div>
  );
}

function AccountInfoSection({ details }: { details: ProfileDetails }) {
  return (
    <dl className="mx-auto max-w-sm divide-y divide-white/[0.06]">
      <Row label="Correo de acceso" value={details.email ?? "—"} mono />
      <Row label="Rol" value={ROLE_LABELS[details.role] ?? details.role} />
      {details.businessName && <Row label="Negocio" value={details.businessName} />}
      {details.industryType && (
        <Row label="Tipo de negocio" value={industryLabel(details.industryType)} />
      )}
      <Row
        label="Último acceso"
        value={details.lastSignInAt ? formatShortDateTime(details.lastSignInAt) : "—"}
      />
      <Row
        label="Miembro desde"
        value={details.memberSince ? formatShortDateTime(details.memberSince) : "—"}
      />
    </dl>
  );
}

function AccessChangeSection({
  details,
  accessChange,
}: {
  details: ProfileDetails;
  accessChange: AccessChangeEligibility;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const pending = accessChange.pendingRequest;

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await requestAccountChangeAction({ requestedEmail: email.trim(), reason: reason.trim() });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  async function cancel() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    const result = await cancelAccountChangeAction(pending.id);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (pending) {
    return (
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          Tienes una solicitud en revisión para cambiar tu cuenta de acceso a:
        </p>
        <p className="font-mono-data text-sm" style={{ color: "var(--nexora-ink)" }}>
          {pending.requestedEmail}
        </p>
        <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          Enviada el {formatShortDateTime(pending.createdAt)}. Nuestro equipo va a
          verificar tu identidad por teléfono antes de aplicarla.
        </p>
        {error && (
          <p className="text-xs" style={{ color: "var(--nexora-alert)" }}>
            {error}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={cancel}>
          {busy ? "..." : "Cancelar solicitud"}
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm space-y-2 text-center">
        <p className="text-sm font-semibold" style={{ color: "var(--nexora-signal)" }}>
          Solicitud enviada
        </p>
        <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          Te contactaremos al teléfono registrado para verificar tu identidad.
        </p>
      </div>
    );
  }

  if (accessChange.nextEligibleAt) {
    return (
      <p className="mx-auto max-w-sm text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
        Solo se puede cambiar la cuenta de acceso una vez al año. Podrás pedir otro
        cambio a partir del{" "}
        <span style={{ color: "var(--nexora-ink)" }}>{formatShortDate(accessChange.nextEligibleAt)}</span>.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <p className="text-center text-xs leading-relaxed" style={{ color: "var(--nexora-ink-dim)" }}>
        Se entra con &ldquo;Continuar con Google&rdquo;, así que el correo es tu llave de
        acceso. No se cambia solo: envías esta solicitud, verificamos tu identidad
        por teléfono y el equipo aplica el cambio. Máximo 1 vez al año. El correo
        nuevo <strong>debe ser una cuenta de Google</strong>.
      </p>

      {error && (
        <p
          className="rounded-lg border p-3 text-center text-sm"
          style={{ borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "var(--nexora-alert)" }}
        >
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="newEmail" className="block text-center">
          Correo nuevo
        </Label>
        <Input
          id="newEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucuenta@gmail.com"
          className="text-center"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason" className="block text-center">
          Motivo
        </Label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Perdí el acceso a mi correo actual…"
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-center text-sm"
          style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
        />
      </div>

      <div className="flex justify-center pt-1">
        <Button
          type="button"
          disabled={busy || !email.trim() || reason.trim().length < 10}
          onClick={submit}
        >
          {busy ? "Enviando..." : "Enviar solicitud"}
        </Button>
      </div>

      <p className="text-center text-[11px]" style={{ color: "var(--nexora-ink-dim)" }}>
        Correo actual: <span className="font-mono-data">{details.email}</span>
      </p>
    </div>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="pt-4 pb-1 text-center text-[11px] font-semibold uppercase tracking-wide"
      style={{ color: "var(--nexora-ink-dim)" }}
    >
      {children}
    </p>
  );
}

function BillingSection({
  billing,
  agentUsage,
  canManageBilling,
}: {
  billing: BillingSummary | null;
  agentUsage: OwnAgentUsage | null;
  canManageBilling: boolean;
}) {
  if (!billing) {
    return (
      <p className="text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
        No hay información de plan para esta cuenta.
      </p>
    );
  }

  const ent = billing.entitlements;
  const hasUsage = agentUsage && agentUsage.replyCount > 0;

  return (
    <div className="mx-auto max-w-sm space-y-5">
      <dl className="divide-y divide-white/[0.06]">
        <Row label="Plan" value={billing.planName ?? "—"} />
        {billing.renewsAt && <Row label="Renueva el" value={formatShortDate(billing.renewsAt)} />}

        {ent && (
          <>
            <GroupLabel>Incluido cada mes</GroupLabel>
            {ent.agentConversations > 0 && (
              <Row
                label="Conversaciones del agente"
                value={ent.agentConversations.toLocaleString("es-CO")}
              />
            )}
            {ent.campaigns > 0 && (
              <Row label="Campañas de marketing" value={ent.campaigns.toLocaleString("es-CO")} />
            )}
            {ent.images > 0 && (
              <Row label="Imágenes con IA" value={ent.images.toLocaleString("es-CO")} />
            )}
            {ent.monthlyCredits > 0 && (
              <Row
                label="Créditos de respaldo"
                value={ent.monthlyCredits.toLocaleString("es-CO")}
              />
            )}
            <Row
              label="Negocios"
              value={ent.maxBusinesses <= 1 ? "1" : `Hasta ${ent.maxBusinesses}`}
            />
            {ent.maxCollaborators != null && (
              <Row label="Colaboradores" value={`Hasta ${ent.maxCollaborators}`} />
            )}
          </>
        )}

        {billing.credits && (
          <>
            <GroupLabel>Créditos disponibles ahora</GroupLabel>
            <Row label="Total" value={billing.credits.total.toLocaleString("es-CO")} />
            {billing.credits.topup > 0 && (
              <Row label="En recargas" value={billing.credits.topup.toLocaleString("es-CO")} />
            )}
          </>
        )}

        {agentUsage && (
          <>
            <GroupLabel>Consumo del agente · últimos {agentUsage.windowDays} días</GroupLabel>
            {hasUsage ? (
              <>
                <Row
                  label="Conversaciones"
                  value={agentUsage.conversationCount.toLocaleString("es-CO")}
                />
                <Row
                  label="Mensajes respondidos"
                  value={agentUsage.replyCount.toLocaleString("es-CO")}
                />
                <Row
                  label="Entrada"
                  value={agentUsage.totalInputTokens.toLocaleString("es-CO")}
                  mono
                />
                <Row
                  label="Salida"
                  value={agentUsage.totalOutputTokens.toLocaleString("es-CO")}
                  mono
                />
                <Row
                  label="Caché · lectura"
                  value={agentUsage.totalCacheReadTokens.toLocaleString("es-CO")}
                  mono
                />
                <Row
                  label="Caché · escritura"
                  value={agentUsage.totalCacheCreationTokens.toLocaleString("es-CO")}
                  mono
                />
                <Row
                  label="Total de tokens"
                  value={agentUsage.totalTokens.toLocaleString("es-CO")}
                  mono
                />
                {agentUsage.lastUsedAt && (
                  <Row
                    label="Última actividad"
                    value={formatShortDateTime(agentUsage.lastUsedAt)}
                  />
                )}
              </>
            ) : (
              <p
                className="py-3 text-center text-xs"
                style={{ color: "var(--nexora-ink-dim)" }}
              >
                Tu agente no ha respondido mensajes en los últimos {agentUsage.windowDays} días.
              </p>
            )}
          </>
        )}
      </dl>

      {canManageBilling && (
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/admin/creditos" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ver créditos
          </Link>
        </div>
      )}
    </div>
  );
}

function describeUserAgent(userAgent: string | null): string {
  if (!userAgent || userAgent === "unknown") return "Inicio de sesión";
  let os = "";
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac OS X") || userAgent.includes("Macintosh")) os = "macOS";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("Linux")) os = "Linux";
  let browser = "";
  if (userAgent.includes("Edg/")) browser = "Edge";
  else if (userAgent.includes("OPR/") || userAgent.includes("Opera")) browser = "Opera";
  else if (userAgent.includes("Firefox/")) browser = "Firefox";
  else if (userAgent.includes("Chrome/")) browser = "Chrome";
  else if (userAgent.includes("Safari/")) browser = "Safari";
  const both = [browser, os].filter(Boolean).join(" en ");
  return both ? `Inicio de sesión · ${both}` : "Inicio de sesión";
}

// Historial de seguridad = línea de tiempo unificada: inicios de sesión +
// eventos propios (perfil, foto, cierre global) + accesos sensibles a
// datos del negocio (colaboradores, reportes). Todo ordenado por fecha.
function SecurityHistorySection({
  events,
  loginEvents,
}: {
  events: ProfileSecurityEvent[];
  loginEvents: LoginEvent[];
}) {
  const items = [
    ...loginEvents.map((l) => ({
      id: `login-${l.id}`,
      label: describeUserAgent(l.userAgent),
      detail: l.ip,
      createdAt: l.createdAt,
      alert: false,
    })),
    ...events.map((e) => ({
      id: e.id,
      label: SECURITY_EVENT_LABELS[e.eventType] ?? e.eventType,
      detail: null as string | null,
      createdAt: e.createdAt,
      alert: e.eventType === "session_device_mismatch",
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  if (items.length === 0) {
    return (
      <p className="text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
        Todavía no hay eventos de seguridad.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-2">
      {items.map((it) => (
        <div
          key={it.id}
          className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
          style={{
            borderColor: it.alert ? "rgba(248,113,113,0.35)" : "rgba(255,255,255,0.1)",
            background: it.alert ? "rgba(248,113,113,0.07)" : "rgba(255,255,255,0.02)",
          }}
        >
          <span
            className="min-w-0 text-sm"
            style={{ color: it.alert ? "var(--nexora-alert)" : "var(--nexora-ink)" }}
          >
            {it.label}
          </span>
          <span className="shrink-0 text-right text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            {formatShortDateTime(it.createdAt)}
            {it.detail ? ` · ${it.detail}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function PreferencesSection({ currentLocale }: { currentLocale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(next: Locale) {
    if (next === currentLocale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="flex justify-center gap-2">
        {(["es", "en"] as Locale[]).map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => pick(loc)}
            disabled={pending}
            className="rounded-lg border px-4 py-2 text-sm uppercase transition-colors disabled:opacity-50"
            style={
              loc === currentLocale
                ? { borderColor: "var(--nexora-nova)", color: "var(--nexora-ink)", background: "rgba(255,255,255,0.04)" }
                : { borderColor: "var(--nexora-line)", color: "var(--nexora-ink-dim)" }
            }
          >
            {loc === "es" ? "Español" : "English"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- panel ----------

export function ProfilePanel({
  details,
  loginEvents,
  securityEvents,
  billing,
  agentUsage,
  accessChange,
  currentLocale,
  canManageBilling,
  channelConnections,
  canManageChannels,
}: ProfilePanelProps) {
  const searchParams = useSearchParams();
  // El callback de OAuth vuelve a /admin/perfil?connected=… o ?error=… —
  // en ese caso se abre directo la sección de redes, no la lista.
  const cameBackFromOAuth =
    canManageChannels &&
    (searchParams.has("connected") || searchParams.has("error"));
  const [view, setView] = useState<SectionKey | "list">(
    cameBackFromOAuth ? "connect-networks" : "list"
  );

  const activeChannels = channelConnections.filter((c) => c.status === "active").length;
  const channelsNeedAttention = channelConnections.some(
    (c) => c.status === "error" || c.status === "expired"
  );

  const rows: { key: SectionKey; label: string; icon: LucideIcon; hint?: string }[] = [
    { key: "personal", label: "Datos personales", icon: User },
    { key: "account", label: "Información de la cuenta", icon: IdCard },
    {
      key: "access-change",
      label: "Cambiar cuenta de acceso",
      icon: KeyRound,
      hint: accessChange.pendingRequest ? "En revisión" : undefined,
    },
    ...(canManageChannels
      ? [
          {
            key: "connect-networks" as const,
            label: "Conectar redes",
            icon: Share2,
            hint: channelsNeedAttention
              ? "Reconectar"
              : activeChannels > 0
                ? `${activeChannels} conectada${activeChannels > 1 ? "s" : ""}`
                : undefined,
          },
        ]
      : []),
    ...(billing ? [{ key: "billing" as const, label: "Plan y facturación", icon: CreditCard }] : []),
    { key: "sign-out-all", label: "Cerrar sesión en todos los dispositivos", icon: LogOut },
    { key: "login-history", label: "Inicios de sesión", icon: MonitorSmartphone },
    { key: "security-history", label: "Historial de seguridad", icon: ShieldCheck },
    { key: "preferences", label: "Idioma", icon: Languages },
  ];

  const titleFor = (k: SectionKey) => rows.find((r) => r.key === k)?.label ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Encabezado — sin card */}
      <div className="flex flex-col items-center gap-3">
        <AvatarEditor initialUrl={details.avatarUrl} name={details.fullName} />
        <div className="text-center">
          <p className="font-nexora text-lg font-semibold" style={{ color: "var(--nexora-ink)" }}>
            {details.fullName}
          </p>
          <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
            {ROLE_LABELS[details.role] ?? details.role}
            {details.email ? ` · ${details.email}` : ""}
          </p>
        </div>
      </div>

      {view === "list" ? (
        <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border" style={{ borderColor: "var(--nexora-line)" }}>
          {rows.map(({ key, label, icon: Icon, hint }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.03]"
            >
              <Icon size={16} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />
              <span className="min-w-0 flex-1 text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>
                {label}
              </span>
              {hint && (
                <span
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{ color: "var(--nexora-nova)", background: "rgba(255,255,255,0.06)" }}
                >
                  {hint}
                </span>
              )}
              <ChevronRight size={16} strokeWidth={1.75} style={{ color: "var(--nexora-ink-dim)" }} />
            </button>
          ))}
        </div>
      ) : (
        <SectionView title={titleFor(view)} onBack={() => setView("list")}>
          {view === "personal" && <PersonalDataSection details={details} />}
          {view === "account" && <AccountInfoSection details={details} />}
          {view === "access-change" && (
            <AccessChangeSection details={details} accessChange={accessChange} />
          )}
          {view === "connect-networks" && (
            <ConnectNetworksSection connections={channelConnections} />
          )}
          {view === "billing" && (
            <BillingSection
              billing={billing}
              agentUsage={agentUsage}
              canManageBilling={canManageBilling}
            />
          )}
          {view === "sign-out-all" && <SignOutAllDevices />}
          {view === "login-history" && <ActiveSessionsPreview events={loginEvents} />}
          {view === "security-history" && (
            <SecurityHistorySection events={securityEvents} loginEvents={loginEvents} />
          )}
          {view === "preferences" && <PreferencesSection currentLocale={currentLocale} />}
        </SectionView>
      )}
    </div>
  );
}
