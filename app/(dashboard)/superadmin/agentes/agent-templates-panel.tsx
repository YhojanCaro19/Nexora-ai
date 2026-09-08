"use client";

import { useState, type ReactNode } from "react";
import {
  Wrench,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Sparkles,
  BookOpen,
  LifeBuoy,
  Plus,
  Trash2,
  UtensilsCrossed,
  Shirt,
  Cpu,
  HeartPulse,
  Home,
  ShoppingBag,
  Building2,
  Car,
  Plane,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { updateIndustryTemplateAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectSearch } from "@/components/shared/MultiSelectSearch";
import { INDUSTRY_CATEGORIES } from "@/lib/config/industryCategories";
import { EMOJI_MODES, ADDRESS_FORMS } from "@/lib/config/agentPersona";
import { ESCALATION_TRIGGERS } from "@/lib/config/escalationTriggers";
import type { AGENT_TOOLS } from "@/lib/config/agentTools";
import type { IndustryTemplate } from "@/lib/services/agentTemplateService";
import type { FaqEntry } from "@/lib/services/agentConfigService";

type ToolCatalog = typeof AGENT_TOOLS;
type View = "categories" | "industries";

// Un ícono propio por categoría — antes las 13 tarjetas usaban el mismo
// ícono genérico (LayoutTemplate) y se veían idénticas entre sí. Si algún
// día se agrega una categoría sin entrada acá, cae a Sparkles — no debe
// tumbar la pantalla por un ícono faltante.
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

const RESPONSE_LENGTH_OPTIONS = [
  { value: "corta", label: "Corta y directa" },
  { value: "media", label: "Media (default)" },
  { value: "larga", label: "Larga y detallada" },
];

// Mismo valor literal que usa Mi Agente (admin) — agent_configs.language
// guarda el nombre, no un código ISO. Ver mi-agente-panel.tsx.
const LANGUAGE_OPTIONS = [
  { value: "Español", label: "Español" },
  { value: "Inglés", label: "Inglés" },
];

export function AgentTemplatesPanel({
  templates,
  catalog,
}: {
  templates: IndustryTemplate[];
  catalog: ToolCatalog;
}) {
  const [view, setView] = useState<View>("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const category = INDUSTRY_CATEGORIES.find((c) => c.key === selectedCategory) ?? null;
  const industriesInCategory = category
    ? templates.filter((t) => category.industryTypes.includes(t.industryType))
    : [];
  const selectedTemplate = templates.find((t) => t.industryType === selectedIndustry) ?? null;

  if (view === "categories") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {INDUSTRY_CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.key}
            icon={CATEGORY_ICONS[cat.key] ?? Sparkles}
            label={cat.label}
            count={cat.industryTypes.length}
            onClick={() => {
              setSelectedCategory(cat.key);
              setView("industries");
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative flex items-center justify-center">
        <BackButton
          onClick={() => {
            if (selectedTemplate) {
              setSelectedIndustry(null);
            } else {
              setSelectedCategory(null);
              setView("categories");
            }
          }}
        />
        {/* px-20 en móvil: el botón "Volver" está en position:absolute a la
            izquierda; sin este colchón un título largo ("Plantilla agente
            Centro estético") se desliza por debajo del botón. sm:px-0 lo
            devuelve al centrado exacto de escritorio. */}
        <h2 className="font-nexora text-base sm:text-lg text-center px-20 sm:px-0" style={{ color: 'var(--nexora-ink)' }}>
          {selectedTemplate ? `Plantilla agente ${selectedTemplate.industryLabel}` : category?.label}
        </h2>
      </div>

      {!selectedTemplate && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {industriesInCategory.map((template) => (
            <TemplateCard
              key={template.industryType}
              label={template.industryLabel}
              onClick={() => setSelectedIndustry(template.industryType)}
            />
          ))}
        </div>
      )}

      {selectedTemplate && (
        <TemplateDetail key={selectedTemplate.industryType} template={selectedTemplate} catalog={catalog} />
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute left-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
      style={{ color: 'var(--nexora-ink-dim)' }}
    >
      <ChevronLeft size={16} />
      Volver
    </button>
  );
}

// Mismo lenguaje visual que IconStatCard (ícono en círculo + texto a la
// izquierda) en vez del ícono suelto flotando arriba de texto centrado —
// así esta pantalla se ve como parte del mismo panel que Inicio/Estadísticas,
// no como una pantalla aparte con su propio estilo.
function CategoryCard({
  icon: Icon,
  label,
  count,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors duration-200 hover:border-white/20"
      style={{ background: 'var(--nexora-panel)', borderColor: 'var(--nexora-line)' }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: 'rgba(238,240,247,0.08)' }}
      >
        <Icon size={18} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--nexora-ink)' }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
          {count} {count === 1 ? "industria" : "industrias"}
        </p>
      </div>
      <ChevronRight size={16} strokeWidth={1.75} className="shrink-0" style={{ color: 'var(--nexora-ink-dim)' }} />
    </button>
  );
}

function TemplateCard({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="aspect-square flex flex-col items-center justify-center gap-1 rounded-2xl border p-4 text-center transition-all duration-300 hover:scale-105"
      style={{ borderColor: hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)' }}
    >
      <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--nexora-ink-dim)' }}>
        Plantilla agente
      </span>
      <span className="text-lg font-semibold mt-2" style={{ color: 'var(--nexora-ink)' }}>
        {label}
      </span>
    </button>
  );
}

// Mismo bloque de sección (encabezado con ícono + línea) que
// ConfigSection en Mi Agente (admin) — para que editar una plantilla se
// sienta como el mismo formulario, no uno distinto inventado aparte.
function ConfigSection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-center gap-2 border-b pb-2" style={{ borderColor: "var(--nexora-line)" }}>
        <Icon size={15} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />
        <h3 className="font-nexora text-sm font-semibold" style={{ color: "var(--nexora-ink)" }}>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="block text-center">
        {label}
      </Label>
      {children}
    </div>
  );
}

