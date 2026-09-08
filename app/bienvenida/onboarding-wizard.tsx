"use client";

// Wizard de onboarding del primer login — experiencia inmersiva sobre el
// campo de estrellas (ver ./onboarding-starfield y ./layout). Lenguaje
// visual Nexora: panel de vidrio (backdrop-blur), wordmark iridiscente,
// resplandor con OrbitFrame/OrbitRing, transiciones suaves con
// framer-motion (que degradan a estáticas bajo prefers-reduced-motion).
//
// Pantallas:
//   welcome     → intro, elemento de marca central con glow + "Comenzar"
//   form        → paso "datos" (fullName / businessName / PhoneField) y
//                 paso "industria" (grilla visual agrupada por categoría)
//   submitting  → "Personalizando tu cuenta…", mientras pending === true
//   done        → "¡Listo!", cuando state.ok === true
//
// RESTRICCIÓN DURA: los DOS pasos del <form> (datos + industria) quedan
// SIEMPRE montados — se ocultan con `hidden` / opacidad, nunca se
// desmontan. PhoneField expone su valor con inputs ocultos DENTRO del
// <form>; si el paso 1 se desmontara, el teléfono saldría del FormData.
// Solo "welcome", "submitting" y "done" se renderizan condicionalmente
// (no están dentro del form).
import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type MotionProps,
} from "framer-motion";
import {
  ArrowRight,
  Check,
  Search,
  Sparkles,
  UtensilsCrossed,
  Shirt,
  Cpu,
  HeartPulse,
  Wrench,
  Home,
  BookOpen,
  ShoppingBag,
  Building2,
  Car,
  Plane,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrbitFrame } from "@/components/landing/OrbitFrame";
import { OrbitRing } from "@/components/landing/OrbitRing";
import { PhoneField } from "@/components/shared/PhoneField";
import { industryTypes } from "@/lib/validators/businessSchema";
import { INDUSTRY_CATEGORIES } from "@/lib/config/industryCategories";
import { completarOnboarding, type OnboardingState } from "./actions";

// Un ícono por categoría — mismo criterio y mismo mapa que
// superadmin/agentes/agent-templates-panel.tsx (Plantillas por industria):
// sin esto las 13 tarjetas se verían idénticas. Categoría sin entrada →
// Sparkles, nunca tumba la pantalla.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  gastronomica: UtensilsCrossed,
  textil: Shirt,
  tecnologia: Cpu,
  belleza: Sparkles,
  salud_bienestar: HeartPulse,
  talleres: Wrench,
  hogar: Home,
  papeleria: BookOpen,
  comercial: ShoppingBag,
  inmobiliaria_construccion: Building2,
  automotriz: Car,
  viajes: Plane,
  eventos_creatividad: PartyPopper,
};

const INDUSTRY_LABELS = new Map<string, string>(
  industryTypes.map((i) => [i.value, i.label])
);

const LOADING_MESSAGES = [
  "Creando el espacio de tu empresa",
  "Preparando tu agente para tu industria",
  "Dejando todo a punto",
];

// Sin tildes + minúsculas — para que "cafe" encuentre "Cafetería".
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const PILL_PRIMARY =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-8 text-sm font-medium transition-[filter,opacity] hover:brightness-95 disabled:pointer-events-none disabled:opacity-35";
const PILL_GHOST =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border px-6 text-sm font-medium transition-colors hover:bg-white/[0.06]";

