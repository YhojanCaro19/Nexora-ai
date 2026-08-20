"use client";

import { useState } from "react";
import {
  Wrench,
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
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
import type { AGENT_TOOLS } from "@/lib/config/agentTools";
import type { IndustryTemplate } from "@/lib/services/agentTemplateService";
import type { FaqEntry } from "@/lib/services/agentConfigService";

type ToolCatalog = typeof AGENT_TOOLS;
// Ya no hay un "chooser" de nivel superior (Catálogo de herramientas vs.
// Plantillas) — el catálogo de herramientas se quitó del menú principal a
// propósito; sigue existiendo, pero solo como una sección MÁS dentro de
// cada plantilla (ver TemplateDetail), no como una pantalla aparte.
type View = "categories" | "industries";

// Mismas opciones que Mi Agente (admin) — el valor se inyecta tal cual en
// el prompt, así que agregar una nueva es un cambio de código, no un dato
// editable desde acá.
const RESPONSE_LENGTH_OPTIONS = [
  { value: "corta", label: "Corta y directa" },
  { value: "media", label: "Media (default)" },
  { value: "larga", label: "Larga y detallada" },
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INDUSTRY_CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.key}
            label={`Plantillas de ${cat.label.charAt(0).toLowerCase()}${cat.label.slice(1)}`}
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
        <h2 className="font-nexora text-lg text-center" style={{ color: 'var(--nexora-ink)' }}>
          {selectedTemplate ? `Plantilla agente ${selectedTemplate.industryLabel}` : category?.label}
        </h2>
      </div>

      {!selectedTemplate && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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

function CategoryCard({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border p-6 text-center transition-all duration-300 hover:scale-105"
      style={{ borderColor: hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)' }}
    >
      <LayoutTemplate size={24} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
      <span className="text-sm font-semibold mt-1" style={{ color: 'var(--nexora-ink)' }}>
        {label}
      </span>
      <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
        {count} {count === 1 ? "industria" : "industrias"}
      </span>
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

// Plantilla COMPLETA de una industria: no solo herramientas — también
// mensajes, tono y FAQs base. Mismo patrón "tocar y entrar" que Mi Agente
// (admin): un chooser de secciones, cada una con su vista dedicada, y un
// único botón Guardar siempre visible sin importar en qué sección estés.
type SectionKey = "mensajes" | "tono" | "conocimiento" | "herramientas";
type DetailView = "list" | SectionKey;

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "mensajes", label: "Mensajes", icon: MessageCircle },
  { key: "tono", label: "Tono y personalidad", icon: Sparkles },
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
  const [useEmojis, setUseEmojis] = useState(template.useEmojis);
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
      useEmojis,
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
            desde &quot;Mi Agente&quot;.
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
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="block">Mensaje de bienvenida</Label>
                <Textarea
                  rows={2}
                  value={greetingMessage}
                  onChange={(e) => { setGreetingMessage(e.target.value); setSaved(false); }}
                  placeholder="Ej. ¡Hola! 👋 Soy el asistente virtual, ¿en qué puedo ayudarte?"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="block">Mensaje de escalamiento a humano</Label>
                <Textarea
                  rows={2}
                  value={escalationMessage}
                  onChange={(e) => { setEscalationMessage(e.target.value); setSaved(false); }}
                  placeholder="Ej. Ya te conecto con alguien del equipo."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="block">Mensaje cuando no sabe algo</Label>
                <Textarea
                  rows={2}
                  value={fallbackMessage}
                  onChange={(e) => { setFallbackMessage(e.target.value); setSaved(false); }}
                  placeholder="Ej. Esa información no la tengo a la mano, la confirmo con el equipo."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="block">Mensaje fuera de horario</Label>
                <Textarea
                  rows={2}
                  value={afterHoursMessage}
                  onChange={(e) => { setAfterHoursMessage(e.target.value); setSaved(false); }}
                  placeholder="Ej. En este momento estamos cerrados, te respondemos apenas abramos."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="block">Mensaje de despedida</Label>
                <Textarea
                  rows={2}
                  value={farewellMessage}
                  onChange={(e) => { setFarewellMessage(e.target.value); setSaved(false); }}
                  placeholder="Ej. ¡Gracias por escribir!"
                />
              </div>
            </div>
          )}

          {view === "tono" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="block">Personalidad y tono</Label>
                <Textarea
                  rows={2}
                  value={personality}
                  onChange={(e) => { setPersonality(e.target.value); setSaved(false); }}
                  placeholder="Ej. Cercano, cálido y ágil."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="block">Largo de respuesta</Label>
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
              </div>
              <Label htmlFor="template-emojis" className="font-normal">
                <Checkbox
                  id="template-emojis"
                  checked={useEmojis}
                  onCheckedChange={(checked) => { setUseEmojis(checked === true); setSaved(false); }}
                />
                Usar emojis en las respuestas
              </Label>
              <div className="space-y-1.5">
                <Label className="block">Restricciones adicionales (opcional)</Label>
                <Textarea
                  rows={2}
                  value={restrictions}
                  onChange={(e) => { setRestrictions(e.target.value); setSaved(false); }}
                  placeholder="Ej. Nunca prometer descuentos."
                />
              </div>
            </div>
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
