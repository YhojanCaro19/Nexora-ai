"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createStrategyAction } from "../actions";
import type { StrategyWizardAnswers } from "@/lib/services/strategyService";

const GOALS = [
  "Vender más",
  "Dar a conocer el negocio",
  "Recuperar clientes",
  "Lanzar un producto",
  "Conseguir más contactos",
];

const CHANNELS: { key: string; label: string }[] = [
  { key: "meta", label: "Meta (Instagram/Facebook)" },
  { key: "google", label: "Google" },
  { key: "tiktok", label: "TikTok" },
  { key: "organic", label: "Orgánico / WhatsApp" },
];

const fieldLabel = "block text-xs font-medium tracking-wide";
const labelStyle = { color: "var(--nexora-ink-dim)" } as const;

export default function NuevaEstrategiaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [focus, setFocus] = useState("");
  const [differentiator, setDifferentiator] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState<"COP" | "USD">("COP");
  const [channels, setChannels] = useState<string[]>([]);
  const [language, setLanguage] = useState("Español");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = goal.trim() && audience.trim() && focus.trim() && channels.length > 0 && !loading;

  function toggleChannel(key: string) {
    setChannels((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
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
      if (res.reason === "insufficient_credits") {
        setError(`Necesitas ${res.needed} créditos y tienes ${res.have}. Recarga para generar la estrategia.`);
      } else {
        setError(res.message);
      }
      return;
    }
    router.push(`/admin/marketing/${res.strategyId}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/admin/marketing"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        <ChevronLeft size={16} />
        Mis estrategias
      </Link>

      <div className="text-center">
        <h1 className="font-nexora text-xl" style={{ color: "var(--nexora-ink)" }}>
          Nueva estrategia
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          Cuéntanos lo básico y la IA arma la estrategia. Cuesta 250 créditos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className={fieldLabel} style={labelStyle}>Nombre (opcional)</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Ventas de temporada" />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel} style={labelStyle}>¿Qué quieres lograr?</label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className="rounded-full border px-3 py-1 text-xs transition-colors"
                style={{
                  borderColor: goal === g ? "var(--nexora-nova)" : "var(--nexora-line)",
                  color: goal === g ? "var(--nexora-ink)" : "var(--nexora-ink-dim)",
                }}
              >
                {g}
              </button>
            ))}
          </div>
          <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="O escríbelo tú" />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel} style={labelStyle}>¿A quién le vendes? (cliente ideal)</label>
          <Textarea
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Ej: mujeres 25-40 en Medellín que hacen ejercicio y cuidan su alimentación"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel} style={labelStyle}>¿Qué producto o servicio quieres impulsar?</label>
          <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Ej: las gomitas quemagrasas" />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel} style={labelStyle}>¿Qué te diferencia de la competencia?</label>
          <Textarea
            value={differentiator}
            onChange={(e) => setDifferentiator(e.target.value)}
            placeholder="Ej: ingredientes naturales, envío el mismo día, atención personalizada"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel} style={labelStyle}>Presupuesto mensual de pauta (opcional)</label>
          <div className="flex gap-2">
            <div
              className="inline-flex rounded-lg border p-0.5"
              style={{ borderColor: "var(--nexora-line)" }}
            >
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
          <label className={fieldLabel} style={labelStyle}>¿En qué canales?</label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => toggleChannel(c.key)}
                className="rounded-full border px-3 py-1 text-xs transition-colors"
                style={{
                  borderColor: channels.includes(c.key) ? "var(--nexora-nova)" : "var(--nexora-line)",
                  color: channels.includes(c.key) ? "var(--nexora-ink)" : "var(--nexora-ink-dim)",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel} style={labelStyle}>Idioma de la comunicación</label>
          <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
        </div>

        {error && (
          <p
            className="rounded-lg border p-3 text-sm"
            style={{
              borderColor: "rgba(248,113,113,0.3)",
              background: "rgba(248,113,113,0.08)",
              color: "var(--nexora-alert)",
            }}
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full gap-2 bg-[#4CC2E8] font-medium text-black hover:bg-[#4CC2E8]/90"
        >
          <Sparkles size={16} />
          {loading ? "Generando estrategia..." : "Generar estrategia (250 créditos)"}
        </Button>
      </form>
    </div>
  );
}
