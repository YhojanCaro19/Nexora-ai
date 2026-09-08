"use client";

// Mismo patrón que admin/perfil/profile-panel.tsx: un encabezado fijo
// (foto + nombre + rol) y una sola lista de secciones "tocar y entrar"
// — nada de Cards anidados (antes: page.tsx envolvía IdentityForm y
// SecurityPanel en dos <Card> separados, cada uno con su propia lista
// adentro — dos niveles de caja donde admin usa uno solo).
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, User, IdCard, LogOut, MonitorSmartphone, Languages, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneField } from "@/components/shared/PhoneField";
import { formatShortDateTime } from "@/lib/utils/date";
import { setLocale } from "@/app/actions/locale";
import type { Locale } from "@/i18n/locales";
import { AvatarEditor } from "./avatar-editor";
import { SignOutAllDevices } from "./sign-out-all-devices";
import { ActiveSessionsPreview } from "./active-sessions-preview";
import { updateOwnProfileAction } from "./actions";
import type { ProfileDetails } from "@/lib/services/profileService";
import type { LoginEvent } from "@/lib/services/loginEventService";

type SectionKey = "personal" | "account" | "sign-out-all" | "login-history" | "preferences";

interface ProfilePanelProps {
  details: ProfileDetails;
  loginEvents: LoginEvent[];
  currentLocale: Locale;
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

function SectionView({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
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
      <h2 className="text-center font-nexora text-base font-semibold" style={{ color: "var(--nexora-ink)" }}>
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
        <Button type="button" disabled={saving || !hasChanges || fullName.trim().length < 2} onClick={save}>
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
      <Row label="Rol" value="Superadmin" />
      <Row label="Último acceso" value={details.lastSignInAt ? formatShortDateTime(details.lastSignInAt) : "—"} />
      <Row label="Miembro desde" value={details.memberSince ? formatShortDateTime(details.memberSince) : "—"} />
    </dl>
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

export function ProfilePanel({ details, loginEvents, currentLocale }: ProfilePanelProps) {
  const [view, setView] = useState<SectionKey | "list">("list");

  const rows: { key: SectionKey; label: string; icon: LucideIcon }[] = [
    { key: "personal", label: "Datos personales", icon: User },
    { key: "account", label: "Información de la cuenta", icon: IdCard },
    { key: "sign-out-all", label: "Cerrar sesión en todos los dispositivos", icon: LogOut },
    { key: "login-history", label: "Inicios de sesión", icon: MonitorSmartphone },
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
            Superadmin{details.email ? ` · ${details.email}` : ""}
          </p>
        </div>
      </div>

      {view === "list" ? (
        <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border" style={{ borderColor: "var(--nexora-line)" }}>
          {rows.map(({ key, label, icon: Icon }) => (
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
              <ChevronRight size={16} strokeWidth={1.75} style={{ color: "var(--nexora-ink-dim)" }} />
            </button>
          ))}
        </div>
      ) : (
        <SectionView title={titleFor(view)} onBack={() => setView("list")}>
          {view === "personal" && <PersonalDataSection details={details} />}
          {view === "account" && <AccountInfoSection details={details} />}
          {view === "sign-out-all" && <SignOutAllDevices />}
          {view === "login-history" && <ActiveSessionsPreview events={loginEvents} />}
          {view === "preferences" && <PreferencesSection currentLocale={currentLocale} />}
        </SectionView>
      )}
    </div>
  );
}
