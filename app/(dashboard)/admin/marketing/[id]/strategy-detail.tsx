"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  Pause,
  Play,
  Sparkles,
  Check,
  X,
  Rocket,
  RefreshCcw,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import type { MarketingStrategy, MarketingPiece, StrategyMetricsSummary } from "@/lib/services/marketingService";
import type { CampaignReviewResult } from "@/lib/services/campaignReviewService";
import {
  setStrategyStatusAction,
  generatePieceAction,
  updatePieceStatusAction,
  publishStrategyAction,
  activateStrategyAction,
  syncStrategyMetricsAction,
} from "../actions";

const OBJECTIVE_LABEL: Record<string, string> = {
  awareness: "Reconocimiento",
  traffic: "Tráfico",
  leads: "Contactos",
  sales: "Ventas",
  engagement: "Interacción",
};

const CTA_LABEL: Record<string, string> = {
  MESSAGE_PAGE: "Enviar mensaje",
  WHATSAPP_MESSAGE: "Escribir por WhatsApp",
  LEARN_MORE: "Más información",
  SHOP_NOW: "Comprar ahora",
  CONTACT_US: "Contáctanos",
};

type PieceWithUrl = MarketingPiece & { imageUrl: string | null };

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
  hasAdAccount,
  adAccountCurrency,
  metrics,
}: {
  strategy: MarketingStrategy;
  pieces: PieceWithUrl[];
  hasAdAccount: boolean;
  adAccountCurrency: string | null;
  metrics: StrategyMetricsSummary;
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

  const approvedPiece = pieces.find((p) => p.status === "approved");

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

      <PiecesSection strategyId={s.id} pieces={pieces} />

      <PublishSection
        strategy={s}
        hasAdAccount={hasAdAccount}
        adAccountCurrency={adAccountCurrency}
        hasApprovedPiece={Boolean(approvedPiece)}
        metrics={metrics}
      />
    </div>
  );
}

// ── Piezas (imagen + copy) ─────────────────────────────────────────────────
function PiecesSection({ strategyId, pieces }: { strategyId: string; pieces: PieceWithUrl[] }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const res = await generatePieceAction(strategyId);
    setGenerating(false);
    if (!res.ok) {
      if (res.reason === "insufficient_credits") {
        setError(`Necesitas ${res.needed} créditos y tienes ${res.have}.`);
      } else {
        setError(res.message);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--nexora-ink-dim)" }}>
          Piezas (imagen + copy)
        </h2>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-black"
          style={{ background: "linear-gradient(120deg,#4CC2E8,#A78BFA)" }}
        >
          <Sparkles size={14} />
          {generating ? "Generando 3 opciones..." : "Generar piezas"}
        </button>
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--nexora-alert)" }}>
          {error}
        </p>
      )}

      {pieces.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-8" style={{ borderColor: "var(--nexora-line)" }}>
          <Sparkles size={20} strokeWidth={1.5} style={{ color: "var(--nexora-ink-dim)" }} />
          <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
            Todavía no hay ninguna pieza generada.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pieces.map((p) => (
            <PieceCard key={p.id} strategyId={strategyId} piece={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PieceCard({ strategyId, piece }: { strategyId: string; piece: PieceWithUrl }) {
  const [busy, setBusy] = useState(false);

  async function setStatus(status: "approved" | "rejected") {
    setBusy(true);
    await updatePieceStatusAction(strategyId, piece.id, status);
    setBusy(false);
  }

  const statusColor =
    piece.status === "approved" ? "var(--nexora-signal)" : piece.status === "rejected" ? "var(--nexora-alert)" : "var(--nexora-ink-dim)";
  const statusLabel = piece.status === "approved" ? "Aprobada" : piece.status === "rejected" ? "Rechazada" : "Pendiente de revisión";

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}>
      {piece.imageUrl && (
        <div className="relative aspect-square w-full bg-black/20">
          <Image src={piece.imageUrl} alt={piece.headline ?? "Pieza"} fill unoptimized className="object-cover" />
        </div>
      )}
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: statusColor }}>
            {statusLabel}
          </span>
          {piece.aiScore !== null && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: "rgba(129,140,248,0.12)", color: "#A78BFA" }}
              title={piece.aiScoreReason ?? undefined}
            >
              ⭐ {piece.aiScore}/10
            </span>
          )}
        </div>
        {piece.aiScoreReason && (
          <p className="text-[11px] italic" style={{ color: "var(--nexora-ink-dim)" }}>
            {piece.aiScoreReason}
          </p>
        )}
        <p className="text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>{piece.headline}</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--nexora-ink-dim)" }}>{piece.body}</p>
        {piece.cta && (
          <span
            className="inline-block rounded-full px-2.5 py-1 text-[10px] font-medium"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--nexora-ink)" }}
          >
            {CTA_LABEL[piece.cta] ?? piece.cta}
          </span>
        )}

        {piece.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStatus("approved")}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-xs"
              style={{ borderColor: "var(--nexora-signal)", color: "var(--nexora-signal)" }}
            >
              <Check size={13} />
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => setStatus("rejected")}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-xs"
              style={{ borderColor: "var(--nexora-alert)", color: "var(--nexora-alert)" }}
            >
              <X size={13} />
              Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Publicar en Meta / confirmar y activar / métricas ───────────────────────
