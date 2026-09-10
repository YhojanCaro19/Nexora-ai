"use client";

import { useState, type ReactNode } from "react";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Fingerprint,
  MessageSquare,
  Headset,
  Store,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectSearch } from "@/components/shared/MultiSelectSearch";
import { updateAgentConfigAction, setBookingModeAction, setCatalogKindAction } from "./actions";
import { CATALOG_KIND_OPTIONS, type CatalogKind } from "@/lib/config/catalogKind";
import type { AgentConfig, FaqEntry } from "@/lib/services/agentConfigService";
import type { AGENT_TOOLS } from "@/lib/config/agentTools";
import type { Product } from "@/lib/services/productService";
import { EMOJI_MODES, ADDRESS_FORMS, type PaymentMethod } from "@/lib/config/agentPersona";
import { ESCALATION_TRIGGERS } from "@/lib/config/escalationTriggers";
import { BOOKING_MODE_OPTIONS, type BookingMode } from "@/lib/types/reservation";
import type { IndustryPlaceholderSet } from "@/lib/config/industryPlaceholders";

type ToolCatalog = typeof AGENT_TOOLS;

const RESPONSE_LENGTH_OPTIONS = [
  { value: "corta", label: "Corta y directa" },
  { value: "media", label: "Media (default)" },
  { value: "larga", label: "Larga y detallada" },
];

// Fijo en código a propósito — el valor se inyecta tal cual en el prompt
// ("Responde siempre en: X."), así que el label ES el valor.
const LANGUAGE_OPTIONS = [
  { value: "Español", label: "Español" },
  { value: "Inglés", label: "Inglés" },
];

// Degradado de marca (cian → violeta) reutilizado para bordes y detalles
// finos — mismo criterio que el formulario de producto y el wizard de
// bienvenida.
const BRAND_GRADIENT = "linear-gradient(110deg, #4CC2E8, #818CF8, #A78BFA)";
// Relleno translúcido + borde tenue de los inputs, igual que el catálogo.
// El anillo blanco de foco se apaga: el resplandor de marca lo pone
// <GlowField> alrededor (borde en degradado al enfocar).
const FIELD_CLS =
  "h-10 border-white/10 bg-white/[0.03] focus-visible:border-white/10 focus-visible:ring-0";
const TEXTAREA_CLS =
  "resize-none border-white/10 bg-white/[0.03] focus-visible:border-white/10 focus-visible:ring-0";
const SELECT_TRIGGER_CLS =
  "h-10 w-full justify-center border-white/10 bg-white/[0.03] text-sm focus-visible:border-white/10 focus-visible:ring-0";

// Rótulo de sección centrado con dos filetes cortos teñidos de marca —
// da estructura sin encerrar nada en una tarjeta (reemplaza el border-b
// gris pelado con ícono). Mismo lenguaje visual que el formulario de
// producto.
function SectionHeading({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span
        aria-hidden
        className="h-px w-8 rounded-full"
        style={{ background: "linear-gradient(90deg, transparent, rgba(129,140,248,0.45))" }}
      />
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="h-px w-8 rounded-full"
        style={{ background: "linear-gradient(90deg, rgba(129,140,248,0.45), transparent)" }}
      />
    </div>
  );
}

