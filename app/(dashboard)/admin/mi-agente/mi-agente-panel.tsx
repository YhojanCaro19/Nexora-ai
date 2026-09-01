"use client";

import { useState, type ReactNode } from "react";
import {
  Sparkles,
  MessageCircle,
  LifeBuoy,
  BookOpen,
  Wallet,
  Wrench,
  Plus,
  Trash2,
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
import { AgentPreview } from "./agent-preview";
import type { AgentConfig, FaqEntry } from "@/lib/services/agentConfigService";
import type { AGENT_TOOLS } from "@/lib/config/agentTools";
import type { Product } from "@/lib/services/productService";
import { EMOJI_MODES, ADDRESS_FORMS, type PaymentMethod } from "@/lib/config/agentPersona";
import { ESCALATION_TRIGGERS } from "@/lib/config/escalationTriggers";

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

// Bloque de sección: encabezado con ícono + línea + los campos. Todo vive
// en una sola página que fluye (ya no hay "entrar y salir" de secciones).
function ConfigSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
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
      <Label htmlFor={htmlFor} className="block">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function MiAgentePanel({
  agentConfig,
  catalog,
  products,
  businessName,
}: {
  agentConfig: AgentConfig;
  catalog: ToolCatalog;
  products: Product[];
  businessName: string | null;
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

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ---- Vista previa (arriba en móvil, fija al costado en desktop) ---- */}
        <div className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-6">
            <AgentPreview
              name={name}
              greeting={greetingMessage}
              emojiMode={emojiMode}
              emojiSet={emojiSet}
              addressForm={addressForm}
              responseLength={responseLength}
              localPhrases={localPhrases}
              paymentMethods={paymentMethods}
              businessName={businessName}
              sampleProduct={
                (priorityProducts.length > 0
                  ? products.find((p) => p.id === priorityProducts[0])
                  : products[0]) ?? null
              }
            />
          </div>
        </div>

        {/* ---- Configuración ---- */}
        <div className="order-2 space-y-10 lg:order-1">
          <ConfigSection icon={Sparkles} title="Identidad">
            <Field label="Nombre del agente" htmlFor="agent-name">
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => touched(setName)(e.target.value)}
                placeholder="Ej. Nova, Max, Avhen…"
              />
            </Field>
            <Field label="Mensaje de bienvenida (opcional)" htmlFor="agent-greeting">
              <Input
                id="agent-greeting"
                value={greetingMessage}
                onChange={(e) => touched(setGreetingMessage)(e.target.value)}
                placeholder="Ej. ¡Hola! Bienvenido a [negocio], ¿en qué te ayudo hoy?"
              />
            </Field>
            <Field label="Personalidad y tono (opcional)" htmlFor="agent-personality">
              <Textarea
                id="agent-personality"
                rows={3}
                value={personality}
                onChange={(e) => touched(setPersonality)(e.target.value)}
                placeholder="Ej. Cercano y cordial, siempre ofrece ayuda extra…"
              />
            </Field>
          </ConfigSection>

          <ConfigSection icon={MessageCircle} title="Cómo habla">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Emojis">
                <Select value={emojiMode} onValueChange={(v) => v && touched(setEmojiMode)(v as typeof emojiMode)}>
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
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
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
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
                <Input
                  id="agent-emoji-set"
                  value={emojiSet}
                  onChange={(e) => touched(setEmojiSet)(e.target.value)}
                  placeholder="Ej. ✂️ 💈 🔥 ✨"
                />
              </Field>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Longitud de respuesta">
                <Select value={responseLength} onValueChange={(v) => touched(setResponseLength)(v ?? "")}>
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue placeholder="Sin preferencia" />
                  </SelectTrigger>
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
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue placeholder="Español" />
                  </SelectTrigger>
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
              <Textarea
                id="agent-phrases"
                rows={2}
                value={localPhrases}
                onChange={(e) => touched(setLocalPhrases)(e.target.value)}
                placeholder="Ej. parce, a la orden, con gusto, ¡de una!"
              />
            </Field>

            <Field label="Instrucciones adicionales (opcional)" htmlFor="agent-extra">
              <Textarea
                id="agent-extra"
                rows={2}
                value={systemPromptExtra}
                onChange={(e) => touched(setSystemPromptExtra)(e.target.value)}
                placeholder="Cualquier instrucción extra que quieras darle al agente."
              />
            </Field>
            <Field label="Restricciones (opcional)" htmlFor="agent-restrictions">
              <Textarea
                id="agent-restrictions"
                rows={2}
                value={restrictions}
                onChange={(e) => touched(setRestrictions)(e.target.value)}
                placeholder="Ej. No ofrecer descuentos, no hablar de la competencia…"
              />
            </Field>
            <Field label="Mensaje cuando no sabe algo (opcional)" htmlFor="agent-fallback">
              <Textarea
                id="agent-fallback"
                rows={2}
                value={fallbackMessage}
                onChange={(e) => touched(setFallbackMessage)(e.target.value)}
                placeholder="Ej. Mejor te confirmo esto directamente, dame un momento."
              />
            </Field>
            <Field label="Mensaje de despedida (opcional)" htmlFor="agent-farewell">
              <Textarea
                id="agent-farewell"
                rows={2}
                value={farewellMessage}
                onChange={(e) => touched(setFarewellMessage)(e.target.value)}
                placeholder="Ej. ¡Gracias por escribirnos, que tengas un excelente día!"
              />
            </Field>
          </ConfigSection>

          <ConfigSection icon={LifeBuoy} title="Cuándo pasar a una persona">
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
            <Field label="Mensaje de escalamiento (opcional)" htmlFor="agent-escalation">
              <Textarea
                id="agent-escalation"
                rows={2}
                value={escalationMessage}
                onChange={(e) => touched(setEscalationMessage)(e.target.value)}
                placeholder="Ej. Si quieres hablar directamente con nosotros, escríbenos al 300-123-4567."
              />
            </Field>
          </ConfigSection>

          <ConfigSection icon={BookOpen} title="Sobre el negocio">
            <Field label="¿A qué se dedica el negocio? (opcional)" htmlFor="agent-description">
              <Textarea
                id="agent-description"
                rows={3}
                value={businessDescription}
                onChange={(e) => touched(setBusinessDescription)(e.target.value)}
                placeholder="Ej. Barbería especializada en cortes clásicos y arreglo de barba. 10 años en el barrio."
              />
            </Field>
            <Field label="Dirección / sedes (opcional)" htmlFor="agent-locations">
              <Textarea
                id="agent-locations"
                rows={2}
                value={locations}
                onChange={(e) => touched(setLocations)(e.target.value)}
                placeholder="Ej. Sede principal: Cra 45 #10-20, Medellín. Sede norte: CC Santafé, local 210."
              />
            </Field>
            <Field label="Redes sociales (opcional)" htmlFor="agent-social">
              <Input
                id="agent-social"
                value={socialLinks}
                onChange={(e) => touched(setSocialLinks)(e.target.value)}
                placeholder="Ej. Instagram @barberia_x, Facebook Barbería X"
              />
            </Field>
            <Field label="Horario de atención (opcional)" htmlFor="agent-hours">
              <Textarea
                id="agent-hours"
                rows={2}
                value={businessHours}
                onChange={(e) => touched(setBusinessHours)(e.target.value)}
                placeholder="Ej. Lunes a viernes 9am - 6pm, sábados 9am - 1pm, domingo cerrado."
              />
            </Field>
            <Field label="Mensaje fuera de horario (opcional)" htmlFor="agent-after-hours">
              <Textarea
                id="agent-after-hours"
                rows={2}
                value={afterHoursMessage}
                onChange={(e) => touched(setAfterHoursMessage)(e.target.value)}
                placeholder="Ej. En este momento estamos cerrados, te respondemos apenas abramos."
              />
            </Field>

            <div className="space-y-3">
              <Label className="block">Preguntas frecuentes (opcional)</Label>
              {faqs.length > 0 && (
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
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
          </ConfigSection>

          <ConfigSection icon={Wallet} title="Cuentas de pago">
            <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
              Opcional. Agregá todas las cuentas que aceptes — el agente las ofrece todas.
            </p>
            {paymentMethods.length > 0 && (
              <div className="space-y-3">
                {paymentMethods.map((m, index) => (
                  <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
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
                      className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
                      style={{ color: "var(--nexora-ink-dim)" }}
                      aria-label="Quitar cuenta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addPaymentMethod}>
              <Plus size={14} strokeWidth={1.75} />
              Agregar cuenta
            </Button>
          </ConfigSection>

          <ConfigSection icon={Wrench} title="Qué puede hacer">
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
          </ConfigSection>
        </div>
      </div>

      {/* ---- Guardar — al final de todo, quieto ---- */}
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
