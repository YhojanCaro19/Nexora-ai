"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FocusGlowCard } from "@/components/landing/FocusGlowCard";
import { PhoneField } from "@/components/shared/PhoneField";
import { industryTypes } from "@/lib/validators/businessSchema";
import { submitRegistration } from "./actions";

const inputClass =
  "border-white/10 bg-white/[0.03] text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40";
const labelClass = "text-xs tracking-wide text-white/60 text-center";

export function RegistrationForm({
  token,
  email,
  planName,
}: {
  token: string;
  email: string;
  planName: string;
}) {
  const [state, action, pending] = useActionState(submitRegistration, null);

  return (
    <FocusGlowCard className="w-full">
      <Card className="liquid-glass w-full rounded-2xl border-0 shadow-[0_8px_40px_rgba(0,0,0,0.4)] [--card-spacing:--spacing(3)] md:[--card-spacing:--spacing(4)]">
        <CardHeader className="text-center">
          <CardTitle className="text-lg font-normal text-white md:text-2xl">
            Activa tu cuenta
          </CardTitle>
          <p className="mt-1 text-sm text-white/45">
            Plan <span className="text-white/80">{planName}</span> · configura tu negocio
          </p>
        </CardHeader>

        <CardContent>
          <form action={action} className="space-y-3">
            {state?.error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {state.error}
              </p>
            )}

            <input type="hidden" name="token" value={token} />

            <div className="space-y-1">
              <p className={labelClass}>Tu correo</p>
              <div className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-sm text-white/70">
                {email}
              </div>
              <p className="text-center text-[11px] leading-relaxed text-white/35">
                A este correo llegará tu acceso. Debe ser una cuenta de Google —
                entrarás con “Continuar con Google”.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="full_name" className={labelClass}>
                Tu nombre
              </Label>
              <Input id="full_name" name="full_name" required className={inputClass} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="business_name" className={labelClass}>
                Nombre de tu negocio
              </Label>
              <Input id="business_name" name="business_name" required className={inputClass} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="industry_type" className={labelClass}>
                Tipo de negocio
              </Label>
              {/* <select> nativo a propósito — el form envía por FormData y
                  un <select> nativo llega solo con `name`, sin cablear un
                  input oculto. Mismo criterio que /contacto. */}
              <select
                id="industry_type"
                name="industry_type"
                defaultValue=""
                required
                className="h-10 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-white focus-visible:ring-2 focus-visible:ring-[#4CC2E8]/40 focus-visible:outline-none"
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
              <p className="text-center text-[11px] leading-relaxed text-white/35">
                Con esto preparamos tu agente para tu tipo de negocio.
              </p>
            </div>

            <PhoneField />

            <Button
              type="submit"
              disabled={pending}
              className="h-10 w-full bg-[#4CC2E8] font-medium text-black hover:bg-[#4CC2E8]/90 disabled:opacity-60 md:h-11"
            >
              {pending ? "Creando tu cuenta…" : "Crear mi cuenta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </FocusGlowCard>
  );
}
