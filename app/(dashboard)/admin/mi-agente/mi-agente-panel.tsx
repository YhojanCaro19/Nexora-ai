"use client";

import { useState } from "react";
import { Bot, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { updateAgentConfigAction } from "./actions";
import type { AgentConfig } from "@/lib/services/agentConfigService";
import type { AGENT_TOOLS } from "@/lib/config/agentTools";

type ToolCatalog = typeof AGENT_TOOLS;

export function MiAgentePanel({
  agentConfig,
  catalog,
}: {
  agentConfig: AgentConfig;
  catalog: ToolCatalog;
}) {
  const [name, setName] = useState(agentConfig.name);
  const [personality, setPersonality] = useState(agentConfig.personality);
  const [enabledTools, setEnabledTools] = useState<string[]>(agentConfig.enabledTools);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTool(key: string, checked: boolean) {
    setSaved(false);
    setEnabledTools((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateAgentConfigAction({ name, personality, enabledTools });
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
        <p className="text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>
         
        </p>
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

      <div
        className="flex items-start gap-2.5 rounded-xl border p-3.5"
        style={{ borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.06)' }}
      >
        <ShieldCheck size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: 'var(--nexora-signal)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--nexora-ink-dim)' }}>
          La personalidad que definas se suma a un límite fijo que ningún negocio puede
          quitar: tu agente nunca dice groserías, nunca hace algo ilegal, y nunca se sale
          del rol de agente de tu negocio.
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
