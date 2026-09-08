"use client";

// Wizard de onboarding — FUNCIONAL y BÁSICO. Un ui-designer lo va a rehacer
// bonito después; acá lo importante es la estructura de pasos y que el
// submit llame a completarOnboarding.
//
// Pasos:
//   1. Datos       → fullName, businessName, phone (PhoneField)
//   2. Industria   → <select> con industryTypes  +  submit
//   3. "¡Listo!"   → se muestra cuando la action devuelve { ok: true }
//
// Los dos pasos del formulario se mantienen MONTADOS (se ocultan con la
// clase `hidden`, no se desmontan) porque PhoneField expone su valor con
// inputs ocultos dentro del <form> — si se desmontara el paso 1, esos
// inputs saldrían del FormData.
import { useActionState, useState } from "react";
import Link from "next/link";
import { PhoneField } from "@/components/shared/PhoneField";
import { industryTypes } from "@/lib/validators/businessSchema";
import { completarOnboarding, type OnboardingState } from "./actions";

export function OnboardingWizard({ defaultFullName }: { defaultFullName: string }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completarOnboarding,
    null
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState(defaultFullName);
  const [businessName, setBusinessName] = useState("");
  const [industryType, setIndustryType] = useState("");

  const step1Ready = fullName.trim().length >= 2 && businessName.trim().length >= 2;
  const errorText = state && !state.ok ? state.error : null;

  if (state?.ok) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold">¡Listo!</h1>
        <p className="text-sm text-white/60">
          Tu negocio quedó configurado y tu agente ya tiene una base según tu
          tipo de negocio.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/admin/mi-agente"
            className="rounded-lg bg-[#4CC2E8] px-4 py-2.5 text-sm font-medium text-black"
          >
            Personaliza tu agente
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/80"
          >
            Ir al panel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Bienvenido a AVENTHRA</h1>
        <p className="mt-1 text-sm text-white/60">
          Paso {step} de 2 — cuéntanos de tu negocio para dejar tu agente listo.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        {/* PASO 1 — Datos */}
        <div className={step === 1 ? "space-y-4" : "hidden"}>
          <div className="space-y-1">
            <label htmlFor="fullName" className="block text-center text-xs text-white/60">
              Tu nombre
            </label>
            <input
              id="fullName"
              name="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-[#4CC2E8]/50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="businessName" className="block text-center text-xs text-white/60">
              Nombre de tu negocio
            </label>
            <input
              id="businessName"
              name="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-[#4CC2E8]/50"
            />
          </div>

          <PhoneField />

          <div className="flex justify-center">
            <button
              type="button"
              disabled={!step1Ready}
              onClick={() => setStep(2)}
              className="rounded-lg bg-[#4CC2E8] px-5 py-2.5 text-sm font-medium text-black disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>

        {/* PASO 2 — Industria + submit */}
        <div className={step === 2 ? "space-y-4" : "hidden"}>
          <div className="space-y-1">
            <label htmlFor="industryType" className="block text-center text-xs text-white/60">
              Tipo de negocio
            </label>
            <select
              id="industryType"
              name="industryType"
              value={industryType}
              onChange={(e) => setIndustryType(e.target.value)}
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-[#4CC2E8]/50"
            >
              <option value="" disabled className="bg-black">
                Selecciona el tipo de negocio
              </option>
              {industryTypes.map((it) => (
                <option key={it.value} value={it.value} className="bg-black">
                  {it.label}
                </option>
              ))}
            </select>
            <p className="text-center text-[11px] text-white/40">
              Con esto preparamos tu agente para tu tipo de negocio.
            </p>
          </div>

          {errorText && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
              {errorText}
            </p>
          )}

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/80"
            >
              Atrás
            </button>
            <button
              type="submit"
              disabled={pending || !industryType}
              className="rounded-lg bg-[#4CC2E8] px-5 py-2.5 text-sm font-medium text-black disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Terminar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
