"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera, IdCard, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionItem, AccordionTrigger, AccordionPanel } from "@/components/ui/accordion";
import { PhoneField } from "@/components/shared/PhoneField";
import { Avatar } from "@/components/shared/Avatar";
import { formatShortDateTime } from "@/lib/utils/date";
import { updateOwnProfileAction, uploadAvatarAction } from "./actions";
import type { ProfileDetails } from "@/lib/services/profileService";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  colaborador: "Colaborador",
  superadmin: "Superadmin",
};

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
    // y el logo del negocio). Solo JPG a propósito (pedido explícito).
    if (file.type !== "image/jpeg") {
      setAvatarError("La foto debe ser JPG");
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
    <div className="space-y-6">
      {/* Foto: encabezado de la card, por fuera y por encima del
          acordeón — a diferencia de las filas de abajo, no es información
          que tenga sentido colapsar, es la identidad visual de la card. */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarUploading}
          className="group relative block shrink-0 rounded-full overflow-hidden transition-opacity"
        >
          <Avatar url={avatarUrl} name={details.fullName} size={144} />
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
          accept="image/jpeg"
          onChange={handleAvatarChange}
          className="hidden"
        />
        <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
          {avatarUploading ? "Subiendo foto..." : "JPG, máximo 3MB"}
        </p>
        {avatarError && (
          <p className="text-xs" style={{ color: 'var(--nexora-alert)' }}>
            {avatarError}
          </p>
        )}
      </div>

      {/* Mismo patrón de fila colapsada que la card Seguridad — acá cada
          fila es un grupo de datos en vez de una acción, pero el
          mecanismo (Accordion de components/ui) es idéntico. */}
      <Accordion>
        <AccordionItem value="personal-data">
          <AccordionTrigger icon={<User size={16} strokeWidth={1.75} />}>
            Datos personales
          </AccordionTrigger>
          <AccordionPanel>
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
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem value="account-info">
          <AccordionTrigger icon={<IdCard size={16} strokeWidth={1.75} />}>
            Información de la cuenta
          </AccordionTrigger>
          <AccordionPanel>
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
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
