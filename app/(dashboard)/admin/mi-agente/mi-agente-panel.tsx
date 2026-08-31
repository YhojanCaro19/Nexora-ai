"use client";

import { useState } from "react";
import {
  Bot,
  Sparkles,
  MessageCircle,
  Clock,
  Wallet,
  BookOpen,
  Wrench,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectSearch } from "@/components/shared/MultiSelectSearch";
import { updateAgentConfigAction } from "./actions";
import type { AgentConfig, FaqEntry } from "@/lib/services/agentConfigService";
import type { AGENT_TOOLS } from "@/lib/config/agentTools";
import type { Product } from "@/lib/services/productService";
import {
  EMOJI_MODES,
  ADDRESS_FORMS,
  type PaymentMethod,
} from "@/lib/config/agentPersona";
import { ESCALATION_TRIGGERS } from "@/lib/config/escalationTriggers";

type ToolCatalog = typeof AGENT_TOOLS;

const RESPONSE_LENGTH_OPTIONS = [
  { value: "corta", label: "Corta y directa" },
  { value: "media", label: "Media (default)" },
  { value: "larga", label: "Larga y detallada" },
];

// Fijo en código a propósito, mismo criterio que RESPONSE_LENGTH_OPTIONS —
// el valor se inyecta tal cual en el prompt ("Responde siempre en: X."),
// así que el label ES el valor, no hace falta un mapeo aparte. Agregar un
// idioma nuevo es un cambio de código, no un dato editable desde acá.
const LANGUAGE_OPTIONS = [
  { value: "Español", label: "Español" },
  { value: "Inglés", label: "Inglés" },
];

// Patrón "drill-in", el mismo mecanismo que catalogo-panel.tsx (chooser →
// vista dedicada con botón Volver) en vez del acordeón que usa Perfil.
// Tocar una fila reemplaza el contenido por la vista de esa sección; no
// hay expansión inline.
type SectionKey =
  | "identidad"
  | "comportamiento"
  | "disponibilidad"
  | "pagos"
  | "conocimiento"
  | "herramientas";

type View = "list" | SectionKey;

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "identidad", label: "Identidad del agente", icon: Sparkles },
  { key: "comportamiento", label: "Comportamiento y conversación", icon: MessageCircle },
  { key: "disponibilidad", label: "Disponibilidad", icon: Clock },
  { key: "pagos", label: "Métodos de pago", icon: Wallet },
  { key: "conocimiento", label: "Conocimiento del negocio", icon: BookOpen },
  { key: "herramientas", label: "Herramientas activas", icon: Wrench },
];

