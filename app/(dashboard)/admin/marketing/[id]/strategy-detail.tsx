"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pause, Play, ImagePlus } from "lucide-react";
import type { MarketingStrategy, MarketingPiece } from "@/lib/services/marketingService";
import { setStrategyStatusAction } from "../actions";

const OBJECTIVE_LABEL: Record<string, string> = {
  awareness: "Reconocimiento",
  traffic: "Tráfico",
  leads: "Contactos",
  sales: "Ventas",
  engagement: "Interacción",
};

function ConfigCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--nexora-line)" }}>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--nexora-ink-dim)" }}>
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm" style={{ color: "var(--nexora-ink)" }}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--nexora-ink-dim)" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export function StrategyDetail({
  strategy,
  pieces,
}: {
  strategy: MarketingStrategy;
  pieces: MarketingPiece[];
}) {
  const [busy, setBusy] = useState(false);
  const s = strategy;
  const ai = s.aiStrategy;
  const isPaused = s.status === "paused";
  const isActive = s.status === "active";

  async function toggleStatus() {
    setBusy(true);
    await setStrategyStatusAction(s.id, isActive ? "paused" : "active");
    setBusy(false);
  }

  const budgetText = s.budgetAmount
    ? `${s.budgetAmount.toLocaleString("es-CO")} ${s.budgetCurrency}${s.budgetPeriod === "daily" ? "/día" : ""}`
    : "Sin definir";

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <Link
        href="/admin/marketing"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        <ChevronLeft size={16} />
        Mis estrategias
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{ color: "var(--nexora-ink)", background: "rgba(255,255,255,0.06)" }}
          >
            {s.status}
          </span>
          <h1 className="mt-2 font-nexora text-2xl" style={{ color: "var(--nexora-ink)" }}>
            {s.name}
          </h1>
        </div>
        {(isActive || isPaused) && (
          <button
            type="button"
            onClick={toggleStatus}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
            style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
          >
            {isActive ? <Pause size={15} /> : <Play size={15} />}
            {isActive ? "Pausar" : "Reanudar"}
          </button>
        )}
      </div>

      {/* Pasos */}
      <div className="flex gap-6 text-sm">
        <span style={{ color: "var(--nexora-ink)" }}>
          <b>1</b> Estrategia
        </span>
        <span style={{ color: "var(--nexora-ink-dim)" }}>
          <b>{pieces.length}</b> Piezas
        </span>
        <span style={{ color: "var(--nexora-ink-dim)" }}>
          <b>{pieces.filter((p) => p.status === "approved").length}</b> Anuncios
        </span>
      </div>

      {/* Config */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <ConfigCell label="Objetivo" value={s.objective ? OBJECTIVE_LABEL[s.objective] ?? s.objective : "—"} />
        <ConfigCell label="Canal" value={s.channel ?? "—"} />
        <ConfigCell label="Inversión" value={budgetText} />
        <ConfigCell label="Idioma" value={s.language} />
        <ConfigCell label="Fecha inicio" value={s.startsAt ?? "Sin definir"} />
        <ConfigCell label="Ubicación" value="Sin definir" />
      </div>

      {/* Estrategia de la IA */}
      {ai ? (
        <div className="space-y-6 rounded-2xl border p-5" style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}>
          <Section title="Posicionamiento">
            <p className="text-sm leading-relaxed" style={{ color: "var(--nexora-ink)" }}>{ai.positioning}</p>
          </Section>

          <Section title="Ángulos de mensaje">
            <ul className="space-y-2">
              {ai.messageAngles?.map((a, i) => (
                <li key={i} className="text-sm" style={{ color: "var(--nexora-ink)" }}>
                  <span className="font-medium">{a.title}</span>
                  <span style={{ color: "var(--nexora-ink-dim)" }}> — {a.description}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Plan por canal">
            <div className="space-y-2">
              {ai.channelPlan?.map((c, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--nexora-line)" }}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: "var(--nexora-ink)" }}>{c.channel}</span>
                    <span style={{ color: "var(--nexora-ink-dim)" }}>{c.budgetShare}% del presupuesto</span>
                  </div>
                  <p className="mt-1" style={{ color: "var(--nexora-ink-dim)" }}>{c.audience} · {c.note}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Ideas de campaña">
            <div className="space-y-2">
              {ai.campaignIdeas?.map((c, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--nexora-line)" }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium" style={{ color: "var(--nexora-ink)" }}>{c.name}</span>
                    <span className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                      {OBJECTIVE_LABEL[c.objective] ?? c.objective} · {c.channel}
                    </span>
                  </div>
                  <p className="mt-1" style={{ color: "var(--nexora-ink-dim)" }}>{c.summary}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          Esta estrategia todavía no tiene contenido generado.
        </p>
      )}

      {/* Siguiente paso */}
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-8" style={{ borderColor: "var(--nexora-line)" }}>
        <ImagePlus size={20} strokeWidth={1.5} style={{ color: "var(--nexora-ink-dim)" }} />
        <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          Generar las piezas (imágenes + copys) — próximo paso del módulo.
        </p>
      </div>
    </div>
  );
}
