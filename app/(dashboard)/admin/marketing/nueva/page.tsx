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
  Palette,
  Rocket,
  Upload,
  X,
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
  { icon: Palette, title: "Cómo se deben ver las piezas" },
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
        className="flex h-full w-full rounded-[11px] px-5 py-4"
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

  const [brandColor, setBrandColor] = useState("");
  const [styleDescription, setStyleDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepValid = [
    goal.trim().length > 0,
    audience.trim().length > 3,
    focus.trim().length > 1,
    channels.length > 0,
    styleDescription.trim().length > 3,
    true,
  ][step];

  function handleLogoChange(f: File | null) {
    setLogoError(null);
    if (f && f.type !== "image/png") {
      setLogoError("El logo debe ser un archivo PNG (para conservar el fondo transparente).");
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }
    setLogoFile(f);
    setLogoPreview(f ? URL.createObjectURL(f) : null);
  }

  function handleReferenceChange(f: File | null) {
    setReferenceFile(f);
    setReferencePreview(f ? URL.createObjectURL(f) : null);
  }

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
      brandColor: brandColor.trim() || null,
      styleDescription: styleDescription.trim() || null,
    };
    const res = await createStrategyAction(name, answers, logoFile, referenceFile);
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
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-3xl flex-col">
      <Link
        href="/admin/marketing"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        <ChevronLeft size={16} />
        Mis estrategias
      </Link>

      {/* Progreso */}
      <div className="mt-8 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--nexora-line)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${((step + 1) / STEPS.length) * 100}%`,
            background: "linear-gradient(90deg,#4CC2E8,#A78BFA,#E879C7)",
          }}
        />
      </div>
      <p className="mt-3 text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
        Paso {step + 1} de {STEPS.length}
      </p>

      {/* Contenido del paso */}
      <div className="mt-10 flex-1">
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "rgba(129,140,248,0.12)" }}
          >
            <StepIcon size={26} style={{ color: "#818CF8" }} />
          </span>
          <h1 className="font-nexora text-3xl" style={{ color: "var(--nexora-ink)" }}>
            {STEPS[step].title}
          </h1>
        </div>

        <div className="mt-8 space-y-5 text-base">
          {step === 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {GOALS.map((g) => (
                  <Chip key={g.value} active={goal === g.value} onClick={() => setGoal(g.value)}>
                    <span className="text-base" style={{ color: "var(--nexora-ink)" }}>
                      {g.icon} {g.value}
                    </span>
                  </Chip>
                ))}
              </div>
              <Input
                value={GOALS.some((g) => g.value === goal) ? "" : goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="O escríbelo con tus palabras"
                className="h-12 px-4 text-base"
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
                rows={5}
                autoFocus
                className="px-4 py-3 text-base"
              />
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  Producto o servicio a impulsar
                </label>
                <Input
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="Ej: las gomitas quemagrasas"
                  autoFocus
                  className="h-12 px-4 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  ¿Qué te diferencia de la competencia? (opcional)
                </label>
                <Textarea
                  value={differentiator}
                  onChange={(e) => setDifferentiator(e.target.value)}
                  placeholder="Ej: ingredientes naturales, envío el mismo día, atención personalizada"
                  rows={4}
                  className="px-4 py-3 text-base"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  Presupuesto mensual de pauta (opcional)
                </label>
                <div className="flex gap-3">
                  <div className="inline-flex rounded-lg border p-1" style={{ borderColor: "var(--nexora-line)" }}>
                    {(["COP", "USD"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCurrency(c)}
                        className="rounded-md px-3.5 py-2 text-sm"
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
                    className="h-12 flex-1 px-4 text-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  ¿En qué canales?
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CHANNELS.map((c) => (
                    <Chip key={c.key} active={channels.includes(c.key)} onClick={() => toggleChannel(c.key)}>
                      <span className="flex flex-col">
                        <span className="text-base" style={{ color: "var(--nexora-ink)" }}>{c.label}</span>
                        <span className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>{c.sub}</span>
                      </span>
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
                Describe cómo quieres que se vea la imagen — es obligatorio, es lo que más mejora el resultado. El
                color, el logo y la foto del producto son opcionales.
              </p>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  Color de marca (opcional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor || "#4CC2E8"}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-12 w-14 cursor-pointer rounded-lg border bg-transparent p-1"
                    style={{ borderColor: "var(--nexora-line)" }}
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    placeholder="Sin preferencia — ej. #4CC2E8"
                    className="h-12 flex-1 px-4 text-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  ¿Cómo te imaginas la imagen?
                </label>
                <Textarea
                  value={styleDescription}
                  onChange={(e) => setStyleDescription(e.target.value)}
                  placeholder="Ej: fondo blanco tipo estudio, que se vea solo el producto, ambiente cálido de barbería"
                  rows={4}
                  autoFocus
                  className="px-4 py-3 text-base"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  Tu logo (opcional, solo PNG con fondo transparente)
                </label>
                {logoPreview ? (
                  <div className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--nexora-line)" }}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/90">
                      {/* eslint-disable-next-line @next/next/no-img-element -- preview de un blob local, next/image no aplica */}
                      <img src={logoPreview} alt="Logo" className="h-11 w-11 object-contain" />
                    </div>
                    <span className="flex-1 truncate text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                      {logoFile?.name}
                    </span>
                    <button type="button" onClick={() => handleLogoChange(null)} className="rounded-full p-1.5" style={{ color: "var(--nexora-ink-dim)" }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-base"
                    style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink-dim)" }}
                  >
                    <Upload size={15} />
                    Subir logo (PNG)
                    <input
                      type="file"
                      accept="image/png"
                      className="hidden"
                      onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
                {logoError && <p className="text-xs" style={{ color: "var(--nexora-alert)" }}>{logoError}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  Foto real del producto (opcional, JPG o PNG)
                </label>
                <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
                  Si la subes, la IA usa el producto real (su forma y color) en vez de inventar uno parecido.
                </p>
                {referencePreview ? (
                  <div className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--nexora-line)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview de un blob local */}
                    <img src={referencePreview} alt="Producto" className="h-14 w-14 rounded-lg object-cover" />
                    <span className="flex-1 truncate text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                      {referenceFile?.name}
                    </span>
                    <button type="button" onClick={() => handleReferenceChange(null)} className="rounded-full p-1.5" style={{ color: "var(--nexora-ink-dim)" }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-base"
                    style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink-dim)" }}
                  >
                    <Upload size={15} />
                    Subir foto del producto
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => handleReferenceChange(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  Nombre de la estrategia (opcional)
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Ventas de temporada"
                  autoFocus
                  className="h-12 px-4 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--nexora-ink-dim)" }}>
                  Idioma de la comunicación
                </label>
                <Input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="h-12 px-4 text-base"
                />
              </div>

              <div
                className="space-y-1 rounded-xl border p-5 text-base"
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
      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || loading}
          className="inline-flex items-center gap-1 rounded-full px-5 py-3 text-base disabled:opacity-0"
          style={{ color: "var(--nexora-ink-dim)" }}
        >
          <ChevronLeft size={18} />
          Atrás
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-medium text-black disabled:opacity-60"
            style={{ background: "linear-gradient(120deg,#4CC2E8,#A78BFA)" }}
          >
            <Sparkles size={18} />
            {loading ? "Generando..." : "Generar estrategia · 250 créditos"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!stepValid}
            className="inline-flex items-center gap-1 rounded-full px-8 py-3.5 text-base font-medium disabled:opacity-40"
            style={{ background: "var(--nexora-nova)", color: "#0a0a0f" }}
          >
            Siguiente
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
