"use client";

import { useState } from "react";
import { Bot, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [faqText, setFaqText] = useState(agentConfig.faqText);
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
      faqText,
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
    <div className="max-w-lg mx-auto space-y-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(238,240,247,0.08)' }}
        >
          <Bot size={26} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
        </div>
      </div>

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

      <div className="space-y-1.5">
        <Label htmlFor="agent-extra" className="block text-center">Instrucciones adicionales (opcional)</Label>
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
        <Label htmlFor="agent-restrictions" className="block text-center">Restricciones adicionales (opcional)</Label>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="block text-center">Longitud de respuesta</Label>
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
          <Label htmlFor="agent-language" className="block text-center">Idioma</Label>
          <Input
            id="agent-language"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setSaved(false);
            }}
            placeholder="Español"
            className="text-center"
          />
        </div>
      </div>

      <Label htmlFor="agent-emojis" className="font-normal flex items-center justify-center gap-2">
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

      <div className="space-y-1.5">
        <Label htmlFor="agent-hours" className="block text-center">Horario de atención (opcional)</Label>
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
        <Label htmlFor="agent-faq" className="block text-center">Preguntas frecuentes (opcional)</Label>
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
        <div className="space-y-3">
          <Label className="block text-center">Productos que quieres destacar (opcional)</Label>
          <div className="flex flex-col items-center gap-2 max-h-48 overflow-y-auto w-full">
            {products.map((p) => (
              <Label key={p.id} htmlFor={`priority-${p.id}`} className="font-normal">
                <Checkbox
                  id={`priority-${p.id}`}
                  checked={priorityProducts.includes(p.id)}
                  onCheckedChange={(checked) => togglePriorityProduct(p.id, checked === true)}
                />
                {p.name}
              </Label>
            ))}
          </div>
        </div>
      )}

      <div
        className="flex items-start gap-2.5 rounded-xl border p-3.5"
        style={{ borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.06)' }}
      >
        <ShieldCheck size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: 'var(--nexora-signal)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--nexora-ink-dim)' }}>
          Todo lo que definas se suma a un límite fijo que ningún negocio puede quitar: tu
          agente nunca dice groserías, nunca hace algo ilegal, y nunca se sale del rol de
          agente de tu negocio.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="block text-center">Herramientas activas</Label>
        <div className="flex flex-col items-center gap-3">
          {catalog.map((tool) => (
            <Label key={tool.key} htmlFor={`tool-${tool.key}`} className="font-normal">
              <Checkbox
                id={`tool-${tool.key}`}
                checked={enabledTools.includes(tool.key)}
                onCheckedChange={(checked) => toggleTool(tool.key, checked === true)}
              />
              {tool.label}
            </Label>
          ))}
        </div>
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
