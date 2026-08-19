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
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MultiSelectSearch } from "@/components/shared/MultiSelectSearch";
import { updateAgentConfigAction } from "./actions";
import type { AgentConfig } from "@/lib/services/agentConfigService";
import type { AGENT_TOOLS } from "@/lib/config/agentTools";
import type { Product } from "@/lib/services/productService";

type ToolCatalog = typeof AGENT_TOOLS;

const RESPONSE_LENGTH_OPTIONS = [
  { value: "corta", label: "Corta y directa" },
  { value: "media", label: "Media (default)" },
  { value: "larga", label: "Larga y detallada" },
];

// Encabezado reutilizable para cada tarjeta de sección — icono + título
// alineados a la izquierda, con una descripción corta opcional debajo.
// Es a propósito que esta pantalla rompa el centrado por default de los
// formularios de AVENTHRA: con 17 campos, agruparlos por tema y anclarlos
// a la izquierda es lo que le da jerarquía real (pedido explícito del
// usuario). El resto del panel sigue centrado, esto es la excepción.
function SectionHeader({
  icon: Icon,
  title,
  description,
  center,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <CardHeader>
      <CardTitle
        className={`flex items-center gap-2 font-nexora text-[15px] font-medium ${center ? "justify-center" : ""}`}
        style={{ color: 'var(--nexora-ink)' }}
      >
        <Icon size={16} strokeWidth={1.75} style={{ color: 'var(--nexora-nova)' }} />
        {title}
      </CardTitle>
      {description && (
        <CardDescription className={center ? "text-center" : undefined} style={{ color: 'var(--nexora-ink-dim)' }}>
          {description}
        </CardDescription>
      )}
    </CardHeader>
  );
}

export function MiAgentePanel({
  agentConfig,
  catalog,
  products,
}: {
  agentConfig: AgentConfig;
  catalog: ToolCatalog;
  products: Product[];
}) {
  const [name, setName] = useState(agentConfig.name);
  const [greetingMessage, setGreetingMessage] = useState(agentConfig.greetingMessage);
  const [personality, setPersonality] = useState(agentConfig.personality);
  const [systemPromptExtra, setSystemPromptExtra] = useState(agentConfig.systemPromptExtra);
  const [restrictions, setRestrictions] = useState(agentConfig.restrictions);
  const [useEmojis, setUseEmojis] = useState(agentConfig.useEmojis);
  const [responseLength, setResponseLength] = useState(agentConfig.responseLength ?? "");
  const [language, setLanguage] = useState(agentConfig.language ?? "");
  const [businessHours, setBusinessHours] = useState(agentConfig.businessHours);
  const [afterHoursMessage, setAfterHoursMessage] = useState(agentConfig.afterHoursMessage);
  const [faqText, setFaqText] = useState(agentConfig.faqText);
  const [acceptsCashPickup, setAcceptsCashPickup] = useState(agentConfig.acceptsCashPickup);
  const [bankName, setBankName] = useState(agentConfig.bankName);
  const [bankAccountNumber, setBankAccountNumber] = useState(agentConfig.bankAccountNumber);
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
      useEmojis,
      responseLength,
      language,
      businessHours,
      afterHoursMessage,
      faqText,
      acceptsCashPickup,
      bankName,
      bankAccountNumber,
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

      {/* 1 columna en mobile, 2 desde lg vía CSS columns (no grid): las 6
          card tienen alturas muy distintas (Identidad tiene 3 campos,
          Comportamiento tiene 8), y un grid de filas iguales estira cada
          card a la altura de la más alta de su fila, dejando espacio vacío
          adentro de las cortas. `columns` fluye cada card a su altura real
          y la siguiente sube a llenar el hueco (como Pinterest), sin
          importar el orden ni si el contenido cambia después. Cada Card
          lleva `break-inside-avoid` para que nunca se parta a la mitad
          entre columnas. */}
      <div className="columns-1 lg:columns-2 gap-6">
      {/* Identidad del agente — única sección centrada a propósito (pedido
          explícito), el resto de las tarjetas queda alineado a la izquierda. */}
      <Card className="mb-6 break-inside-avoid">
        <SectionHeader icon={Sparkles} title="Identidad del agente" center />
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Comportamiento y conversación */}
      <Card className="mb-6 break-inside-avoid">
        <SectionHeader icon={MessageCircle} title="Comportamiento y conversación" center />
        <CardContent className="space-y-4">
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
                <SelectTrigger>
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
              <Label htmlFor="agent-language" className="block">Idioma</Label>
              <Input
                id="agent-language"
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setSaved(false);
                }}
                placeholder="Español"
              />
            </div>
          </div>

          <Label htmlFor="agent-emojis" className="font-normal">
            <Checkbox
              id="agent-emojis"
              checked={useEmojis}
              onCheckedChange={(checked) => {
                setUseEmojis(checked === true);
                setSaved(false);
              }}
            />
            Usar emojis en las respuestas
          </Label>
        </CardContent>
      </Card>

      {/* Disponibilidad */}
      <Card className="mb-6 break-inside-avoid">
        <SectionHeader icon={Clock} title="Disponibilidad" center />
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Métodos de pago */}
      <Card className="mb-6 break-inside-avoid">
        <SectionHeader icon={Wallet} title="Métodos de pago" description="Opcional." center />
        <CardContent className="space-y-4">
          <Label htmlFor="agent-cash-pickup" className="font-normal">
            <Checkbox
              id="agent-cash-pickup"
              checked={acceptsCashPickup}
              onCheckedChange={(checked) => {
                setAcceptsCashPickup(checked === true);
                setSaved(false);
              }}
            />
            Aceptamos efectivo (recoger en tienda)
          </Label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="agent-bank-name" className="block">Nombre del banco</Label>
              <Input
                id="agent-bank-name"
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value);
                  setSaved(false);
                }}
                placeholder="Ej. Bancolombia"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-bank-account" className="block">Número de cuenta</Label>
              <Input
                id="agent-bank-account"
                value={bankAccountNumber}
                onChange={(e) => {
                  setBankAccountNumber(e.target.value);
                  setSaved(false);
                }}
                placeholder="Ej. 123-456789-00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conocimiento del negocio */}
      <Card className="mb-6 break-inside-avoid">
        <SectionHeader icon={BookOpen} title="Conocimiento del negocio" center />
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="agent-faq" className="block">Preguntas frecuentes (opcional)</Label>
            <Textarea
              id="agent-faq"
              rows={4}
              value={faqText}
              onChange={(e) => {
                setFaqText(e.target.value);
                setSaved(false);
              }}
              placeholder="Ej. ¿Hacen envíos? Sí, a toda la ciudad, costo $8.000..."
            />
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
        </CardContent>
      </Card>

      {/* Herramientas activas */}
      <Card className="mb-6 break-inside-avoid">
        <SectionHeader icon={Wrench} title="Herramientas activas" center />
        <CardContent>
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
        </CardContent>
      </Card>

      </div>

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
