"use client";

import { useRef, useState, type FormEvent } from "react";
import { ImagePlus } from "lucide-react";
import { updateBusinessBrandingAction, uploadBusinessLogoAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneField } from "@/components/shared/PhoneField";
import type { BusinessBranding } from "@/lib/services/businessBrandingService";

// Misma plantilla de reporte para todos los negocios — esto es lo único
// que cambia por negocio: el logo, el correo, el teléfono, el NIT/
// documento, la dirección y las redes sociales que aparecen en el
// encabezado del PDF. Todo salvo el logo es texto libre y opcional.
export function CustomizePdfForm({ branding }: { branding: BusinessBranding }) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(branding.logoUrl);
  const [contactEmail, setContactEmail] = useState(branding.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(branding.contactPhone ?? "");
  const [taxId, setTaxId] = useState(branding.taxId ?? "");
  const [address, setAddress] = useState(branding.address ?? "");
  const [instagram, setInstagram] = useState(branding.instagram ?? "");
  const [facebook, setFacebook] = useState(branding.facebook ?? "");
  const [tiktok, setTiktok] = useState(branding.tiktok ?? "");
  const [twitter, setTwitter] = useState(branding.twitter ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    setSaved(false);
    if (!file) {
      setLogoFile(null);
      return;
    }
    // Solo un filtro de UX — la validación real, contra el contenido de
    // verdad del archivo, pasa en el server (mismo pipeline que Catálogo).
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      setError("El logo debe ser JPG o PNG");
      e.target.value = "";
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    if (logoFile) {
      const logoResult = await uploadBusinessLogoAction(logoFile);
      if (logoResult.error) {
        setLoading(false);
        setError(logoResult.error);
        return;
      }
      setLogoFile(null);
    }

    const result = await updateBusinessBrandingAction({
      contactEmail,
      contactPhone,
      taxId,
      address,
      instagram,
      facebook,
      tiktok,
      twitter,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {error && (
        <p
          className="rounded-lg border p-3 text-sm text-center"
          style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: 'var(--nexora-alert)' }}
        >
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label className="block text-center">Logo del negocio</Label>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative w-32 h-32 rounded-2xl border border-dashed overflow-hidden flex flex-col items-center justify-center gap-1.5 transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.2)' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
            >
              {logoPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- preview local/remoto simple, no vale la pena next/image acá */}
                  <img src={logoPreview} alt="Vista previa del logo" className="absolute inset-0 w-full h-full object-contain bg-white/[0.03]" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-medium text-white">Cambiar</span>
                  </div>
                </>
              ) : (
                <>
                  <ImagePlus size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-ink-dim)' }} />
                  <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                    Subir logo
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>
          <p className="text-xs text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
            JPG o PNG, máximo 3MB.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contactEmail" className="block text-center">Correo de contacto</Label>
          <Input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => {
              setContactEmail(e.target.value);
              setSaved(false);
            }}
            placeholder="contacto@tunegocio.com"
          />
        </div>

        <PhoneField
          label="Teléfono de contacto"
          defaultValue={branding.contactPhone ?? undefined}
          onChange={(value) => {
            setContactPhone(value);
            setSaved(false);
          }}
        />

        <div className="space-y-1.5">
          <Label htmlFor="taxId" className="block text-center">NIT o documento (opcional)</Label>
          <Input
            id="taxId"
            value={taxId}
            onChange={(e) => {
              setTaxId(e.target.value);
              setSaved(false);
            }}
            placeholder="900.123.456-7"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address" className="block text-center">Dirección (opcional)</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setSaved(false);
            }}
            placeholder="Calle 123 #1-23, Medellin, Colombia"
          />
        </div>

        <div className="space-y-3 pt-2">
          <Label className="block text-center">Redes sociales (opcional)</Label>

          <div className="space-y-1.5">
            <Label htmlFor="instagram" className="block text-center text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>Instagram</Label>
            <Input
              id="instagram"
              value={instagram}
              onChange={(e) => {
                setInstagram(e.target.value);
                setSaved(false);
              }}
              placeholder="@tunegocio"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="facebook" className="block text-center text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>Facebook</Label>
            <Input
              id="facebook"
              value={facebook}
              onChange={(e) => {
                setFacebook(e.target.value);
                setSaved(false);
              }}
              placeholder="@tunegocio"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tiktok" className="block text-center text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>TikTok</Label>
            <Input
              id="tiktok"
              value={tiktok}
              onChange={(e) => {
                setTiktok(e.target.value);
                setSaved(false);
              }}
              placeholder="@tunegocio"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="twitter" className="block text-center text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>X (Twitter)</Label>
            <Input
              id="twitter"
              value={twitter}
              onChange={(e) => {
                setTwitter(e.target.value);
                setSaved(false);
              }}
              placeholder="@tunegocio"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
          {saved && (
            <span className="text-xs" style={{ color: 'var(--nexora-signal)' }}>Guardado</span>
          )}
        </div>
      </form>
    </div>
  );
}
