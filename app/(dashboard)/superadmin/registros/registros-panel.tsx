"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatShortDateTime } from "@/lib/utils/date";
import { createManualRegistrationAction, resendRegistrationEmailAction } from "./actions";

type Registro = {
  id: string;
  email: string;
  planKey: string;
  billingPeriod: string;
  source: string;
  status: string;
  businessId: string | null;
  createdAt: string;
  expiresAt: string;
  completedAt: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  completed: "Completado",
  expired: "Vencido",
};

const PERIOD_LABEL: Record<string, string> = {
  monthly: "Mensual",
  annual: "Anual",
};

export function RegistrosPanel({
  registros,
  plans,
}: {
  registros: Registro[];
  plans: { key: string; name: string }[];
}) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [resendingId, setResendingId] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await createManualRegistrationAction(formData);
      setFeedback(
        result.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Registro creado y correo enviado." }
      );
    });
  }

  function handleResend(id: string) {
    setFeedback(null);
    setResendingId(id);
    startTransition(async () => {
      const result = await resendRegistrationEmailAction(id);
      setResendingId(null);
      setFeedback(
        result.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Correo reenviado." }
      );
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {feedback && (
        <p
          className={`rounded-lg border p-3 text-sm ${
            feedback.kind === "error"
              ? "border-red-500/20 bg-red-500/10 text-red-400"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {feedback.text}
        </p>
      )}

      {/* Alta manual — solo para soporte / cortesías. El alta normal la
          dispara el pago en Wompi. */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-base">Crear registro manual</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="mx-auto max-w-sm space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email" className="block text-center text-xs">
                Correo del cliente
              </Label>
              <Input id="email" name="email" type="email" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="planKey" className="block text-center text-xs">
                Plan
              </Label>
              <select
                id="planKey"
                name="planKey"
                required
                defaultValue=""
                className="h-10 w-full rounded-md border px-3 text-sm"
                style={{ borderColor: "var(--nexora-line)", background: "transparent" }}
              >
                <option value="" disabled>
                  Selecciona un plan
                </option>
                {plans.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="billingPeriod" className="block text-center text-xs">
                Periodo
              </Label>
              <select
                id="billingPeriod"
                name="billingPeriod"
                defaultValue="monthly"
                className="h-10 w-full rounded-md border px-3 text-sm"
                style={{ borderColor: "var(--nexora-line)", background: "transparent" }}
              >
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
              </select>
            </div>

            <div className="flex justify-center">
              <Button type="submit" disabled={pending}>
                {pending ? "Creando…" : "Crear y enviar correo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {registros.length === 0 ? (
        <p className="py-16 text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          Aún no hay registros. Aparecerán acá cuando alguien pague un plan.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--nexora-line)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--nexora-ink-dim)" }} className="text-left text-xs uppercase tracking-wide">
                <th className="p-3">Correo</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Origen</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Creado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: "var(--nexora-line)" }}>
                  <td className="p-3" style={{ color: "var(--nexora-ink)" }}>{r.email}</td>
                  <td className="p-3" style={{ color: "var(--nexora-ink)" }}>
                    {r.planKey} · {PERIOD_LABEL[r.billingPeriod] ?? r.billingPeriod}
                  </td>
                  <td className="p-3" style={{ color: "var(--nexora-ink-dim)" }}>
                    {r.source === "manual" ? "Manual" : "Pago"}
                  </td>
                  <td className="p-3" style={{ color: "var(--nexora-ink-dim)" }}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </td>
                  <td className="p-3" style={{ color: "var(--nexora-ink-dim)" }}>
                    {formatShortDateTime(r.createdAt)}
                  </td>
                  <td className="p-3 text-right">
                    {r.status === "pending" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => handleResend(r.id)}
                      >
                        {resendingId === r.id ? "Enviando…" : "Reenviar correo"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
