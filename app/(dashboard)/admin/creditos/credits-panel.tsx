"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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

const reasonLabel = (reason: string) => REASON_LABELS[reason] ?? reason;
const fmt = (n: number) => n.toLocaleString("es-CO");

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
    <div className="mx-auto max-w-2xl space-y-10">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Créditos
      </h1>

      {/* ---- Saldo disponible (sin card) ---- */}
      <div className="flex flex-col items-center gap-1 text-center">
        <CreditCoin className="h-12 w-12 drop-shadow-[0_0_16px_rgba(129,140,248,0.55)]" />
        <p className="mt-3 font-nexora text-5xl font-semibold tabular-nums" style={{ color: "var(--nexora-ink)" }}>
          {fmt(total)}
        </p>
        <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          créditos disponibles
        </p>

        {balance && (
          <p className="mt-2 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            {[
              `${fmt(balance.plan)} del plan${
                balance.renewsAt
                  ? ` (renueva ${new Date(balance.renewsAt).toLocaleDateString("es-CO")})`
                  : ""
              }`,
              balance.topup > 0 ? `${fmt(balance.topup)} en packs (no vencen)` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {balance === null && (
          <p className="mt-2 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            Tu negocio todavía no tiene créditos asignados.
          </p>
        )}
      </div>

      {/* ---- Comprar más ---- */}
      <div className="flex flex-col items-center gap-2">
        <Button type="button" onClick={() => setShowBuy((v) => !v)}>
          Comprar más créditos
        </Button>
        {showBuy && (
          <p className="max-w-sm text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            La compra de planes y packs con pago en línea está en camino. Mientras
            tanto, escríbenos y te recargamos manualmente.
          </p>
        )}
      </div>

      {/* ---- Historial de gasto ---- */}
      <div className="space-y-3">
        <h2
          className="text-center text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--nexora-ink-dim)" }}
        >
          Historial de gasto
        </h2>

        {history.length === 0 ? (
          <p className="text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
            Aún no hay movimientos.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 py-3">
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
                    {fmt(h.delta)}
                  </p>
                  <p className="text-xs tabular-nums" style={{ color: "var(--nexora-ink-dim)" }}>
                    saldo {fmt(h.balanceAfter)}
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
