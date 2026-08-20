"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera, ChevronLeft, ChevronRight, IdCard, User, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneField } from "@/components/shared/PhoneField";
import { Avatar } from "@/components/shared/Avatar";
import { AvatarCropper } from "@/components/shared/AvatarCropper";
import { formatShortDateTime } from "@/lib/utils/date";
import { updateOwnProfileAction, uploadAvatarAction, deleteAvatarAction } from "./actions";
import type { ProfileDetails } from "@/lib/services/profileService";
import { industryTypes } from "@/lib/validators/businessSchema";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  colaborador: "Colaborador",
  superadmin: "Superadmin",
};

const industryLabel = (value: string) => industryTypes.find((it) => it.value === value)?.label ?? value;

// Mismo tamaño para el avatar mostrado y para el círculo de recorte del
// editor — así lo que el usuario ajusta en AvatarCropper corresponde 1:1
// con lo que ve después en la card.
const AVATAR_SIZE = 144;

// Patrón "tocar y entrar" — mismo mecanismo que catalogo-panel.tsx y
// mi-agente-panel.tsx: tocar una fila reemplaza la lista por su vista
// dedicada con un botón Volver, nunca un acordeón. El avatar de arriba
// queda fuera de este switcher, es el encabezado fijo de la card.
type SectionKey = "personal-data" | "account-info";
type View = "list" | SectionKey;

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "personal-data", label: "Datos personales", icon: User },
  { key: "account-info", label: "Información de la cuenta", icon: IdCard },
];

// Fila de solo lectura para "Información de la cuenta" — lista vertical
// label + valor en vez de la grilla de 2 columnas anterior, que se veía
// desalineada porque el contenido (correo largo, negocio opcional) no
// calzaba parejo entre columnas.
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-sm shrink-0" style={{ color: 'var(--nexora-ink-dim)' }}>
        {label}
      </dt>
      <dd
        className={`min-w-0 truncate text-right text-sm font-medium${mono ? " font-mono-data" : ""}`}
        style={{ color: 'var(--nexora-ink)' }}
      >
        {value}
      </dd>
    </div>
  );
}

