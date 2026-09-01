"use client";

import { useState, useTransition } from "react";
import { Check, X, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatShortDateTime } from "@/lib/utils/date";
import { resolveAccountChangeAction } from "./actions";
import type { AccountChangeRequestListItem } from "@/lib/services/accountChangeService";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--nexora-nova)",
  approved: "var(--nexora-signal)",
  rejected: "var(--nexora-alert)",
  cancelled: "var(--nexora-ink-dim)",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  colaborador: "Colaborador",
};

function RequestCard({ request }: { request: AccountChangeRequestListItem }) {
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const isPending = request.status === "pending";

  function submit(action: "approve" | "reject") {
    setFeedback(null);
    startTransition(async () => {
      const result = await resolveAccountChangeAction(request.id, {
        action,
        note: note.trim() || undefined,
      });
      if (result.error) {
        setFeedback({ kind: "error", text: result.error });
        return;
      }
      setFeedback({
        kind: "ok",
        text: action === "approve" ? "Cambio aplicado." : "Solicitud rechazada.",
      });
      setMode("idle");
    });
  }

  return (
    <div
      className="rounded-2xl border p-4 sm:p-5"
      style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: "var(--nexora-ink)" }}>
            {request.businessName ?? "Negocio sin nombre"}
          </p>
          <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            {request.requesterName ? `${request.requesterName} · ` : ""}
            {ROLE_LABEL[request.memberRole] ?? request.memberRole} · {formatShortDateTime(request.createdAt)}
          </p>
        </div>
        <span
          className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold"
          style={{ color: STATUS_COLOR[request.status], background: `${STATUS_COLOR[request.status]}1A` }}
        >
          {STATUS_LABEL[request.status] ?? request.status}
        </span>
      </div>

      {/* Correo actual → correo pedido */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--nexora-ink)" }}>
        <span className="font-mono-data break-all">{request.currentEmail}</span>
        <ArrowRight size={14} strokeWidth={2} style={{ color: "var(--nexora-ink-dim)" }} />
        <span className="font-mono-data break-all">{request.requestedEmail}</span>
      </div>

      {/* Teléfono del registro — el canal de verificación */}
      {request.contactPhone && (
        <a
          href={`tel:${request.contactPhone}`}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors hover:bg-white/[0.04]"
          style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
        >
          <Phone size={13} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />
          {request.contactPhone}
        </a>
      )}

      <p className="mt-3 text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
        <span style={{ color: "var(--nexora-ink)" }}>Motivo:</span> {request.reason}
      </p>

      {!isPending && request.resolutionNote && (
        <p className="mt-2 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          Nota: {request.resolutionNote}
        </p>
      )}
      {!isPending && request.resolvedAt && (
        <p className="mt-1 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          Resuelta el {formatShortDateTime(request.resolvedAt)}
        </p>
      )}

      {feedback && (
        <p
          className="mt-3 rounded-lg border p-2.5 text-xs"
          style={
            feedback.kind === "error"
              ? { borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "var(--nexora-alert)" }
              : { borderColor: "rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.08)", color: "var(--nexora-signal)" }
          }
        >
          {feedback.text}
        </p>
      )}

      {isPending && (
        <div className="mt-4">
          {mode === "idle" ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => setMode("approve")}>
                <Check size={14} strokeWidth={2} /> Aprobar cambio
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMode("reject")}
                style={{ borderColor: "rgba(248,113,113,0.4)", color: "var(--nexora-alert)" }}
              >
                <X size={14} strokeWidth={2} /> Rechazar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                {mode === "approve"
                  ? "Confirma que ya verificaste la identidad por teléfono. Se cambiará el correo en Auth y se desvinculará la cuenta de Google anterior. Límite: 1 vez al año."
                  : "Se le avisará a la persona por correo con el motivo."}
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={mode === "approve" ? "Nota interna (opcional)" : "Motivo del rechazo (opcional)"}
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
                style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => submit(mode)}
                  variant={mode === "reject" ? "outline" : "default"}
                  style={
                    mode === "reject"
                      ? { borderColor: "rgba(248,113,113,0.4)", color: "var(--nexora-alert)" }
                      : undefined
                  }
                >
                  {pending
                    ? "Procesando..."
                    : mode === "approve"
                      ? "Confirmar y aplicar"
                      : "Confirmar rechazo"}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setMode("idle")}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SolicitudesPanel({ requests }: { requests: AccountChangeRequestListItem[] }) {
  if (requests.length === 0) {
    return (
      <p className="py-16 text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
        No hay solicitudes de cambio de cuenta.
      </p>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {pending.length > 0 && (
        <div className="space-y-3">
          {pending.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-center" style={{ color: "var(--nexora-ink-dim)" }}>
            Historial
          </p>
          {resolved.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}