export function MiAgentePanel({
  agentConfig,
  catalog,
  products,
}: {
  agentConfig: AgentConfig;
  catalog: ToolCatalog;
  products: Product[];
}) {
  const [view, setView] = useState<View>("list");

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
  const [escalationMessage, setEscalationMessage] = useState(agentConfig.escalationMessage);
  const [fallbackMessage, setFallbackMessage] = useState(agentConfig.fallbackMessage);
  const [farewellMessage, setFarewellMessage] = useState(agentConfig.farewellMessage);
  const [priorityProducts, setPriorityProducts] = useState<string[]>(agentConfig.priorityProducts);
  const [enabledTools, setEnabledTools] = useState<string[]>(agentConfig.enabledTools);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {view === "list" && (
        <div className="flex flex-col items-center gap-2 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(238,240,247,0.08)' }}
          >
            <Bot size={26} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
            Configura cómo se presenta, cómo responde y qué puede hacer tu agente.
          </p>
        </div>
      )}

      {view === "list" ? (
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

          <h2 className="text-center text-base font-semibold font-nexora" style={{ color: 'var(--nexora-ink)' }}>
            {SECTIONS.find((s) => s.key === view)?.label}
          </h2>

          {view === "identidad" && (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="space-y-1.5">
                <Label htmlFor="agent-name" className="block text-center">Nombre del agente</Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. Avhen, Max, Nova..."
                  className="text-center"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-greeting" className="block text-center">Mensaje de bienvenida (opcional)</Label>
                <Input
                  id="agent-greeting"
                  value={greetingMessage}
                  onChange={(e) => {
                    setGreetingMessage(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. ¡Hola! Bienvenido a [negocio], ¿en qué te ayudo hoy?"
                  className="text-center"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-personality" className="block text-center">Personalidad y tono</Label>
                <Textarea
                  id="agent-personality"
                  rows={3}
                  value={personality}
                  onChange={(e) => {
                    setPersonality(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. Cercano y cordial, usa emojis con moderación, siempre ofrece ayuda extra..."
                />
              </div>
            </div>
          )}

          {view === "comportamiento" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="agent-extra" className="block">Instrucciones adicionales (opcional)</Label>
                <Textarea
                  id="agent-extra"
                  rows={3}
                  value={systemPromptExtra}
                  onChange={(e) => {
                    setSystemPromptExtra(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Cualquier instrucción extra que quieras darle al agente."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-restrictions" className="block">Restricciones adicionales (opcional)</Label>
                <Textarea
                  id="agent-restrictions"
                  rows={2}
                  value={restrictions}
                  onChange={(e) => {
                    setRestrictions(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. No ofrecer descuentos, no hablar de la competencia..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-escalation" className="block">Mensaje de escalamiento a humano (opcional)</Label>
                <Textarea
                  id="agent-escalation"
                  rows={2}
                  value={escalationMessage}
                  onChange={(e) => {
                    setEscalationMessage(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. Si quieres hablar directamente con nosotros, escríbenos al 300-123-4567."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-fallback" className="block">Mensaje cuando no sabe algo (opcional)</Label>
                <Textarea
                  id="agent-fallback"
                  rows={2}
                  value={fallbackMessage}
                  onChange={(e) => {
                    setFallbackMessage(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. Mejor te confirmo esto directamente, dame un momento."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-farewell" className="block">Mensaje de despedida (opcional)</Label>
                <Textarea
                  id="agent-farewell"
                  rows={2}
                  value={farewellMessage}
                  onChange={(e) => {
                    setFarewellMessage(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. ¡Gracias por escribirnos, que tengas un excelente día!"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="block">Longitud de respuesta</Label>
                  <Select
                    value={responseLength}
                    onValueChange={(v) => {
                      setResponseLength(v ?? "");
                      setSaved(false);
                    }}
                  >
                    <SelectTrigger className="w-full h-10 text-sm">
                      <SelectValue placeholder="Sin preferencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESPONSE_LENGTH_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="block">Idioma</Label>
                  <Select
                    value={language}
                    onValueChange={(v) => {
                      setLanguage(v ?? "");
                      setSaved(false);
                    }}
                  >
                    <SelectTrigger className="w-full h-10 text-sm">
                      <SelectValue placeholder="Español" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="block">Emojis</Label>
                  <Select
                    value={emojiMode}
                    onValueChange={(v) => {
                      if (v) setEmojiMode(v as typeof emojiMode);
                      setSaved(false);
                    }}
                  >
                    <SelectTrigger className="w-full h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMOJI_MODES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="block">Trato al cliente</Label>
                  <Select
                    value={addressForm}
                    onValueChange={(v) => {
                      if (v) setAddressForm(v as typeof addressForm);
                      setSaved(false);
                    }}
                  >
                    <SelectTrigger className="w-full h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADDRESS_FORMS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {emojiMode === "personalizado" && (
                <div className="space-y-1.5">
                  <Label htmlFor="agent-emoji-set" className="block">¿Qué emojis quieres que use?</Label>
                  <Input
                    id="agent-emoji-set"
                    value={emojiSet}
                    onChange={(e) => {
                      setEmojiSet(e.target.value);
                      setSaved(false);
                    }}
                    placeholder="Ej. ✂️ 💈 🔥 ✨"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="agent-phrases" className="block">Modismos / así hablamos acá (opcional)</Label>
                <Textarea
                  id="agent-phrases"
                  rows={2}
                  value={localPhrases}
                  onChange={(e) => {
                    setLocalPhrases(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. parce, a la orden, con gusto, ¡de una!"
                />
              </div>

              <div className="space-y-2">
                <Label className="block">Siempre pasar a una persona si…</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
              </div>
            </div>
          )}

          {view === "disponibilidad" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="agent-hours" className="block">Horario de atención (opcional)</Label>
                <Textarea
                  id="agent-hours"
                  rows={2}
                  value={businessHours}
                  onChange={(e) => {
                    setBusinessHours(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. Lunes a viernes 9am - 6pm, sábados 9am - 1pm, domingo cerrado."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-after-hours" className="block">Mensaje fuera de horario (opcional)</Label>
                <Textarea
                  id="agent-after-hours"
                  rows={2}
                  value={afterHoursMessage}
                  onChange={(e) => {
                    setAfterHoursMessage(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. En este momento estamos cerrados, te respondemos apenas abramos."
                />
              </div>
            </div>
          )}

          {view === "pagos" && (
            <div className="space-y-4">
              <p className="text-xs text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
                Opcional. Agregá todas las cuentas que aceptes — el agente las ofrece todas.
              </p>

              {paymentMethods.length > 0 && (
                <div className="space-y-3">
                  {paymentMethods.map((m, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start"
                    >
                      <Input
                        value={m.label}
                        onChange={(e) => updatePaymentMethod(index, { label: e.target.value })}
                        placeholder="Banco / billetera. Ej. Nequi"
                        className="h-8 min-w-0"
                      />
                      <Input
                        value={m.detail}
                        onChange={(e) => updatePaymentMethod(index, { detail: e.target.value })}
                        placeholder="Número de cuenta. Ej. 3054072356"
                        className="h-8 min-w-0"
                      />
                      <button
                        type="button"
                        onClick={() => removePaymentMethod(index)}
                        className="h-8 w-8 flex items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
                        style={{ color: 'var(--nexora-ink-dim)' }}
                        aria-label="Quitar cuenta"
                      >
                        <Trash2 size={14} />
                      </button>
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
            </div>
          )}

          {view === "conocimiento" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="agent-description" className="block">¿A qué se dedica el negocio? (opcional)</Label>
                <Textarea
                  id="agent-description"
                  rows={3}
                  value={businessDescription}
                  onChange={(e) => {
                    setBusinessDescription(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. Barbería especializada en cortes clásicos y arreglo de barba. 10 años en el barrio, atención sin cita."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-locations" className="block">Dirección / sedes (opcional)</Label>
                <Textarea
                  id="agent-locations"
                  rows={2}
                  value={locations}
                  onChange={(e) => {
                    setLocations(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. Sede principal: Cra 45 #10-20, Medellín. Sede norte: CC Santafé, local 210."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-social" className="block">Redes sociales (opcional)</Label>
                <Input
                  id="agent-social"
                  value={socialLinks}
                  onChange={(e) => {
                    setSocialLinks(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Ej. Instagram @barberia_x, Facebook Barbería X"
                />
              </div>

              <div className="space-y-3">
                <Label className="block">Preguntas frecuentes (opcional)</Label>
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

              {products.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="block">Productos que quieres destacar (opcional)</Label>
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
                </div>
              )}
            </div>
          )}

          {view === "herramientas" && (
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
