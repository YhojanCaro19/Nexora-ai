"use client";

import { useState } from "react";
import { ChevronLeft, Building2, UserCircle, Trash2 } from "lucide-react";
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
import { InfoRow } from "@/components/dashboard/shared/InfoRow";

const industryLabel = (value: string) =>
  industryTypes.find((it) => it.value === value)?.label ?? value;

export function BusinessesPanel({ businesses }: { businesses: BusinessWithOwner[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = businesses.find((b) => b.id === selectedId) ?? null;
  // Se llama siempre, sin importar si hay negocio seleccionado o no — un
  // hook no puede quedar detrás de un `if` (reglas de hooks de React).
  const deleteFlow = useDeleteBusinessFlow(selectedId, () => setSelectedId(null));

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

          {deleteFlow.step === "idle" && (
            <button
              type="button"
              onClick={() => deleteFlow.setStep("typing")}
              title="Eliminar este negocio"
              aria-label="Eliminar este negocio"
              className="absolute right-0 inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-[rgba(248,113,113,0.12)]"
              style={{ color: 'var(--nexora-alert)' }}
            >
              <Trash2 size={17} strokeWidth={1.5} />
            </button>
          )}
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

        {deleteFlow.step !== "idle" && <DeleteBusinessConfirmPanel flow={deleteFlow} />}
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
// todo lo demás) — por eso pide DOS confirmaciones antes de dejar
// ejecutarlo: escribir "ELIMINAR" a propósito (no es un click accidental) y
// luego un código de verificación real enviado al correo.
const CONFIRM_WORD = "ELIMINAR";
type DeleteStep = "idle" | "typing" | "otp-sent";

function useDeleteBusinessFlow(businessId: string | null, onDeleted: () => void) {
  const [step, setStep] = useState<DeleteStep>("idle");
  const [typedConfirm, setTypedConfirm] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si cambia el negocio seleccionado (o se cierra el detalle), no debe
  // quedar un paso de borrado a medias esperando por otro negocio distinto.
  // Se ajusta durante el render (patrón recomendado por React para "resetear
  // estado cuando cambia una prop"), no dentro de un efecto.
  const [trackedBusinessId, setTrackedBusinessId] = useState(businessId);
  if (businessId !== trackedBusinessId) {
    setTrackedBusinessId(businessId);
    setStep("idle");
    setTypedConfirm("");
    setCode("");
    setError(null);
  }

  function cancel() {
    setStep("idle");
    setTypedConfirm("");
    setCode("");
    setError(null);
  }

  async function handleConfirmTyped() {
    if (!businessId || typedConfirm !== CONFIRM_WORD) return;
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
    if (!businessId) return;
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

  return {
    step,
    setStep,
    typedConfirm,
    setTypedConfirm,
    code,
    setCode,
    loading,
    error,
    cancel,
    handleConfirmTyped,
    handleVerifyAndDelete,
  };
}

type DeleteFlow = ReturnType<typeof useDeleteBusinessFlow>;

function DeleteBusinessConfirmPanel({ flow }: { flow: DeleteFlow }) {
  return (
    <div className="max-w-md mx-auto space-y-3 text-center">
      {flow.step === "typing" && (
        <>
          <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
            Escribe <strong style={{ color: 'var(--nexora-alert)' }}>{CONFIRM_WORD}</strong> para
            confirmar que quieres borrar este negocio. Luego te enviamos un código al correo.
          </p>
          <Input
            value={flow.typedConfirm}
            onChange={(e) => flow.setTypedConfirm(e.target.value.toUpperCase())}
            placeholder={CONFIRM_WORD}
            className="text-center tracking-[0.2em]"
          />
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={flow.loading || flow.typedConfirm !== CONFIRM_WORD}
              style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'var(--nexora-alert)' }}
              onClick={flow.handleConfirmTyped}
            >
              {flow.loading ? "Enviando código..." : "Continuar"}
            </Button>
            <Button type="button" variant="outline" disabled={flow.loading} onClick={flow.cancel}>
              Cancelar
            </Button>
          </div>
        </>
      )}

      {flow.step === "otp-sent" && (
        <>
          <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
            Ingresa el código de verificación que te llegó al correo.
          </p>
          <Input
            value={flow.code}
            onChange={(e) => flow.setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_CODE_LENGTH))}
            inputMode="numeric"
            maxLength={OTP_CODE_LENGTH}
            placeholder="00000000"
            className="text-center tracking-[0.3em]"
          />
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={flow.loading || flow.code.length !== OTP_CODE_LENGTH}
              style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'var(--nexora-alert)' }}
              onClick={flow.handleVerifyAndDelete}
            >
              {flow.loading ? "Eliminando..." : "Confirmar y eliminar"}
            </Button>
            <Button type="button" variant="outline" disabled={flow.loading} onClick={flow.cancel}>
              Cancelar
            </Button>
          </div>
        </>
      )}

      {flow.error && (
        <p className="text-xs" style={{ color: 'var(--nexora-alert)' }}>{flow.error}</p>
      )}
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
