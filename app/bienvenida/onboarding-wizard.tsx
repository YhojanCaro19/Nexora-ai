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
  ChevronDown,
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
  const [openCat, setOpenCat] = useState<string | null>(null);
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
    <motion.div
      className="grid w-full max-w-xl"
      // Revelado de entrada: el contenido aparece ~0.55s DESPUÉS del fondo
      // (estrellas + estela), con una subida suave. Bajo reduced motion
      // solo un fundido leve, sin desplazamiento.
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: reduce ? 0.4 : 0.85, ease: [0.16, 1, 0.3, 1] }}
    >
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
        <div className="mx-auto w-full max-w-lg">
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

              <div className="flex justify-center pt-2">
                <OrbitPillButton
                  disabled={!step1Ready}
                  onClick={() => setDataStep("industria")}
                >
                  Continuar
                  <ArrowRight size={15} />
                </OrbitPillButton>
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

              <div className="-mx-1 max-h-[46vh] overflow-y-auto px-1">
                {groups.length === 0 ? (
                  <p
                    className="py-8 text-center text-sm"
                    style={{ color: "var(--nexora-ink-dim)" }}
                  >
                    Ningún tipo de negocio coincide con «{query}».
                  </p>
                ) : (
                  groups.map((g) => {
                    // Con búsqueda activa se abre todo; si no, acordeón de a uno.
                    const expanded = query.trim() !== "" || openCat === g.key;
                    return (
                      <div
                        key={g.key}
                        className="border-t first:border-t-0"
                        style={{ borderColor: "var(--nexora-line)" }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenCat((c) => (c === g.key ? null : g.key))
                          }
                          aria-expanded={expanded}
                          className="flex w-full items-center justify-center gap-2 py-3.5 transition-colors"
                        >
                          <g.Icon
                            size={13}
                            strokeWidth={1.75}
                            style={{ color: "var(--nexora-ink-dim)" }}
                          />
                          <span
                            className="text-[11px] font-medium uppercase tracking-[0.16em]"
                            style={{
                              color: expanded
                                ? "var(--nexora-ink)"
                                : "var(--nexora-ink-dim)",
                            }}
                          >
                            {g.label}
                          </span>
                          <ChevronDown
                            size={14}
                            className="transition-transform"
                            style={{
                              color: "var(--nexora-ink-dim)",
                              transform: expanded ? "rotate(180deg)" : "none",
                            }}
                          />
                        </button>

                        {expanded && (
                          <div className="flex flex-wrap justify-center gap-2 pb-4">
                            {g.items.map((it) => {
                              const selected = industryType === it.value;
                              return (
                                <button
                                  key={it.value}
                                  type="button"
                                  aria-pressed={selected}
                                  onClick={() => setIndustryType(it.value)}
                                  className="relative flex min-h-[2.75rem] w-36 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-center text-xs leading-tight transition-colors"
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
                                    <Check
                                      size={13}
                                      strokeWidth={2.5}
                                      className="shrink-0"
                                    />
                                  )}
                                  {it.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
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

              <div className="flex items-center justify-center gap-3 pt-2">
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
                <OrbitPillButton
                  type="submit"
                  disabled={pending || !industryType}
                  onClick={() => setMsgIdx(0)}
                >
                  Crear mi cuenta
                </OrbitPillButton>
              </div>
            </div>
          </form>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {screen === "welcome" && (
          <motion.div
            key="welcome"
            {...screenMotion}
            className="col-start-1 row-start-1 flex flex-col items-center text-center"
          >
            <p
              className="mb-4 text-[11px] uppercase tracking-[0.34em]"
              style={{ color: "var(--nexora-ink-dim)" }}
            >
              Bienvenido a
            </p>
            <h1 className="aventhra-logo text-5xl tracking-[0.16em] sm:text-6xl">
              <span className="aventhra-iridescent">AVENTHRA</span>
            </h1>
            <p
              className="aventhra-copy mx-auto mt-5 max-w-sm text-sm sm:text-base"
              style={{ color: "var(--nexora-ink-dim)" }}
            >
              Personalicemos tu experiencia.
            </p>

            <div className="mt-10">
              <OrbitPillButton onClick={() => setStarted(true)}>
                Comenzar
                <ArrowRight size={15} />
              </OrbitPillButton>
            </div>
          </motion.div>
        )}

        {screen === "submitting" && (
          <motion.div
            key="submitting"
            {...screenMotion}
            className="col-start-1 row-start-1 flex flex-col items-center text-center"
          >
            <GlowMark>
              <Sparkles
                size={26}
                strokeWidth={1.5}
                className="nexora-pulse"
                style={{ color: "var(--nexora-ink)" }}
              />
            </GlowMark>

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
            <GlowMark>
              <Check size={30} strokeWidth={2} style={{ color: "var(--nexora-ink)" }} />
            </GlowMark>

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

            <div className="mt-9 flex flex-col items-center gap-4">
              <GradientPill as="link" href="/admin/mi-agente">
                <Sparkles size={16} />
                Personaliza tu agente
              </GradientPill>
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
    </motion.div>
  );
}

/* --- piezas internas --- */

// Píldora oscura con el anillo de degradado girando (OrbitFrame /
// .nexora-navlogin-orbit) — el mismo botón del welcome ("Comenzar"). El
// anillo gira SIEMPRE, también deshabilitado (pedido del usuario); el
// estado deshabilitado se nota por el texto tenue y `cursor-not-allowed`.
function OrbitPillButton({
  children,
  type = "button",
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <OrbitFrame
      className="inline-block rounded-full"
      innerClassName="rounded-full"
      ringSize="h-[240px] w-[240px]"
    >
      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        className="flex items-center gap-2 rounded-full px-9 py-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
        style={{
          backgroundColor: "#0b0b0f",
          color: disabled ? "var(--nexora-ink-dim)" : "var(--nexora-ink)",
        }}
      >
        {children}
      </button>
    </OrbitFrame>
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
              background:
                n <= index
                  ? "linear-gradient(90deg, #4CC2E8, #A78BFA)"
                  : "var(--nexora-line)",
            }}
          />
        ))}
      </div>
      <p className="aventhra-iridescent mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
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

// Disco de marca para "personalizando" y "listo": un círculo con borde de
// degradado (patrón p-px, mismo que OrbitButton de la landing) y un halo
// RADIAL (círculo de verdad, no el degradado lineal que se veía cuadrado)
// difuminado detrás que "respira".
function GlowMark({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex items-center justify-center">
      <span
        aria-hidden
        className="nexora-breathe pointer-events-none absolute h-56 w-56 rounded-full blur-[60px]"
        style={{
          background:
            "radial-gradient(circle, rgba(129,140,248,0.55), rgba(76,194,232,0.22) 55%, transparent 76%)",
        }}
      />
      <span className="relative inline-flex rounded-full bg-[linear-gradient(120deg,#4CC2E8,#A78BFA_55%,#4CC2E8)] p-px">
        <span
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--nexora-void)" }}
        >
          {children}
        </span>
      </span>
    </div>
  );
}

// Píldora con borde de degradado (cian → violeta → cian), interior oscuro
// sólido — sin anillo girando ni SVG (los intentos con OrbitRing dejaban
// arcos sueltos alrededor del botón). Sirve como <button> o como <Link>.
function GradientPill({
  as,
  href,
  onClick,
  children,
}: {
  as: "button" | "link";
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const inner =
    "flex items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-medium transition-colors";
  const innerStyle = { backgroundColor: "#0b0b0f", color: "var(--nexora-ink)" };
  return (
    <span className="group inline-block rounded-full bg-[linear-gradient(120deg,#4CC2E8,#A78BFA_55%,#4CC2E8)] p-px transition-shadow duration-300 hover:shadow-[0_0_28px_-4px_rgba(129,140,248,0.45)]">
      {as === "link" && href ? (
        <Link href={href} className={inner} style={innerStyle}>
          {children}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={inner} style={innerStyle}>
          {children}
        </button>
      )}
    </span>
  );
}