// Envuelve un control y le pinta un borde en degradado de marca al
// enfocarlo (máscara, sin tapar el relleno) — en vez del anillo blanco
// por defecto. Copiado del formulario de producto.
function GlowField({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`group/glow relative rounded-lg ${className}`}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-focus-within/glow:opacity-100"
        style={{
          padding: "1px",
          background: BRAND_GRADIENT,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
    </div>
  );
}

// Campo con label centrado en text-xs/tracking sobre el control — la
// estética que el usuario aprobó en el formulario de producto.
function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
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

// Las personalizaciones del agente son "modulitos": el nivel de arriba es
// un menú y tocar uno entra a esa parte sola (patrón "tocar y entrar" ya
// usado en perfil/profile-panel.tsx y clientes/customer-detail-view.tsx).
type View = "menu" | "identidad" | "como-habla" | "escalamiento" | "negocio" | "herramientas";

// Tarjeta de un modulito. Sin relleno; borde tenue teñido del índigo de
// marca (no blanco). Ícono pintado con el degradado de marca. Van todas
// en una misma fila (grilla de 5). Contenido apilado: ícono + chevron
// arriba, luego título, descripción y el resumen corto al pie.
function SectionCard({
  icon: Icon,
  label,
  description,
  summary,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  summary?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-[rgba(129,140,248,0.22)] p-4 text-center transition-colors hover:border-[rgba(129,140,248,0.55)]"
    >
      <span className="aventhra-grad-icon">
        <Icon size={22} strokeWidth={1.75} />
      </span>

      <div className="flex-1">
        <p className="text-sm font-medium leading-snug" style={{ color: "var(--nexora-ink)" }}>
          {label}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "var(--nexora-ink-dim)" }}>
          {description}
        </p>
      </div>

      {summary && (
        <p className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(238,240,247,0.4)" }}>
          {summary}
        </p>
      )}
    </button>
  );
}

// Definición del degradado de marca para pintar los íconos (.aventhra-grad-icon
// lo referencia por id). Se monta una sola vez, oculto.
function IconGradientDef() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <linearGradient id="aventhra-icon-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4CC2E8" />
          <stop offset="38%" stopColor="#818CF8" />
          <stop offset="68%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#E879C7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Botón "Volver" — mismo markup que perfil/clientes: píldora sutil con
// ChevronLeft, retrocede un solo nivel (sección → menú).
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
      style={{ color: "var(--nexora-ink-dim)" }}
    >
      <ChevronLeft size={16} />
      Volver
    </button>
  );
}

