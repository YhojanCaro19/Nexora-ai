"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { signOutAllDevicesAction } from "./actions";

// Mismo patrón de confirmación en dos pasos que
// colaboradores/collaborators-table.tsx (DeleteCollaboratorButton): sin
// modal nuevo, un segundo click explícito de "Confirmar" antes de
// ejecutar la acción irreversible. Acá no hace falta OTP porque no borra
// nada, solo revoca sesiones — pero sigue siendo sensible (cierra la
// sesión actual también) así que no puede ser un solo click.
type Step = "idle" | "confirming";

export function SignOutAllDevices() {
  const [step, setStep] = useState<Step>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    // En éxito, signOutAllDevicesAction() redirige a /login y no retorna.
    const result = await signOutAllDevicesAction();
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-4 flex flex-col items-center text-center">
      <div>
        <CardTitle>Cerrar sesión en todos los dispositivos</CardTitle>
        <CardDescription>
          Revoca todas las sesiones activas de tu cuenta, incluida esta. Tendrás que volver a iniciar sesión.
        </CardDescription>
      </div>

      {error && (
        <p
          className="rounded-lg border p-3 text-sm w-full max-w-xs"
          style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: 'var(--nexora-alert)' }}
        >
          {error}
        </p>
      )}

      {step === "idle" && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep("confirming")}
          style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'var(--nexora-alert)' }}
        >
          <LogOut size={14} strokeWidth={1.75} />
          Cerrar todas las sesiones
        </Button>
      )}

      {step === "confirming" && (
        <div className="space-y-2 w-full max-w-xs">
          <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
            ¿Seguro? Se cerrará tu sesión actual también.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleConfirm}
              style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'var(--nexora-alert)' }}
            >
              {loading ? "Cerrando..." : "Confirmar"}
            </Button>
            <Button type="button" variant="outline" disabled={loading} onClick={() => setStep("idle")}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