// Plantilla COMPLETA de una industria: mensajes, cómo habla (personalidad,
// emojis, trato al cliente, largo, idioma), cuándo escalar, FAQs y
// herramientas — mismos campos que Mi Agente (admin), menos lo que debe
// ser siempre de cada negocio (horarios, descripción, ubicaciones, redes,
// métodos de pago, instrucciones extra, modismos locales: esos arrancan
// vacíos siempre, ninguna plantilla los toca).
type SectionKey = "mensajes" | "tono" | "escalar" | "conocimiento" | "herramientas";
type DetailView = "list" | SectionKey;

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "mensajes", label: "Mensajes", icon: MessageCircle },
  { key: "tono", label: "Cómo habla", icon: Sparkles },
  { key: "escalar", label: "Cuándo escalar a una persona", icon: LifeBuoy },
  { key: "conocimiento", label: "Preguntas frecuentes", icon: BookOpen },
  { key: "herramientas", label: "Herramientas activas", icon: Wrench },
];

function TemplateDetail({
  template,
  catalog,
}: {
  template: IndustryTemplate;
  catalog: ToolCatalog;
}) {
  const [view, setView] = useState<DetailView>("list");

  // Precargado con lo que ya está guardado (o el default de la industria si
  // la plantilla nunca se tocó) — antes esto arrancaba SIEMPRE vacío, así
  // que abrir una plantilla ya guardada no mostraba lo que tenía.
  const [greetingMessage, setGreetingMessage] = useState(template.greetingMessage);
  const [escalationMessage, setEscalationMessage] = useState(template.escalationMessage);
  const [fallbackMessage, setFallbackMessage] = useState(template.fallbackMessage);
  const [afterHoursMessage, setAfterHoursMessage] = useState(template.afterHoursMessage);
  const [farewellMessage, setFarewellMessage] = useState(template.farewellMessage);
  const [personality, setPersonality] = useState(template.personality);
  const [responseLength, setResponseLength] = useState(template.responseLength);
  const [emojiMode, setEmojiMode] = useState(template.emojiMode);
  const [emojiSet, setEmojiSet] = useState(template.emojiSet);
  const [addressForm, setAddressForm] = useState(template.addressForm);
  const [language, setLanguage] = useState(template.language);
  const [escalationTriggers, setEscalationTriggers] = useState<string[]>(template.escalationTriggers);
  const [restrictions, setRestrictions] = useState(template.restrictions);
  const [faqs, setFaqs] = useState<FaqEntry[]>(template.faqs);
  const [toolKeys, setToolKeys] = useState<string[]>(template.toolKeys);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  function toggleTool(key: string, checked: boolean) {
    setSaved(false);
    setToolKeys((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  }
  function toggleEscalationTrigger(key: string, checked: boolean) {
    setSaved(false);
    setEscalationTriggers((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateIndustryTemplateAction(template.industryType, {
      toolKeys,
      personality,
      greetingMessage,
      escalationMessage,
      fallbackMessage,
      afterHoursMessage,
      farewellMessage,
      faqs,
      responseLength,
      emojiMode,
      emojiSet,
      addressForm,
      escalationTriggers,
      language,
      restrictions,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {view === "list" ? (
        <>
          <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
            Con qué arranca el agente de un negocio nuevo de este tipo — el admin lo ajusta después
            desde &quot;Mi Agente&quot;. Nunca incluye horarios, descripción del negocio, ubicaciones,
            redes ni métodos de pago — eso siempre lo llena el dueño real.
          </p>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {SECTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted bg-card"
              >
                <Icon size={16} strokeWidth={1.75} style={{ color: 'var(--nexora-nova)' }} />
                <span className="min-w-0 flex-1 text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
                  {label}
                </span>
                <ChevronRight size={16} strokeWidth={1.75} style={{ color: 'var(--nexora-ink-dim)' }} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setView("list")}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--nexora-ink-dim)' }}
          >
            <ChevronLeft size={16} />
            Volver
          </button>

          <h3 className="text-center text-base font-semibold font-nexora" style={{ color: 'var(--nexora-ink)' }}>
            {SECTIONS.find((s) => s.key === view)?.label}
          </h3>

          {view === "mensajes" && (
            <ConfigSection icon={MessageCircle} title="Mensajes">
              <Field label="Mensaje de bienvenida">
                <Textarea
                  rows={2}
                  value={greetingMessage}
                  onChange={(e) => { setGreetingMessage(e.target.value); setSaved(false); }}
                  placeholder="Ej. ¡Hola! 👋 Soy el asistente virtual, ¿en qué puedo ayudarte?"
                />
              </Field>
              <Field label="Mensaje cuando no sabe algo">
                <Textarea
                  rows={2}
                  value={fallbackMessage}
                  onChange={(e) => { setFallbackMessage(e.target.value); setSaved(false); }}
                  placeholder="Ej. Esa información no la tengo a la mano, la confirmo con el equipo."
                />
              </Field>
              <Field label="Mensaje fuera de horario">
                <Textarea
                  rows={2}
                  value={afterHoursMessage}
                  onChange={(e) => { setAfterHoursMessage(e.target.value); setSaved(false); }}
                  placeholder="Ej. En este momento estamos cerrados, te respondemos apenas abramos."
                />
              </Field>
              <Field label="Mensaje de despedida">
                <Textarea
                  rows={2}
                  value={farewellMessage}
                  onChange={(e) => { setFarewellMessage(e.target.value); setSaved(false); }}
                  placeholder="Ej. ¡Gracias por escribir!"
                />
              </Field>
            </ConfigSection>
          )}

          {view === "tono" && (
            <ConfigSection icon={Sparkles} title="Cómo habla">
              <Field label="Personalidad y tono">
                <Textarea
                  rows={3}
                  value={personality}
                  onChange={(e) => { setPersonality(e.target.value); setSaved(false); }}
                  placeholder="Ej. Cercano, cálido y ágil."
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Emojis">
                  <Select value={emojiMode} onValueChange={(v) => { if (v) { setEmojiMode(v as typeof emojiMode); setSaved(false); } }}>
                    <SelectTrigger className="w-full h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMOJI_MODES.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Trato al cliente">
                  <Select value={addressForm} onValueChange={(v) => { if (v) { setAddressForm(v as typeof addressForm); setSaved(false); } }}>
                    <SelectTrigger className="w-full h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADDRESS_FORMS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {emojiMode === "personalizado" && (
                <Field label="¿Qué emojis debería usar?" htmlFor="template-emoji-set">
                  <Input
                    id="template-emoji-set"
                    value={emojiSet}
                    onChange={(e) => { setEmojiSet(e.target.value); setSaved(false); }}
                    placeholder="Ej. ✂️ 💈 🔥"
                  />
                </Field>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Largo de respuesta">
                  <Select
                    value={responseLength}
                    onValueChange={(v) => { setResponseLength(v ?? "media"); setSaved(false); }}
                  >
                    <SelectTrigger className="w-full h-10 text-sm">
                      <SelectValue placeholder="Media (default)" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESPONSE_LENGTH_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Idioma">
                  <Select value={language} onValueChange={(v) => { if (v) { setLanguage(v); setSaved(false); } }}>
                    <SelectTrigger className="w-full h-10 text-sm">
                      <SelectValue placeholder="Español" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Restricciones adicionales (opcional)">
                <Textarea
                  rows={2}
                  value={restrictions}
                  onChange={(e) => { setRestrictions(e.target.value); setSaved(false); }}
                  placeholder="Ej. Nunca prometer descuentos."
                />
              </Field>
            </ConfigSection>
          )}

          {view === "escalar" && (
            <ConfigSection icon={LifeBuoy} title="Cuándo escalar a una persona">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ESCALATION_TRIGGERS.map((t) => (
                  <Label key={t.key} htmlFor={`esc-${t.key}`} className="font-normal">
                    <Checkbox
                      id={`esc-${t.key}`}
                      checked={escalationTriggers.includes(t.key)}
                      onCheckedChange={(checked) => toggleEscalationTrigger(t.key, checked === true)}
                    />
                    {t.label}
                  </Label>
                ))}
              </div>
              <Field label="Mensaje de escalamiento">
                <Textarea
                  rows={2}
                  value={escalationMessage}
                  onChange={(e) => { setEscalationMessage(e.target.value); setSaved(false); }}
                  placeholder="Ej. Ya te conecto con alguien del equipo."
                />
              </Field>
            </ConfigSection>
          )}

          {view === "conocimiento" && (
            <div className="space-y-3">
              {faqs.length > 0 && (
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start">
                      <Input
                        value={faq.question}
                        onChange={(e) => updateFaq(index, "question", e.target.value)}
                        placeholder="Pregunta. Ej. ¿Hacen envíos?"
                        className="h-8 min-w-0"
                      />
                      <Textarea
                        rows={1}
                        value={faq.answer}
                        onChange={(e) => updateFaq(index, "answer", e.target.value)}
                        placeholder="Respuesta que dará el agente"
                        className="min-h-8 min-w-0 py-1"
                      />
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
              <Button type="button" variant="outline" size="sm" onClick={addFaq}>
                <Plus size={14} strokeWidth={1.75} />
                Agregar pregunta
              </Button>
            </div>
          )}

          {view === "herramientas" && (
            <MultiSelectSearch
              idPrefix="template-tool"
              items={catalog.map((tool) => ({ id: tool.key, label: tool.label }))}
              selectedIds={toolKeys}
              onToggle={toggleTool}
              searchPlaceholder="Buscar herramienta..."
              triggerPlaceholder="Selecciona herramientas"
              selectedSuffix="herramientas activas"
              emptyMessage="Ninguna herramienta coincide."
            />
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <Button disabled={saving} onClick={handleSave}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
        {saved && <span className="text-xs" style={{ color: 'var(--nexora-signal)' }}>Guardado</span>}
        {error && <span className="text-xs" style={{ color: 'var(--nexora-alert)' }}>{error}</span>}
      </div>
    </div>
  );
}
