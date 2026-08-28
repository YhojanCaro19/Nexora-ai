"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Target,
  Users,
  Package,
  Wallet,
  Rocket,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createStrategyAction } from "../actions";
import type { StrategyWizardAnswers } from "@/lib/services/strategyService";

const GOALS = [
  { value: "Vender más", icon: "💰" },
  { value: "Dar a conocer el negocio", icon: "📣" },
  { value: "Recuperar clientes", icon: "🔁" },
  { value: "Lanzar un producto", icon: "🚀" },
  { value: "Conseguir más contactos", icon: "🎯" },
];

const CHANNELS = [
  { key: "meta", label: "Meta", sub: "Instagram · Facebook" },
  { key: "google", label: "Google", sub: "Búsqueda · YouTube" },
  { key: "tiktok", label: "TikTok", sub: "Video corto" },
  { key: "organic", label: "Orgánico", sub: "WhatsApp · redes propias" },
];

const STEPS = [
  { icon: Target, title: "¿Qué quieres lograr?" },
  { icon: Users, title: "¿A quién le vendes?" },
  { icon: Package, title: "¿Qué vas a impulsar?" },
  { icon: Wallet, title: "Presupuesto y canales" },
  { icon: Rocket, title: "Últimos detalles" },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl p-px text-left transition-transform active:scale-[0.98]"
      style={{
        background: active
          ? "linear-gradient(120deg,#4CC2E8,#A78BFA)"
          : "var(--nexora-line)",
      }}
    >
      <span
        className="flex h-full w-full rounded-[11px] px-4 py-3"
        style={{ background: active ? "rgba(129,140,248,0.10)" : "var(--nexora-panel)" }}
      >
        {children}
      </span>
    </button>
  );
}