function PublishSection({
  strategy,
  hasAdAccount,
  adAccountCurrency,
  hasApprovedPiece,
  metrics,
}: {
  strategy: MarketingStrategy;
  hasAdAccount: boolean;
  adAccountCurrency: string | null;
  hasApprovedPiece: boolean;
  metrics: StrategyMetricsSummary;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const budgetText = strategy.budgetAmount
    ? `${strategy.budgetAmount.toLocaleString("es-CO")} ${strategy.budgetCurrency}${strategy.budgetPeriod === "daily" ? "/día" : " en total"}`
    : "sin definir";

  async function handlePublish() {
    setBusy(true);
    setError(null);
    const res = await publishStrategyAction(strategy.id);
    setBusy(false);
    if (!res.ok) setError(res.message);
  }

  async function handleActivate() {
    setBusy(true);
    setError(null);
    const res = await activateStrategyAction(strategy.id);
    setBusy(false);
    setConfirming(false);
    if (res.error) setError(res.error);
  }

  async function handleSync() {
    setBusy(true);
    setError(null);
    const res = await syncStrategyMetricsAction(strategy.id);
    setBusy(false);
    if (res.error) setError(res.error);
  }

  return (
    <div className="space-y-4 rounded-2xl border p-5" style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}>
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--nexora-ink-dim)" }}>
        <Rocket size={14} />
        Publicar en Meta Ads
      </h2>

      {error && <p className="text-xs" style={{ color: "var(--nexora-alert)" }}>{error}</p>}

      {!strategy.externalId ? (
        <div className="space-y-3">
          {!hasAdAccount && (
            <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
              Primero conecta tu cuenta de Meta Ads en{" "}
              <Link href="/admin/marketing/conexiones" className="underline">
                Conexiones
              </Link>
              .
            </p>
          )}
          {hasAdAccount && !hasApprovedPiece && (
            <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
              Genera y aprueba al menos una pieza arriba antes de publicar.
            </p>
          )}
          {hasAdAccount && hasApprovedPiece && (
            <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
              Se publica en pausa (PAUSED) — Meta no gasta nada hasta que confirmes el paso siguiente.
              {adAccountCurrency && adAccountCurrency !== strategy.budgetCurrency && (
                <span style={{ color: "var(--nexora-alert)" }}>
                  {" "}Tu cuenta de Meta Ads factura en {adAccountCurrency}, pero el presupuesto está en {strategy.budgetCurrency}.
                </span>
              )}
            </p>
          )}
          <button
            type="button"
            onClick={handlePublish}
            disabled={busy || !hasAdAccount || !hasApprovedPiece}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-black disabled:opacity-40"
            style={{ background: "linear-gradient(120deg,#4CC2E8,#A78BFA)" }}
          >
            <Rocket size={15} />
            {busy ? "Publicando..." : "Publicar en Meta (queda en pausa)"}
          </button>
        </div>
      ) : strategy.externalStatus === "ACTIVE" ? (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm" style={{ color: "var(--nexora-signal)" }}>
            <CheckCircle2 size={16} />
            Campaña activa en Meta Ads desde {strategy.activatedAt ? new Date(strategy.activatedAt).toLocaleDateString("es-CO") : "—"}.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ConfigCell label="Gasto" value={`$${metrics.spendCop.toLocaleString("es-CO")}`} />
            <ConfigCell label="Alcance" value={metrics.reach.toLocaleString("es-CO")} />
            <ConfigCell label="Impresiones" value={metrics.impressions.toLocaleString("es-CO")} />
            <ConfigCell label="Clics" value={metrics.clicks.toLocaleString("es-CO")} />
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
            style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
          >
            <RefreshCcw size={14} />
            {busy ? "Actualizando..." : "Actualizar métricas"}
          </button>
          {metrics.lastSyncedAt && (
            <p className="text-[11px]" style={{ color: "var(--nexora-ink-dim)" }}>
              Última actualización: {new Date(metrics.lastSyncedAt).toLocaleString("es-CO")}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
            Publicada en Meta, en pausa. Antes de activar, confirma el gasto: <b>{budgetText}</b>, desde tu propia cuenta de Meta Ads.
          </p>
          <CampaignReviewCard review={strategy.reviewResult} />
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-black"
              style={{ background: "linear-gradient(120deg,#4CC2E8,#A78BFA)" }}
            >
              <Play size={15} />
              Confirmar y activar
            </button>
          ) : (
            <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: "var(--nexora-alert)" }}>
              <p className="text-sm" style={{ color: "var(--nexora-ink)" }}>
                ¿Confirmas activar esta campaña? Empezará a gastar <b>{budgetText}</b> de tu cuenta de Meta Ads.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={busy}
                  className="rounded-full px-4 py-1.5 text-xs font-medium text-black"
                  style={{ background: "var(--nexora-signal)" }}
                >
                  {busy ? "Activando..." : "Sí, activar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="rounded-full border px-4 py-1.5 text-xs"
                  style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Opinión del media buyer IA — segunda opinión antes de activar, nunca
// bloquea (ver campaignReviewService.ts). null cuando la campaña se publicó
// antes de que existiera este análisis, o si la revisión falló/no había
// créditos — en ese caso no se muestra nada, no se inventa una opinión. ──
const RISK_STYLE: Record<CampaignReviewResult["riskLevel"], { icon: typeof ShieldCheck; color: string; label: string }> = {
  ok: { icon: ShieldCheck, color: "var(--nexora-signal)", label: "Sin objeciones" },
  atencion: { icon: AlertTriangle, color: "#F5A524", label: "Para tener en cuenta" },
  alto: { icon: ShieldAlert, color: "var(--nexora-alert)", label: "Riesgo alto" },
};

function CampaignReviewCard({ review }: { review: CampaignReviewResult | null }) {
  if (!review) return null;
  const { icon: Icon, color, label } = RISK_STYLE[review.riskLevel];

  return (
    <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: color + "55", background: color + "0d" }}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color }}>
        <Icon size={14} />
        Opinión del subagente especializado en Meta Ads — {label}
      </div>
      <p className="text-sm" style={{ color: "var(--nexora-ink)" }}>{review.opinion}</p>
      {review.findings.length > 0 && (
        <ul className="space-y-1.5">
          {review.findings.map((f, i) => (
            <li key={i} className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
              <span className="font-medium" style={{ color: "var(--nexora-ink)" }}>{f.title}:</span> {f.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
