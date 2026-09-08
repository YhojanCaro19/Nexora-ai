"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/dashboard/shared/Dropdown";
import { formatShortDateTime } from "@/lib/utils/date";
import { createManualRegistrationAction, resendAccountEmailAction } from "./actions";

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

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--nexora-nova)",
  completed: "var(--nexora-signal)",
  expired: "var(--nexora-alert)",
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
  const [creating, setCreating] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");

  const manualCount = registros.filter((r) => r.source === "manual").length;

  const filtered = useMemo(() => {
    if (sourceFilter === "all") return registros;
    if (sourceFilter === "manual") return registros.filter((r) => r.source === "manual");
    return registros.filter((r) => r.source !== "manual");
  }, [registros, sourceFilter]);

  function handleCreate(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await createManualRegistrationAction(formData);
      setFeedback(
        result.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Cuenta creada y correo enviado." }
      );
      if (!result.error) setCreating(false);
    });
  }

  function handleResend(id: string) {
    setFeedback(null);
    setResendingId(id);
    startTransition(async () => {
      const result = await resendAccountEmailAction(id);
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
          className={`rounded-lg border p-3 text-sm text-center ${
            feedback.kind === "error"
              ? "border-red-500/20 bg-red-500/10 text-red-400"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {feedback.text}
        </p>
      )}

      {/* Alta manual — solo para soporte/cortesías. Plegable (no un Card
          siempre visible): es una acción poco frecuente, no la primera
          cosa que hay que ver al entrar a Registros. */}
      {!creating ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} strokeWidth={2} />
            Crear registro manual
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: "var(--nexora-line)" }}>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="inline-flex items-center gap-1 rounded-full px-1 text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--nexora-ink-dim)" }}
          >
            <ChevronLeft size={16} />
            Cancelar
          </button>
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
        </div>
      )}

      {registros.length === 0 ? (
        <p className="py-16 text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          Aún no hay registros. Aparecerán acá cuando alguien pague un plan.
        </p>
      ) : (
        <>
          <Dropdown
            className="mx-auto max-w-xs"
            triggerLabel={
              sourceFilter === "manual"
                ? `Altas manuales (${manualCount})`
                : sourceFilter === "wompi"
                  ? `Por pago (${registros.length - manualCount})`
                  : `Todos (${registros.length})`
            }
            activeKey={sourceFilter}
            options={[
              { key: "all", label: `Todos (${registros.length})` },
              { key: "wompi", label: `Por pago (${registros.length - manualCount})` },
              { key: "manual", label: `Altas manuales (${manualCount})` },
            ]}
            onSelect={setSourceFilter}
          />

          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
              No hay registros que coincidan con el filtro.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--nexora-line)" }}>
              <table className="w-full min-w-[640px] text-sm">
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
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t" style={{ borderColor: "var(--nexora-line)" }}>
                      <td className="p-3" style={{ color: "var(--nexora-ink)" }}>{r.email}</td>
                      <td className="p-3" style={{ color: "var(--nexora-ink)" }}>
                        {r.planKey} · {PERIOD_LABEL[r.billingPeriod] ?? r.billingPeriod}
                      </td>
                      <td className="p-3" style={{ color: "var(--nexora-ink-dim)" }}>
                        {r.source === "manual" ? "Manual" : "Pago"}
                      </td>
                      <td className="p-3">
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                          style={{ color: STATUS_COLOR[r.status], background: `${STATUS_COLOR[r.status]}1A` }}
                        >
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="p-3" style={{ color: "var(--nexora-ink-dim)" }}>
                        {formatShortDateTime(r.createdAt)}
                      </td>
                      <td className="p-3 text-right">
                        {r.businessId && (
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
        </>
      )}
    </div>
  );
}