export function OnboardingWizard({ defaultFullName }: { defaultFullName: string }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completarOnboarding,
    null
  );
  const reduce = useReducedMotion();

  const [started, setStarted] = useState(false);
  const [dataStep, setDataStep] = useState<"datos" | "industria">("datos");
  const [fullName, setFullName] = useState(defaultFullName);
  const [businessName, setBusinessName] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [query, setQuery] = useState("");
  const [msgIdx, setMsgIdx] = useState(0);

  const screen: "welcome" | "form" | "submitting" | "done" = state?.ok
    ? "done"
    : pending
      ? "submitting"
      : started
        ? "form"
        : "welcome";

  const step1Ready =
    fullName.trim().length >= 2 && businessName.trim().length >= 2;
  const errorText = state && !state.ok ? state.error : null;

  // Mensajes de "personalizando" rotando — avanzan hasta el último y se
  // quedan ahí. Bajo reduced motion no rotan (queda el primero fijo). El
  // reset a 0 lo hace el onClick del botón "Crear mi cuenta", no este
  // efecto (evita un setState síncrono en el cuerpo del efecto).
  useEffect(() => {
    if (screen !== "submitting" || reduce) return;
    const id = window.setInterval(() => {
      setMsgIdx((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 1600);
    return () => window.clearInterval(id);
  }, [screen, reduce]);

  const groups = useMemo(() => {
    const q = normalize(query);
    return INDUSTRY_CATEGORIES.map((cat) => ({
      key: cat.key,
      label: cat.label,
      Icon: CATEGORY_ICONS[cat.key] ?? Sparkles,
      items: cat.industryTypes
        .map((value) => ({ value, label: INDUSTRY_LABELS.get(value) ?? value }))
        .filter((it) => !q || normalize(it.label).includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const screenMotion: MotionProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -24 },
        transition: { duration: 0.5, ease: "easeOut" },
      };

  return (
    <div className="grid w-full max-w-xl">
      {/* FORM — SIEMPRE montado. Solo visible en el paso datos/industria;
          fuera de él se oculta con `hidden` (display:none, sigue montado)
          para que PhoneField no pierda sus inputs ocultos del FormData. */}
      <div
        className={
          screen === "form"
            ? "col-start-1 row-start-1"
            : "col-start-1 row-start-1 hidden"
        }
        aria-hidden={screen !== "form"}
      >
        <GlassCard>
          <StepHeader
            index={dataStep === "datos" ? 1 : 2}
            title={dataStep === "datos" ? "Tus datos" : "Tu industria"}
            subtitle={
              dataStep === "datos"
                ? "Con esto identificamos tu empresa y a ti."
                : "Preparamos tu agente según tu tipo de negocio."
            }
          />

          <form action={formAction} className="space-y-5">
            {/* PASO 1 — datos (montado siempre; oculto en el paso 2) */}
            <div className={dataStep === "datos" ? "space-y-4" : "hidden"}>
              <Field label="Tu nombre" htmlFor="fullName">
                <Input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 border-white/10 bg-white/[0.03]"
                />
              </Field>

              <Field label="Nombre de tu empresa" htmlFor="businessName">
                <Input
                  id="businessName"
                  name="businessName"
                  autoComplete="organization"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="h-10 border-white/10 bg-white/[0.03]"
                />
              </Field>

              <PhoneField />

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  disabled={!step1Ready}
                  onClick={() => setDataStep("industria")}
                  className={PILL_PRIMARY}
                  style={{
                    backgroundColor: "var(--nexora-nova)",
                    color: "var(--nexora-nova-ink)",
                  }}
                >
                  Continuar
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* PASO 2 — industria + submit (montado siempre; oculto en el paso 1) */}
            <div className={dataStep === "industria" ? "space-y-4" : "hidden"}>
              {/* Selección sincronizada a un input oculto que lee la action. */}
              <input type="hidden" name="industryType" value={industryType} />

              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--nexora-ink-dim)" }}
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Busca tu tipo de negocio"
                  aria-label="Buscar tipo de negocio"
                  className="h-10 border-white/10 bg-white/[0.03] pl-9"
                />
              </div>

              <div className="-mx-1 max-h-[44vh] space-y-5 overflow-y-auto px-1 py-1">
                {groups.length === 0 ? (
                  <p
                    className="py-8 text-center text-sm"
                    style={{ color: "var(--nexora-ink-dim)" }}
                  >
                    Ningún tipo de negocio coincide con «{query}».
                  </p>
                ) : (
                  groups.map((g) => (
                    <div key={g.key}>
                      <div className="mb-2 flex items-center justify-center gap-1.5">
                        <g.Icon
                          size={13}
                          strokeWidth={1.75}
                          style={{ color: "var(--nexora-ink-dim)" }}
                        />
                        <span
                          className="text-[11px] font-medium uppercase tracking-[0.14em]"
                          style={{ color: "var(--nexora-ink-dim)" }}
                        >
                          {g.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {g.items.map((it) => {
                          const selected = industryType === it.value;
                          return (
                            <button
                              key={it.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setIndustryType(it.value)}
                              className="relative flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-center text-xs leading-tight transition-colors"
                              style={
                                selected
                                  ? {
                                      borderColor: "var(--nexora-ink)",
                                      backgroundColor:
                                        "color-mix(in oklch, var(--nexora-ink) 10%, transparent)",
                                      color: "var(--nexora-ink)",
                                    }
                                  : {
                                      borderColor: "var(--nexora-line)",
                                      backgroundColor:
                                        "color-mix(in oklch, var(--nexora-panel) 55%, transparent)",
                                      color: "var(--nexora-ink-dim)",
                                    }
                              }
                            >
                              {selected && (
                                <Check size={13} strokeWidth={2.5} className="shrink-0" />
                              )}
                              {it.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {errorText && (
                <p
                  className="rounded-xl border p-3 text-center text-sm"
                  style={{
                    borderColor:
                      "color-mix(in oklch, var(--nexora-alert) 30%, transparent)",
                    backgroundColor:
                      "color-mix(in oklch, var(--nexora-alert) 12%, transparent)",
                    color: "var(--nexora-alert)",
                  }}
                >
                  {errorText}
                </p>
              )}

              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDataStep("datos")}
                  className={PILL_GHOST}
                  style={{
                    borderColor: "var(--nexora-line)",
                    color: "var(--nexora-ink-dim)",
                  }}
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={pending || !industryType}
                  onClick={() => setMsgIdx(0)}
                  className={PILL_PRIMARY}
                  style={{
                    backgroundColor: "var(--nexora-nova)",
                    color: "var(--nexora-nova-ink)",
                  }}
                >
                  Crear mi cuenta
                </button>
              </div>
            </div>
          </form>
        </GlassCard>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {screen === "welcome" && (
          <motion.div
            key="welcome"
            {...screenMotion}
            className="col-start-1 row-start-1 flex flex-col items-center text-center"
          >
            <BrandOrb spinDuration="6s" glowClassName="nexora-breathe">
              <Sparkles size={30} strokeWidth={1.25} style={{ color: "var(--nexora-ink)" }} />
            </BrandOrb>

            <p
              className="mt-8 mb-3 text-[11px] uppercase tracking-[0.34em]"
              style={{ color: "var(--nexora-ink-dim)" }}
            >
              Bienvenido a
            </p>
            <h1 className="aventhra-logo text-3xl tracking-[0.14em] sm:text-4xl">
              <span className="aventhra-iridescent">AVENTHRA</span>
            </h1>
            <p
              className="aventhra-copy mx-auto mt-4 max-w-sm text-sm"
              style={{ color: "var(--nexora-ink-dim)" }}
            >
              Vamos a dejar tu agente listo en un minuto.
            </p>

            <div className="mt-9">
              <OrbitRing radius={9999}>
                <button
                  type="button"
                  onClick={() => setStarted(true)}
                  className="inline-flex h-11 items-center gap-2 rounded-full px-8 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: "var(--nexora-void)",
                    color: "var(--nexora-ink)",
                  }}
                >
                  Comenzar
                  <ArrowRight size={15} />
                </button>
              </OrbitRing>
            </div>
          </motion.div>
        )}

        {screen === "submitting" && (
          <motion.div
            key="submitting"
            {...screenMotion}
            className="col-start-1 row-start-1 flex flex-col items-center text-center"
          >
            <BrandOrb spinDuration="1.6s" glowClassName="nexora-breathe">
              <Sparkles
                size={28}
                strokeWidth={1.25}
                className="nexora-pulse rounded-full"
                style={{ color: "var(--nexora-ink)" }}
              />
            </BrandOrb>

            <h2
              className="font-nexora mt-8 text-xl sm:text-2xl"
              style={{ color: "var(--nexora-ink)" }}
            >
              Personalizando tu cuenta
            </h2>
            <div className="mt-3 h-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={msgIdx}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm"
                  style={{ color: "var(--nexora-ink-dim)" }}
                >
                  {LOADING_MESSAGES[msgIdx]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {screen === "done" && (
          <motion.div
            key="done"
            {...screenMotion}
            className="col-start-1 row-start-1 flex flex-col items-center text-center"
          >
            <BrandOrb spinDuration="5s" glowClassName="nexora-breathe">
              <Check size={32} strokeWidth={1.5} style={{ color: "var(--nexora-ink)" }} />
            </BrandOrb>

            <h2 className="font-nexora mt-8 text-2xl sm:text-3xl">
              <span className="aventhra-iridescent">¡Listo!</span>
            </h2>
            <p
              className="aventhra-copy mx-auto mt-3 max-w-sm text-sm"
              style={{ color: "var(--nexora-ink-dim)" }}
            >
              Tu cuenta quedó configurada y tu agente ya tiene una base según
              tu industria. El último paso es darle tu tono y tus reglas.
            </p>

            <div className="mt-9 flex w-full max-w-xs flex-col items-center gap-3">
              <OrbitRing radius={9999} className="w-full">
                <Link
                  href="/admin/mi-agente"
                  className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: "var(--nexora-void)",
                    color: "var(--nexora-ink)",
                  }}
                >
                  <Sparkles size={16} />
                  Personaliza tu agente
                </Link>
              </OrbitRing>
              <Link
                href="/admin"
                className="text-sm transition-opacity hover:opacity-80"
                style={{ color: "var(--nexora-ink-dim)" }}
              >
                Ir al panel
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- piezas internas --- */

function GlassCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-[28px] border p-6 backdrop-blur-xl sm:p-8"
      style={{
        borderColor: "var(--nexora-line)",
        backgroundColor: "color-mix(in oklch, var(--nexora-panel) 68%, transparent)",
        boxShadow: "0 32px 90px -24px rgba(0, 0, 0, 0.75)",
      }}
    >
      {children}
    </div>
  );
}

function StepHeader({
  index,
  title,
  subtitle,
}: {
  index: 1 | 2;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6 text-center">
      <div className="mx-auto mb-3 flex w-full max-w-[160px] gap-1.5">
        {[1, 2].map((n) => (
          <span
            key={n}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              backgroundColor:
                n <= index ? "var(--nexora-ink)" : "var(--nexora-line)",
            }}
          />
        ))}
      </div>
      <p
        className="mb-2 text-[11px] uppercase tracking-[0.2em]"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        Paso {index} de 2
      </p>
      <h2
        className="font-nexora text-xl sm:text-2xl"
        style={{ color: "var(--nexora-ink)" }}
      >
        {title}
      </h2>
      <p className="mt-1.5 text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
        {subtitle}
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="justify-center text-xs tracking-wide"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

// Elemento de marca central: anillo cónico girando (OrbitFrame) alrededor
// de un disco sólido, con un halo iridiscente difuminado detrás. El halo
// "respira" (nexora-breathe) — se apaga bajo prefers-reduced-motion; el
// giro del anillo también (OrbitFrame usa .nexora-navlogin-orbit, que ya
// respeta reduced-motion).
function BrandOrb({
  children,
  spinDuration,
  glowClassName,
}: {
  children: ReactNode;
  spinDuration: string;
  glowClassName?: string;
}) {
  return (
    <div className="relative flex items-center justify-center">
      <span
        aria-hidden
        className={`aventhra-iridescent-bg pointer-events-none absolute h-40 w-40 rounded-full blur-[55px] ${glowClassName ?? ""}`}
      />
      <OrbitFrame
        className="relative inline-flex shrink-0 rounded-full"
        innerClassName="flex h-24 w-24 items-center justify-center rounded-full bg-background"
        ringSize="h-[190px] w-[190px]"
        spinDuration={spinDuration}
      >
        {children}
      </OrbitFrame>
    </div>
  );
}