export function MiAgentePanel({
  agentConfig,
  catalog,
  products,
  bookingMode: initialBookingMode,
  catalogKind: initialCatalogKind,
  placeholders: ph,
}: {
  agentConfig: AgentConfig;
  catalog: ToolCatalog;
  products: Product[];
  bookingMode: BookingMode;
  catalogKind: CatalogKind;
  placeholders: IndustryPlaceholderSet;
}) {
  const [name, setName] = useState(agentConfig.name);
  const [greetingMessage, setGreetingMessage] = useState(agentConfig.greetingMessage);
  const [personality, setPersonality] = useState(agentConfig.personality);
  const [systemPromptExtra, setSystemPromptExtra] = useState(agentConfig.systemPromptExtra);
  const [restrictions, setRestrictions] = useState(agentConfig.restrictions);
  const [emojiMode, setEmojiMode] = useState(agentConfig.emojiMode);
  const [emojiSet, setEmojiSet] = useState(agentConfig.emojiSet);
  const [addressForm, setAddressForm] = useState(agentConfig.addressForm);
  const [localPhrases, setLocalPhrases] = useState(agentConfig.localPhrases);
  const [businessDescription, setBusinessDescription] = useState(agentConfig.businessDescription);
  const [locations, setLocations] = useState(agentConfig.locations);
  const [socialLinks, setSocialLinks] = useState(agentConfig.socialLinks);
  const [escalationTriggers, setEscalationTriggers] = useState<string[]>(agentConfig.escalationTriggers);
  const [responseLength, setResponseLength] = useState(agentConfig.responseLength ?? "");
  const [language, setLanguage] = useState(agentConfig.language ?? "");
  const [businessHours, setBusinessHours] = useState(agentConfig.businessHours);
  const [afterHoursMessage, setAfterHoursMessage] = useState(agentConfig.afterHoursMessage);
  const [faqs, setFaqs] = useState<FaqEntry[]>(agentConfig.faqs);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(agentConfig.paymentMethods);
  const [escalationMessage, setEscalationMessage] = useState(agentConfig.escalationMessage);
  const [fallbackMessage, setFallbackMessage] = useState(agentConfig.fallbackMessage);
  const [farewellMessage, setFarewellMessage] = useState(agentConfig.farewellMessage);
  const [priorityProducts, setPriorityProducts] = useState<string[]>(agentConfig.priorityProducts);
  const [enabledTools, setEnabledTools] = useState<string[]>(agentConfig.enabledTools);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navegación entre modulitos. Todo el estado sigue viviendo acá; las
  // secciones son solo vistas condicionales de este mismo árbol.
  const [view, setView] = useState<View>("menu");

  // Interruptor de reservas/citas — vive en booking_settings, no en
  // agent_configs, así que se guarda solo (no con el botón "Guardar" del
  // resto de la página).
  const [bookingMode, setBookingMode] = useState<BookingMode>(initialBookingMode);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  async function changeBookingMode(next: BookingMode) {
    if (next === bookingMode) return;
    const prev = bookingMode;
    setBookingMode(next);
    setBookingSaving(true);
    setBookingError(null);
    const res = await setBookingModeAction(next);
    setBookingSaving(false);
    if (res.error) {
      setBookingMode(prev);
      setBookingError(res.error);
    }
  }

  // "¿Qué vende el negocio?" — vive en businesses.catalog_kind; decide si el
  // stock del Catálogo es obligatorio. Se guarda solo, igual que reservas.
  const [catalogKind, setCatalogKind] = useState<CatalogKind>(initialCatalogKind);
  const [catalogKindSaving, setCatalogKindSaving] = useState(false);
  const [catalogKindError, setCatalogKindError] = useState<string | null>(null);

  async function changeCatalogKind(next: CatalogKind) {
    if (next === catalogKind) return;
    const prev = catalogKind;
    setCatalogKind(next);
    setCatalogKindSaving(true);
    setCatalogKindError(null);
    const res = await setCatalogKindAction(next);
    setCatalogKindSaving(false);
    if (res.error) {
      setCatalogKind(prev);
      setCatalogKindError(res.error);
    }
  }

  function touched<T>(setter: (v: T) => void) {
    return (v: T) => {
      setSaved(false);
      setter(v);
    };
  }

  function addFaq() {
    setSaved(false);
    setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  }
  function updateFaq(index: number, field: "question" | "answer", value: string) {
    setSaved(false);
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  }
  function removeFaq(index: number) {
    setSaved(false);
    setFaqs((prev) => prev.filter((_, i) => i !== index));
  }
  function toggleEscalationTrigger(key: string, checked: boolean) {
    setSaved(false);
    setEscalationTriggers((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  }
  function addPaymentMethod() {
    setSaved(false);
    setPaymentMethods((prev) => [...prev, { label: "", detail: "" }]);
  }
  function updatePaymentMethod(index: number, patch: Partial<PaymentMethod>) {
    setSaved(false);
    setPaymentMethods((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }
  function removePaymentMethod(index: number) {
    setSaved(false);
    setPaymentMethods((prev) => prev.filter((_, i) => i !== index));
  }
  function toggleTool(key: string, checked: boolean) {
    setSaved(false);
    setEnabledTools((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  }
  function togglePriorityProduct(id: string, checked: boolean) {
    setSaved(false);
    setPriorityProducts((prev) => (checked ? [...prev, id] : prev.filter((p) => p !== id)));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateAgentConfigAction({
      name,
      greetingMessage,
      personality,
      systemPromptExtra,
      restrictions,
      emojiMode,
      emojiSet,
      addressForm,
      localPhrases,
      businessDescription,
      locations,
      socialLinks,
      escalationTriggers,
      responseLength,
      language,
      businessHours,
      afterHoursMessage,
      faqs,
      paymentMethods,
      escalationMessage,
      fallbackMessage,
      farewellMessage,
      priorityProducts,
      enabledTools,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  const MENU: {
    key: Exclude<View, "menu">;
    label: string;
    description: string;
    icon: LucideIcon;
    summary?: string;
  }[] = [
    {
      key: "identidad",
      label: "Identidad",
      description: "Nombre, saludo y personalidad del agente.",
      icon: Fingerprint,
      summary: name.trim() || undefined,
    },
    {
      key: "como-habla",
      label: "Cómo habla",
      description: "Tono, emojis, idioma y mensajes automáticos.",
      icon: MessageSquare,
    },
    {
      key: "escalamiento",
      label: "Cuándo pasar a una persona",
      description: "Cuándo el agente deja de responder y avisa a tu equipo.",
      icon: Headset,
      summary: escalationTriggers.length ? `${escalationTriggers.length} activos` : undefined,
    },
    {
      key: "negocio",
      label: "Sobre el negocio",
      description: "Qué haces, sedes, horarios, pagos y preguntas frecuentes.",
      icon: Store,
      summary: faqs.length ? `${faqs.length} FAQ` : undefined,
    },
    {
      key: "herramientas",
      label: "Qué puede hacer",
      description: "Herramientas y acciones que habilitas para el agente.",
      icon: Wrench,
      summary: enabledTools.length ? `${enabledTools.length} activas` : undefined,
    },
  ];

  if (view === "menu") {
    return (
      <>
        <IconGradientDef />
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {MENU.map((m) => (
            <SectionCard
              key={m.key}
              icon={m.icon}
              label={m.label}
              description={m.description}
              summary={m.summary}
              onClick={() => {
                setSaved(false);
                setError(null);
                setView(m.key);
              }}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton onClick={() => setView("menu")} />
      <div className="mt-6 space-y-9">
        {view === "identidad" && (
        <section className="space-y-5">
          <SectionHeading>Identidad</SectionHeading>
          <Field label="Nombre del agente" htmlFor="agent-name">
            <GlowField>
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => touched(setName)(e.target.value)}
                placeholder="Ej. Nova, Max, Avhen…"
                className={FIELD_CLS}
              />
            </GlowField>
          </Field>
          <Field label="Mensaje de bienvenida (opcional)" htmlFor="agent-greeting">
            <GlowField>
              <Input
                id="agent-greeting"
                value={greetingMessage}
                onChange={(e) => touched(setGreetingMessage)(e.target.value)}
                placeholder={ph.greeting}
                className={FIELD_CLS}
              />
            </GlowField>
          </Field>
          <Field label="Personalidad y tono (opcional)" htmlFor="agent-personality">
            <GlowField>
              <Textarea
                id="agent-personality"
                rows={3}
                value={personality}
                onChange={(e) => touched(setPersonality)(e.target.value)}
                placeholder={ph.personality}
                className={TEXTAREA_CLS}
              />
            </GlowField>
          </Field>
        </section>
        )}

        {view === "como-habla" && (
        <section className="space-y-5">
          <SectionHeading>Cómo habla</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Emojis">
              <Select value={emojiMode} onValueChange={(v) => v && touched(setEmojiMode)(v as typeof emojiMode)}>
                <GlowField>
                  <SelectTrigger className={SELECT_TRIGGER_CLS}>
                    <SelectValue />
                  </SelectTrigger>
                </GlowField>
                <SelectContent>
                  {EMOJI_MODES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Trato al cliente">
              <Select value={addressForm} onValueChange={(v) => v && touched(setAddressForm)(v as typeof addressForm)}>
                <GlowField>
                  <SelectTrigger className={SELECT_TRIGGER_CLS}>
                    <SelectValue />
                  </SelectTrigger>
                </GlowField>
                <SelectContent>
                  {ADDRESS_FORMS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {emojiMode === "personalizado" && (
            <Field label="¿Qué emojis quieres que use?" htmlFor="agent-emoji-set">
              <GlowField>
                <Input
                  id="agent-emoji-set"
                  value={emojiSet}
                  onChange={(e) => touched(setEmojiSet)(e.target.value)}
                  placeholder="Ej. ✂️ 💈 🔥 ✨"
                  className={FIELD_CLS}
                />
              </GlowField>
            </Field>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Longitud de respuesta">
              <Select value={responseLength} onValueChange={(v) => touched(setResponseLength)(v ?? "")}>
                <GlowField>
                  <SelectTrigger className={SELECT_TRIGGER_CLS}>
                    <SelectValue placeholder="Sin preferencia" />
                  </SelectTrigger>
                </GlowField>
                <SelectContent>
                  {RESPONSE_LENGTH_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Idioma">
              <Select value={language} onValueChange={(v) => touched(setLanguage)(v ?? "")}>
                <GlowField>
                  <SelectTrigger className={SELECT_TRIGGER_CLS}>
                    <SelectValue placeholder="Español" />
                  </SelectTrigger>
                </GlowField>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Modismos / así hablamos acá (opcional)" htmlFor="agent-phrases">
            <GlowField>
              <Textarea
                id="agent-phrases"
                rows={2}
                value={localPhrases}
                onChange={(e) => touched(setLocalPhrases)(e.target.value)}
                placeholder={ph.localPhrases}
                className={TEXTAREA_CLS}
              />
            </GlowField>
          </Field>

          <Field label="Instrucciones adicionales (opcional)" htmlFor="agent-extra">
            <GlowField>
              <Textarea
                id="agent-extra"
                rows={2}
                value={systemPromptExtra}
                onChange={(e) => touched(setSystemPromptExtra)(e.target.value)}
                placeholder="Cualquier instrucción extra que quieras darle al agente."
                className={TEXTAREA_CLS}
              />
            </GlowField>
          </Field>
          <Field label="Restricciones (opcional)" htmlFor="agent-restrictions">
            <GlowField>
              <Textarea
                id="agent-restrictions"
                rows={2}
                value={restrictions}
                onChange={(e) => touched(setRestrictions)(e.target.value)}
                placeholder="Ej. No ofrecer descuentos, no hablar de la competencia…"
                className={TEXTAREA_CLS}
              />
            </GlowField>
          </Field>
          <Field label="Mensaje cuando no sabe algo (opcional)" htmlFor="agent-fallback">
            <GlowField>
              <Textarea
                id="agent-fallback"
                rows={2}
                value={fallbackMessage}
                onChange={(e) => touched(setFallbackMessage)(e.target.value)}
                placeholder="Ej. Mejor te confirmo esto directamente, dame un momento."
                className={TEXTAREA_CLS}
              />
            </GlowField>
          </Field>
          <Field label="Mensaje de despedida (opcional)" htmlFor="agent-farewell">
            <GlowField>
              <Textarea
                id="agent-farewell"
                rows={2}
                value={farewellMessage}
                onChange={(e) => touched(setFarewellMessage)(e.target.value)}
                placeholder="Ej. ¡Gracias por escribirnos, que tengas un excelente día!"
                className={TEXTAREA_CLS}
              />
            </GlowField>
          </Field>
        </section>
        )}

        {view === "escalamiento" && (
        <section className="space-y-5">
          <SectionHeading>Cuándo pasar a una persona</SectionHeading>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ESCALATION_TRIGGERS.map((t) => (
              <Label
                key={t.key}
                htmlFor={`esc-${t.key}`}
                className="font-normal"
                style={{ color: "var(--nexora-ink)" }}
              >
                <Checkbox
                  id={`esc-${t.key}`}
                  checked={escalationTriggers.includes(t.key)}
                  onCheckedChange={(checked) => toggleEscalationTrigger(t.key, checked === true)}
                  style={
                    escalationTriggers.includes(t.key)
                      ? { backgroundColor: "transparent", backgroundImage: BRAND_GRADIENT, borderColor: "transparent" }
                      : undefined
                  }
                />
                {t.label}
              </Label>
            ))}
          </div>
          <Field label="Mensaje de escalamiento (opcional)" htmlFor="agent-escalation">
            <GlowField>
              <Textarea
                id="agent-escalation"
                rows={2}
                value={escalationMessage}
                onChange={(e) => touched(setEscalationMessage)(e.target.value)}
                placeholder="Ej. Si quieres hablar directamente con nosotros, escríbenos al 300-123-4567."
                className={TEXTAREA_CLS}
              />
            </GlowField>
          </Field>
        </section>
        )}

        {view === "negocio" && (
        <>
        <section className="space-y-5">
          <SectionHeading>Sobre el negocio</SectionHeading>
          <Field label="¿A qué se dedica el negocio? (opcional)" htmlFor="agent-description">
            <GlowField>
              <Textarea
                id="agent-description"
                rows={3}
                value={businessDescription}
                onChange={(e) => touched(setBusinessDescription)(e.target.value)}
                placeholder={ph.businessDescription}
                className={TEXTAREA_CLS}
              />
            </GlowField>
          </Field>

          {/* ¿Qué vende el negocio? Vive en businesses.catalog_kind — se
              guarda solo. Decide si el stock del Catálogo es obligatorio. */}
          <Field label="¿Qué vende tu negocio?" htmlFor="agent-catalog-kind">
            <Select
              value={catalogKind}
              disabled={catalogKindSaving}
              onValueChange={(v) => v && changeCatalogKind(v as CatalogKind)}
            >
              <GlowField>
                <SelectTrigger id="agent-catalog-kind" className={SELECT_TRIGGER_CLS}>
                  <SelectValue />
                </SelectTrigger>
              </GlowField>
              <SelectContent>
                {CATALOG_KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
              {catalogKindError
                ? catalogKindError
                : catalogKind === "servicios"
                  ? "En el Catálogo no se pide stock (un servicio no tiene inventario)."
                  : "En el Catálogo el stock es obligatorio por producto (con un escape para hechos a pedido)."}
            </p>
          </Field>

          {/* Interruptor de reservas/citas. Vive en booking_settings —
              se guarda solo, aparte del botón "Guardar" de esta página.
              Cambiar de/hacia "No" hace aparecer/desaparecer el módulo
              "Reservas" en el menú. */}
          <Field label="¿Atiendes con reservas o citas?" htmlFor="agent-booking-mode">
            <Select
              value={bookingMode}
              disabled={bookingSaving}
              onValueChange={(v) => v && changeBookingMode(v as BookingMode)}
            >
              <GlowField>
                <SelectTrigger id="agent-booking-mode" className={SELECT_TRIGGER_CLS}>
                  <SelectValue />
                </SelectTrigger>
              </GlowField>
              <SelectContent>
                {BOOKING_MODE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
              {bookingError
                ? bookingError
                : bookingMode === "off"
                  ? "Si lo activas, aparece el módulo Reservas para configurar la agenda, los horarios y los empleados."
                  : "La agenda, los horarios y los empleados se configuran en el módulo Reservas."}
            </p>
          </Field>
          <Field label="Dirección / sedes (opcional)" htmlFor="agent-locations">
            <GlowField>
              <Textarea
                id="agent-locations"
                rows={2}
                value={locations}
                onChange={(e) => touched(setLocations)(e.target.value)}
                placeholder="Ej. Sede principal: Cra 45 #10-20, Medellín. Sede norte: CC Santafé, local 210."
                className={TEXTAREA_CLS}
              />
            </GlowField>
          </Field>
          <Field label="Redes sociales (opcional)" htmlFor="agent-social">
            <GlowField>
              <Input
                id="agent-social"
                value={socialLinks}
                onChange={(e) => touched(setSocialLinks)(e.target.value)}
                placeholder={ph.socialLinks}
                className={FIELD_CLS}
              />
            </GlowField>
          </Field>
          <Field label="Horario de atención (opcional)" htmlFor="agent-hours">
            <GlowField>
              <Textarea
                id="agent-hours"
                rows={2}
                value={businessHours}
                onChange={(e) => touched(setBusinessHours)(e.target.value)}
                placeholder="Ej. Lunes a viernes 9am - 6pm, sábados 9am - 1pm, domingo cerrado."
                className={TEXTAREA_CLS}
              />
            </GlowField>
          </Field>
          <Field label="Mensaje fuera de horario (opcional)" htmlFor="agent-after-hours">
            <GlowField>
              <Textarea
                id="agent-after-hours"
                rows={2}
                value={afterHoursMessage}
                onChange={(e) => touched(setAfterHoursMessage)(e.target.value)}
                placeholder="Ej. En este momento estamos cerrados, te respondemos apenas abramos."
                className={TEXTAREA_CLS}
              />
            </GlowField>
          </Field>

          <div className="space-y-3">
            <Label className="justify-center text-xs tracking-wide" style={{ color: "var(--nexora-ink-dim)" }}>
              Preguntas frecuentes (opcional)
            </Label>
            {faqs.length > 0 && (
              <div className="space-y-3">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start sm:p-4"
                    style={{ borderColor: "var(--nexora-line)" }}
                  >
                    <GlowField className="min-w-0">
                      <Input
                        value={faq.question}
                        onChange={(e) => updateFaq(index, "question", e.target.value)}
                        placeholder={`Pregunta. ${ph.faqQuestion}`}
                        className={`${FIELD_CLS} min-w-0`}
                      />
                    </GlowField>
                    <GlowField className="min-w-0">
                      <Textarea
                        rows={1}
                        value={faq.answer}
                        onChange={(e) => updateFaq(index, "answer", e.target.value)}
                        placeholder={ph.faqAnswer}
                        className={`${TEXTAREA_CLS} min-h-10 min-w-0`}
                      />
                    </GlowField>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeFaq(index)}
                      aria-label="Eliminar pregunta"
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-center">
              <Button type="button" variant="outline" size="sm" onClick={addFaq}>
                <Plus size={14} strokeWidth={1.75} />
                Agregar pregunta
              </Button>
            </div>
          </div>

          {products.length > 0 && (
            <Field label="Productos que quieres destacar (opcional)">
              <MultiSelectSearch
                idPrefix="priority-product"
                items={products.map((p) => ({ id: p.id, label: p.name }))}
                selectedIds={priorityProducts}
                onToggle={togglePriorityProduct}
                searchPlaceholder="Buscar producto..."
                triggerPlaceholder="Selecciona productos"
                selectedSuffix="productos seleccionados"
                emptyMessage="Ningún producto coincide."
              />
            </Field>
          )}
        </section>

        <section className="space-y-5">
          <SectionHeading>Cuentas de pago</SectionHeading>
          <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            Opcional. Agregá todas las cuentas que aceptes — el agente las ofrece todas.
          </p>
          {paymentMethods.length > 0 && (
            <div className="space-y-3">
              {paymentMethods.map((m, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start sm:p-4"
                  style={{ borderColor: "var(--nexora-line)" }}
                >
                  <GlowField className="min-w-0">
                    <Input
                      value={m.label}
                      onChange={(e) => updatePaymentMethod(index, { label: e.target.value })}
                      placeholder="Banco / billetera. Ej. Nequi"
                      className={`${FIELD_CLS} min-w-0`}
                    />
                  </GlowField>
                  <GlowField className="min-w-0">
                    <Input
                      value={m.detail}
                      onChange={(e) => updatePaymentMethod(index, { detail: e.target.value })}
                      placeholder="Número de cuenta. Ej. 3054072356"
                      className={`${FIELD_CLS} min-w-0`}
                    />
                  </GlowField>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removePaymentMethod(index)}
                    aria-label="Quitar cuenta"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center">
            <Button type="button" variant="outline" size="sm" onClick={addPaymentMethod}>
              <Plus size={14} strokeWidth={1.75} />
              Agregar cuenta
            </Button>
          </div>
        </section>
        </>
        )}

        {view === "herramientas" && (
        <section className="space-y-5">
          <SectionHeading>Qué puede hacer</SectionHeading>
          <MultiSelectSearch
            idPrefix="tool"
            items={catalog.map((tool) => ({ id: tool.key, label: tool.label }))}
            selectedIds={enabledTools}
            onToggle={toggleTool}
            searchPlaceholder="Buscar herramienta..."
            triggerPlaceholder="Selecciona herramientas"
            selectedSuffix="herramientas activas"
            emptyMessage="Ninguna herramienta coincide."
          />
        </section>
        )}
      </div>

      {/* Guardar — vive dentro de la sección abierta, junto al aviso de
          "Guardado"/error. Guarda TODA la config con el mismo handleSave de
          siempre (no solo la sección visible): es lo más simple y no cambia
          nada de la lógica. Tras guardar OK te quedas en la sección viendo
          "Guardado" — igual que Datos personales en Perfil. */}
      <div className="mt-12 flex flex-col items-center gap-2">
        <Button disabled={saving} onClick={handleSave}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
        {saved && <span className="text-xs" style={{ color: "var(--nexora-signal)" }}>Guardado</span>}
        {error && <span className="text-xs" style={{ color: "var(--nexora-alert)" }}>{error}</span>}
      </div>
    </div>
  );
}
