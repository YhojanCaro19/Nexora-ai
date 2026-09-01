"use client";

import { useState } from "react";
import { Plus, ArrowUpCircle, type LucideIcon } from "lucide-react";
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

// Botón que en desktop es solo el ícono y, al pasar el mouse (o con foco),
// revela el texto con una animación de ancho. En móvil (sin hover) muestra
// el texto siempre.
function ExpandingButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="group inline-flex items-center rounded-full border px-3.5 py-2.5 text-sm font-medium transition-colors hover:border-white/25"
      style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
    >
      <Icon size={16} strokeWidth={1.75} className="shrink-0" />
      <span className="grid grid-cols-[1fr] transition-[grid-template-columns] duration-300 ease-out sm:grid-cols-[0fr] sm:group-hover:grid-cols-[1fr] sm:group-focus-visible:grid-cols-[1fr]">
        <span className="overflow-hidden whitespace-nowrap pl-2">{label}</span>
      </span>
    </button>
  );
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
    <div className="mx-auto max-w-2xl space-y-10">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Créditos
      </h1>

      {/* ---- Saldo disponible (sin card) ---- */}
      <div className="flex flex-col items-center gap-1 text-center">
        <CreditCoin className="h-12 w-12 drop-shadow-[0_0_18px_rgba(76,194,232,0.6)]" />
        <p className="mt-3 font-nexora text-5xl font-semibold tabular-nums" style={{ color: "var(--nexora-ink)" }}>
          {fmt(total)}
        </p>
        <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          créditos disponibles
        </p>

        {balance?.renewsAt && (
          <p className="mt-2 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            Renueva el {new Date(balance.renewsAt).toLocaleDateString("es-CO")}
          </p>
        )}
        {balance === null && (
          <p className="mt-2 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            Tu negocio todavía no tiene créditos asignados.
          </p>
        )}
      </div>

      {/* ---- Comprar más / mejorar plan ---- */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-3">
          <ExpandingButton icon={Plus} label="Comprar más créditos" onClick={() => setShowBuy(true)} />
          <ExpandingButton icon={ArrowUpCircle} label="Mejorar plan" onClick={() => setShowBuy(true)} />
        </div>
        {showBuy && (
          <p className="max-w-sm text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            La compra de planes y packs con pago en línea está en camino. Mientras
            tanto, escríbenos y te recargamos o mejoramos el plan manualmente.
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
                    style={{ color: h.delta >= 0 ? "var(--nexora-signal)" : "var(--nexora-alert)" }}
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