// Mismo patrón de selección + preview + validación de tipo en cliente que
// reportes/customize-pdf-form.tsx (logo del negocio) — la diferencia es que
// acá, al elegir el archivo, se sube al confirmar el encuadre en
// AvatarCropper (no hay un "Guardar" separado para la foto), porque el
// avatar no forma parte del formulario de nombre/teléfono.
export function IdentityForm({ details }: { details: ProfileDetails }) {
  const [view, setView] = useState<View>("list");

  const [avatarUrl, setAvatarUrl] = useState(details.avatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  // Archivo recién elegido, pendiente de encuadrar en el editor — mientras
  // no sea null, se muestra AvatarCropper por encima de todo lo demás y no
  // se sube nada todavía.
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(details.fullName);
  const [phone, setPhone] = useState(details.phone ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const hasChanges = fullName.trim() !== details.fullName || phone !== (details.phone ?? "");

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;

    setAvatarError(null);
    // Solo un filtro de UX — la validación real, contra el contenido de
    // verdad del archivo, pasa en el server (mismo pipeline que Catálogo
    // y el logo del negocio, ver imageSecurityService.ts).
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      setAvatarError("La foto debe ser JPG o PNG");
      return;
    }

    // No se sube todavía — primero se ajusta el encuadre en AvatarCropper,
    // que llama a handleCropConfirm con el recorte final.
    setPendingAvatarFile(file);
  }

  async function handleCropConfirm(croppedFile: File) {
    setPendingAvatarFile(null);
    const previousUrl = avatarUrl;
    setAvatarUrl(URL.createObjectURL(croppedFile));
    setAvatarUploading(true);
    const result = await uploadAvatarAction(croppedFile);
    setAvatarUploading(false);

    if (result.error || !result.url) {
      setAvatarError(result.error ?? "No se pudo subir la foto, intenta de nuevo");
      setAvatarUrl(previousUrl);
      return;
    }
    setAvatarUrl(result.url);
  }

  async function handleDeleteAvatar() {
    setAvatarError(null);
    const previousUrl = avatarUrl;
    setAvatarUrl(null);
    setAvatarUploading(true);
    const result = await deleteAvatarAction();
    setAvatarUploading(false);

    if (result.error) {
      setAvatarError(result.error);
      setAvatarUrl(previousUrl);
    }
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
    <div className="space-y-6">
      {/* Foto: encabezado de la card, por fuera y por encima del switcher
          de vistas de abajo — a diferencia de esas filas, no es algo que
          tenga sentido entrar a ver aparte, es la identidad visual de la
          card. */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarUploading}
          className="group relative block shrink-0 rounded-full overflow-hidden transition-opacity"
        >
          <Avatar url={avatarUrl} name={details.fullName} size={AVATAR_SIZE} />
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ opacity: avatarUploading ? 1 : undefined }}
          >
            <Camera size={26} strokeWidth={1.75} color="#fff" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleAvatarChange}
          className="hidden"
        />
        <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
          {avatarUploading ? "Subiendo foto..." : "JPG o PNG, máximo 3MB"}
        </p>
        {avatarUrl && !avatarUploading && (
          <button
            type="button"
            onClick={handleDeleteAvatar}
            className="text-xs underline underline-offset-2"
            style={{ color: 'var(--nexora-alert)' }}
          >
            Eliminar foto
          </button>
        )}
        {avatarError && (
          <p className="text-xs" style={{ color: 'var(--nexora-alert)' }}>
            {avatarError}
          </p>
        )}
      </div>

      {/* Patrón "tocar y entrar" (mismo mecanismo que catalogo-panel.tsx y
          mi-agente-panel.tsx): tocar una fila reemplaza la lista por su
          vista dedicada con un botón Volver, nunca un acordeón. */}
      {view === "list" ? (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted bg-card"
            >
              <Icon size={16} strokeWidth={1.75} style={{ color: 'var(--nexora-nova)' }} />
              <span className="min-w-0 flex-1 text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
                {label}
              </span>
              <ChevronRight size={16} strokeWidth={1.75} style={{ color: 'var(--nexora-ink-dim)' }} />
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setView("list")}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--nexora-ink-dim)' }}
          >
            <ChevronLeft size={16} />
            Volver
          </button>

          <h3 className="text-center text-base font-semibold font-nexora" style={{ color: 'var(--nexora-ink)' }}>
            {SECTIONS.find((s) => s.key === view)?.label}
          </h3>

          {view === "personal-data" && (
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

              {/* defaultValue lee el estado LOCAL actual (`phone`), no
                  `details.phone` — PhoneField es no-controlado (solo lee su
                  valor inicial al montar) y volver a la lista desmonta esta
                  vista. Si leyera `details.phone` (el valor congelado de
                  cuando cargó la página), cada vez que se sale y se vuelve a
                  entrar a "Datos personales" se perdería lo escrito o
                  incluso lo recién guardado, porque PhoneField se remonta
                  desde cero y pisa el estado real con el viejo. */}
              <PhoneField
                label="Teléfono"
                defaultValue={phone || undefined}
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
          )}

          {view === "account-info" && (
            <dl className="max-w-sm mx-auto overflow-hidden rounded-xl border border-border divide-y divide-border">
              <InfoRow label="Correo" value={details.email ?? "—"} mono />
              <InfoRow label="Rol" value={ROLE_LABELS[details.role] ?? details.role} />
              {details.businessName && <InfoRow label="Negocio" value={details.businessName} />}
              {details.industryType && <InfoRow label="Tipo de negocio" value={industryLabel(details.industryType)} />}
              <InfoRow
                label="Último acceso"
                value={details.lastSignInAt ? formatShortDateTime(details.lastSignInAt) : "—"}
              />
              <InfoRow
                label="Miembro desde"
                value={details.memberSince ? formatShortDateTime(details.memberSince) : "—"}
              />
            </dl>
          )}
        </div>
      )}

      {pendingAvatarFile && (
        <AvatarCropper
          file={pendingAvatarFile}
          size={AVATAR_SIZE}
          onCancel={() => setPendingAvatarFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
