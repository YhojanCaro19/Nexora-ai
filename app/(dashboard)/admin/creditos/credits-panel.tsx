"use client";

import { useState } from "react";
import { CreditCoin } from "@/components/dashboard/shared/CreditCoin";
import type { CreditBalance, CreditLedgerEntry } from "@/lib/services/creditService";
import { formatShortDateTime } from "@/lib/utils/date";

// Etiquetas legibles para el `reason` del ledger (las claves crudas vienen
// de deduct_credits / grant_credits en la DB).
const REASON_LABELS: Record<string, string> = {
  agent_reply: "Respuesta del agente",
  copy: "Copy generado",
  strategy: "Estrategia generada",
  image_standard: "Imagen generada",
  image_hd: "Imagen HD generada",
  campaign_publish: "Campaña publicada",
  wa_marketing_message: "Mensaje de marketing",
  cycle_grant: "Créditos del plan",
  cycle_expire: "Vencimiento del ciclo",
  topup_purchase: "Compra de pack",
  manual_adjust: "Ajuste manual",
  manual_test: "Ajuste manual",
};

function reasonLabel(reason: string) {
  return REASON_LABELS[reason] ?? reason;
}

export function CreditsPanel({
  balance,
  history,
}: {
  balance: CreditBalance | null;
  history: CreditLedgerEntry[];
}) {
  const [showBuy, setShowBuy] = useState(false);
  const total = balance?.total ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Créditos
      </h1>

      {/* Saldo */}
      <div
        className="flex flex-col items-center rounded-2xl border p-8 text-center"
        style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}
      >
        <CreditCoin className="h-14 w-14 drop-shadow-[0_0_16px_rgba(129,140,248,0.55)]" />
        <p
          className="mt-4 font-nexora text-4xl font-semibold tabular-nums"
          style={{ color: "var(--nexora-ink)" }}
        >
          {total.toLocaleString("es-CO")}
        </p>
        <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          créditos disponibles
        </p>

        {balance && (
          <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3">
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--nexora-line)" }}
            >
              <p className="text-lg font-semibold tabular-nums" style={{ color: "var(--nexora-ink)" }}>
                {balance.plan.toLocaleString("es-CO")}
              </p>
              <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                del plan
                {balance.renewsAt
                  ? ` · renueva ${new Date(balance.renewsAt).toLocaleDateString("es-CO")}`
                  : ""}
              </p>
            </div>
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--nexora-line)" }}
            >
              <p className="text-lg font-semibold tabular-nums" style={{ color: "var(--nexora-ink)" }}>
                {balance.topup.toLocaleString("es-CO")}
              </p>
              <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                en packs (no vencen)
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowBuy((v) => !v)}
          className="mt-6 rounded-full border px-6 py-2.5 text-sm font-medium transition-colors"
          style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
        >
          Comprar créditos
        </button>
        {showBuy && (
          <p className="mt-3 max-w-sm text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            La compra de planes y packs con pago en línea está en camino. Mientras
            tanto, escríbenos y te recargamos manualmente.
          </p>
        )}

        {balance === null && (
          <p className="mt-4 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            Tu negocio todavía no tiene créditos asignados.
          </p>
        )}
      </div>

      {/* Historial */}
      <div>
        <h2
          className="mb-3 text-center text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--nexora-ink-dim)" }}
        >
          Movimientos
        </h2>

        {history.length === 0 ? (
          <p className="text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
            Aún no hay movimientos.
          </p>
        ) : (
          <div
            className="divide-y overflow-hidden rounded-xl border"
            style={{ borderColor: "var(--nexora-line)" }}
          >
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm" style={{ color: "var(--nexora-ink)" }}>
                    {reasonLabel(h.reason)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                    {formatShortDateTime(h.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: h.delta >= 0 ? "var(--nexora-signal)" : "var(--nexora-ink)" }}
                  >
                    {h.delta >= 0 ? "+" : ""}
                    {h.delta.toLocaleString("es-CO")}
                  </p>
                  <p className="text-xs tabular-nums" style={{ color: "var(--nexora-ink-dim)" }}>
                    saldo {h.balanceAfter.toLocaleString("es-CO")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