export default function NuevaEstrategiaPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [focus, setFocus] = useState("");
  const [differentiator, setDifferentiator] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState<"COP" | "USD">("COP");
  const [channels, setChannels] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("Español");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepValid = [
    goal.trim().length > 0,
    audience.trim().length > 3,
    focus.trim().length > 1,
    channels.length > 0,
    true,
  ][step];

  const isLast = step === STEPS.length - 1;

  function toggleChannel(key: string) {
    setChannels((p) => (p.includes(key) ? p.filter((c) => c !== key) : [...p, key]));
  }

  async function submit() {
    setError(null);
    setLoading(true);
    const answers: StrategyWizardAnswers = {
      goal: goal.trim(),
      audience: audience.trim(),
      focus: focus.trim(),
      differentiator: differentiator.trim(),
      monthlyBudget: budget.trim() ? Number(budget.replace(/[^\d]/g, "")) : null,
      budgetCurrency: currency,
      channels,
      language,
    };
    const res = await createStrategyAction(name, answers);
    setLoading(false);
    if (!res.ok) {
      setError(
        res.reason === "insufficient_credits"
          ? `Necesitas ${res.needed} créditos y tienes ${res.have}. Recarga para generar la estrategia.`
          : res.message
      );
      return;
    }
    router.push(`/admin/marketing/${res.strategyId}`);
  }

  const StepIcon = STEPS[step].icon;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-xl flex-col">
      <Link
        href="/admin/marketing"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        <ChevronLeft size={16} />
        Mis estrategias
      </Link>

      {/* Progreso */}
      <div className="mt-6 h-1 overflow-hidden rounded-full" style={{ background: "var(--nexora-line)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${((step + 1) / STEPS.length) * 100}%`,
            background: "linear-gradient(90deg,#4CC2E8,#A78BFA,#E879C7)",
          }}
        />
      </div>
      <p className="mt-2 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
        Paso {step + 1} de {STEPS.length}
      </p>

      {/* Contenido del paso */}
      <div className="mt-8 flex-1">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(129,140,248,0.12)" }}
          >
            <StepIcon size={18} style={{ color: "#818CF8" }} />
          </span>
          <h1 className="font-nexora text-xl" style={{ color: "var(--nexora-ink)" }}>
            {STEPS[step].title}
          </h1>
        </div>

        <div className="mt-6 space-y-4">
          {step === 0 && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {GOALS.map((g) => (
                  <Chip key={g.value} active={goal === g.value} onClick={() => setGoal(g.value)}>
                    <span className="text-sm" style={{ color: "var(--nexora-ink)" }}>
                      {g.icon} {g.value}
                    </span>
                  </Chip>
                ))}
              </div>
              <Input
                value={GOALS.some((g) => g.value === goal) ? "" : goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="O escríbelo con tus palabras"
              />
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
                Describe a tu cliente ideal: edad, ciudad, qué le importa, cómo compra.
              </p>
              <Textarea
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Ej: mujeres de 25 a 40 en Medellín, hacen ejercicio, cuidan su alimentación, compran por Instagram y WhatsApp"
                rows={4}
                autoFocus
              />
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  Producto o servicio a impulsar
                </label>
                <Input
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="Ej: las gomitas quemagrasas"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  ¿Qué te diferencia de la competencia? (opcional)
                </label>
                <Textarea
                  value={differentiator}
                  onChange={(e) => setDifferentiator(e.target.value)}
                  placeholder="Ej: ingredientes naturales, envío el mismo día, atención personalizada"
                  rows={3}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  Presupuesto mensual de pauta (opcional)
                </label>
                <div className="flex gap-2">
                  <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: "var(--nexora-line)" }}>
                    {(["COP", "USD"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCurrency(c)}
                        className="rounded-md px-2.5 py-1 text-xs"
                        style={{
                          background: currency === c ? "var(--nexora-nova)" : "transparent",
                          color: currency === c ? "#0a0a0f" : "var(--nexora-ink-dim)",
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Ej: 500000"
                    inputMode="numeric"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  ¿En qué canales?
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CHANNELS.map((c) => (
                    <Chip key={c.key} active={channels.includes(c.key)} onClick={() => toggleChannel(c.key)}>
                      <span className="flex flex-col">
                        <span className="text-sm" style={{ color: "var(--nexora-ink)" }}>{c.label}</span>
                        <span className="text-[11px]" style={{ color: "var(--nexora-ink-dim)" }}>{c.sub}</span>
                      </span>
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  Nombre de la estrategia (opcional)
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Ventas de temporada"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  Idioma de la comunicación
                </label>
                <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
              </div>

              <div
                className="rounded-xl border p-4 text-sm"
                style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink-dim)" }}
              >
                <p><b style={{ color: "var(--nexora-ink)" }}>Objetivo:</b> {goal || "—"}</p>
                <p><b style={{ color: "var(--nexora-ink)" }}>Producto:</b> {focus || "—"}</p>
                <p><b style={{ color: "var(--nexora-ink)" }}>Canales:</b> {channels.join(", ") || "—"}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p
          className="mt-4 rounded-lg border p-3 text-sm"
          style={{
            borderColor: "rgba(248,113,113,0.3)",
            background: "rgba(248,113,113,0.08)",
            color: "var(--nexora-alert)",
          }}
        >
          {error}
        </p>
      )}

      {/* Navegación */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || loading}
          className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm disabled:opacity-0"
          style={{ color: "var(--nexora-ink-dim)" }}
        >
          <ChevronLeft size={16} />
          Atrás
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-black disabled:opacity-60"
            style={{ background: "linear-gradient(120deg,#4CC2E8,#A78BFA)" }}
          >
            <Sparkles size={16} />
            {loading ? "Generando..." : "Generar estrategia · 250 créditos"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!stepValid}
            className="inline-flex items-center gap-1 rounded-full px-6 py-2.5 text-sm font-medium disabled:opacity-40"
            style={{ background: "var(--nexora-nova)", color: "#0a0a0f" }}
          >
            Siguiente
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
