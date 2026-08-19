"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneField } from "@/components/shared/PhoneField";
import { formatShortDateTime } from "@/lib/utils/date";
import { updateOwnProfileAction, uploadAvatarAction } from "./actions";
import type { ProfileDetails } from "@/lib/services/profileService";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  colaborador: "Colaborador",
  superadmin: "Superadmin",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
        {label}
      </dt>
      <dd className="text-base font-semibold mt-0.5" style={{ color: 'var(--nexora-ink)' }}>
        {value}
      </dd>
    </div>
  );
}

// Mismo patrón de selección + preview + validación de tipo en cliente que
// reportes/customize-pdf-form.tsx (logo del negocio) — la diferencia es
// que acá la subida ocurre de inmediato al elegir el archivo (no hay un
// "Guardar" separado para la foto), porque el avatar no forma parte del
// formulario de nombre/teléfono.
export function IdentityForm({ details }: { details: ProfileDetails }) {
  const [avatarUrl, setAvatarUrl] = useState(details.avatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(details.fullName);
  const [phone, setPhone] = useState(details.phone ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const hasChanges = fullName.trim() !== details.fullName || phone !== (details.phone ?? "");

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;

    setAvatarError(null);
    // Solo un filtro de UX — la validación real, contra el contenido de
    // verdad del archivo, pasa en el server (mismo pipeline que Catálogo
    // y el logo del negocio).
    if (file.type !== "image/jpeg" && file.type !== "image/webp") {
      setAvatarError("La foto debe ser JPG o WebP");
      return;
    }

    const previousUrl = avatarUrl;
    setAvatarUrl(URL.createObjectURL(file));
    setAvatarUploading(true);
    const result = await uploadAvatarAction(file);
    setAvatarUploading(false);

    if (result.error || !result.url) {
      setAvatarError(result.error ?? "No se pudo subir la foto, intenta de nuevo");
      setAvatarUrl(previousUrl);
      return;
    }
    setAvatarUrl(result.url);
  }

  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileError(null);
    const result = await updateOwnProfileAction({ fullName: fullName.trim(), phone });
    setProfileSaving(false);
    if (result.error) {
      setProfileError(result.error);
      return;
    }
    setProfileSaved(true);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarUploading}
          className="group relative w-24 h-24 rounded-full overflow-hidden border flex items-center justify-center transition-colors"
          style={{ borderColor: 'var(--nexora-line)', background: 'var(--nexora-secondary)' }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview local/remoto simple, mismo criterio que el logo del negocio
            <img src={avatarUrl} alt="Foto de perfil" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span className="font-nexora text-xl" style={{ color: 'var(--nexora-ink)' }}>
              {getInitials(details.fullName)}
            </span>
          )}
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ opacity: avatarUploading ? 1 : undefined }}
          >
            <Camera size={18} strokeWidth={1.75} color="#fff" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
        />
        <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
          {avatarUploading ? "Subiendo foto..." : "JPG o WebP, máximo 3MB"}
        </p>
        {avatarError && (
          <p className="text-xs" style={{ color: 'var(--nexora-alert)' }}>
            {avatarError}
          </p>
        )}
      </div>

      <div className="space-y-4 max-w-xs mx-auto">
        {profileError && (
          <p
            className="rounded-lg border p-3 text-sm text-center"
            style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: 'var(--nexora-alert)' }}
          >
            {profileError}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="block text-center">Nombre</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setProfileSaved(false);
            }}
            className="text-center"
          />
        </div>

        <PhoneField
          label="Teléfono"
          defaultValue={details.phone ?? undefined}
          onChange={(value) => {
            setPhone(value);
            setProfileSaved(false);
          }}
        />

        <div className="flex flex-col items-center gap-2 pt-1">
          <Button
            type="button"
            disabled={profileSaving || !hasChanges || fullName.trim().length < 2}
            onClick={handleSaveProfile}
          >
            {profileSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
          {profileSaved && (
            <span className="text-xs" style={{ color: 'var(--nexora-signal)' }}>Guardado</span>
          )}
        </div>
      </div>

      <div className="pt-6 border-t" style={{ borderColor: 'var(--nexora-line)' }}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
          <InfoField label="Correo" value={details.email ?? "—"} />
          <InfoField label="Rol" value={ROLE_LABELS[details.role] ?? details.role} />
          {details.businessName && <InfoField label="Negocio" value={details.businessName} />}
          <InfoField
            label="Último acceso"
            value={details.lastSignInAt ? formatShortDateTime(details.lastSignInAt) : "—"}
          />
          <InfoField
            label="Miembro desde"
            value={details.memberSince ? formatShortDateTime(details.memberSince) : "—"}
          />
        </dl>
      </div>
    </div>
  );
}
