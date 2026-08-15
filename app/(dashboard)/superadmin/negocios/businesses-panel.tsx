"use client";

import { useState } from "react";
import { ChevronLeft, Building2, UserCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  requestDeleteBusinessOtpAction,
  verifyDeleteBusinessOtpAction,
  deleteBusinessAction,
} from "./actions";
import type { BusinessWithOwner } from "@/lib/services/adminService";
import { industryTypes } from "@/lib/validators/businessSchema";
import { formatShortDateTime } from "@/lib/utils/date";
import { OTP_CODE_LENGTH } from "@/lib/constants/otp";

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

        <DeleteBusinessSection
          businessId={selected.id}
          businessName={selected.name}
          onDeleted={() => setSelectedId(null)}
        />
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

// Borrado real e irreversible (negocio + miembros + pedidos + productos +
// todo lo demás) — por eso pide código de verificación por correo antes de
// dejar ejecutarlo, no solo un "¿estás seguro?".
type DeleteStep = "idle" | "confirming" | "otp-sent";

function DeleteBusinessSection({
  businessId,
  businessName,
  onDeleted,
}: {
  businessId: string;
  businessName: string;
  onDeleted: () => void;
}) {
  const [step, setStep] = useState<DeleteStep>("idle");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode() {
    setLoading(true);
    setError(null);
    const result = await requestDeleteBusinessOtpAction();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("otp-sent");
  }

  async function handleVerifyAndDelete() {
    setLoading(true);
    setError(null);

    const verifyResult = await verifyDeleteBusinessOtpAction(businessId, code);
    if (verifyResult.error) {
      setLoading(false);
      setError(verifyResult.error);
      return;
    }

    const deleteResult = await deleteBusinessAction(businessId);
    setLoading(false);
    if (deleteResult.error) {
      setError(deleteResult.error);
      return;
    }
    onDeleted();
  }

  return (
    <div className="max-w-md mx-auto rounded-2xl border p-6 space-y-4 text-center" style={{ borderColor: 'rgba(248,113,113,0.25)' }}>
      <div className="flex flex-col items-center gap-2">
        <AlertTriangle size={20} strokeWidth={1.5} style={{ color: 'var(--nexora-alert)' }} />
        <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-alert)' }}>
          Zona peligrosa
        </h3>
        <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
          Elimina permanentemente <strong>{businessName}</strong>: su cuenta admin, colaboradores,
          catálogo, pedidos y configuración del agente. No se puede deshacer.
        </p>
      </div>

      {step === "idle" && (
        <Button
          type="button"
          variant="outline"
          style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'var(--nexora-alert)' }}
          onClick={() => setStep("confirming")}
        >
          Eliminar este negocio
        </Button>
      )}

      {step === "confirming" && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
            Te vamos a enviar un código de verificación a tu correo para confirmar.
          </p>
          <div className="flex justify-center gap-2">
            <Button type="button" disabled={loading} onClick={handleSendCode}>
              {loading ? "Enviando..." : "Enviar código"}
            </Button>
            <Button type="button" variant="outline" disabled={loading} onClick={() => setStep("idle")}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {step === "otp-sent" && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
            Ingresa el código de verificación que te llegó al correo.
          </p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_CODE_LENGTH))}
            inputMode="numeric"
            maxLength={OTP_CODE_LENGTH}
            placeholder="00000000"
            className="text-center tracking-[0.3em]"
          />
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading || code.length !== OTP_CODE_LENGTH}
              style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'var(--nexora-alert)' }}
              onClick={handleVerifyAndDelete}
            >
              {loading ? "Eliminando..." : "Confirmar y eliminar"}
            </Button>
            <Button type="button" variant="outline" disabled={loading} onClick={() => setStep("idle")}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: 'var(--nexora-alert)' }}>{error}</p>
      )}
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
