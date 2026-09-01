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
// Degradado iridiscente de marca (el de las letras de la landing) como
// gradiente SVG animado, para poder pintar el TRAZO de un ícono lucide.
// Se renderiza una sola vez; los íconos lo referencian por id.
const IR_GRADIENT_ID = "aventhra-ir-icon";

function IridescentGradientDef() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        {/* userSpaceOnUse: el gradiente se define en el viewBox del ícono
            (24x24), no en el bbox de cada trazo — sin esto, líneas rectas
            como la del "+" (bbox de ancho 0) quedan degeneradas y no se
            pintan. */}
        <linearGradient
          id={IR_GRADIENT_ID}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="24"
          y2="0"
        >
          <stop offset="0" stopColor="#4CC2E8" />
          <stop offset="0.25" stopColor="#818CF8" />
          <stop offset="0.5" stopColor="#A78BFA" />
          <stop offset="0.75" stopColor="#818CF8" />
          <stop offset="1" stopColor="#4CC2E8" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from="-24 0"
            to="24 0"
            dur="4s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
    </svg>
  );
}

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
      <Icon size={22} strokeWidth={2} className="shrink-0" stroke={`url(#${IR_GRADIENT_ID})`} />
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
      <IridescentGradientDef />
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
