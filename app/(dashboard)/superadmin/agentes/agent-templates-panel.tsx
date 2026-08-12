"use client";

import { useState } from "react";
import { updateIndustryTemplateAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { AGENT_TOOLS } from "@/lib/config/agentTools";
import type { IndustryTemplate } from "@/lib/services/agentTemplateService";

type ToolCatalog = typeof AGENT_TOOLS;

export function AgentTemplatesPanel({
  templates,
  catalog,
}: {
  templates: IndustryTemplate[];
  catalog: ToolCatalog;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Catálogo de herramientas</CardTitle>
          <CardDescription>
            Lo que un agente puede hacer hoy en la plataforma. Cada una es código real —
            para agregar una nueva hay que desarrollarla, no es un dato editable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {catalog.map((tool) => (
            <div key={tool.key} className="rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="font-medium" style={{ color: 'var(--nexora-ink)' }}>{tool.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--nexora-ink-dim)' }}>{tool.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plantillas por industria</CardTitle>
          <CardDescription>
            Qué herramientas trae por defecto un negocio nuevo, según su tipo. El admin de
            cada negocio puede después prender/apagar las suyas desde &quot;Mi Agente&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.map((template) => (
            <IndustryTemplateRow key={template.industryType} template={template} catalog={catalog} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function IndustryTemplateRow({
  template,
  catalog,
}: {
  template: IndustryTemplate;
  catalog: ToolCatalog;
}) {
  const [selected, setSelected] = useState<string[]>(template.toolKeys);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: string) => {
    setSaved(false);
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateIndustryTemplateAction(template.industryType, selected);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <p className="font-medium" style={{ color: 'var(--nexora-ink)' }}>{template.industryLabel}</p>

      <div className="flex flex-wrap gap-2">
        {catalog.map((tool) => {
          const active = selected.includes(tool.key);
          return (
            <button
              key={tool.key}
              type="button"
              onClick={() => toggle(tool.key)}
              className="rounded-full px-3 py-1 text-xs border transition-colors"
              style={{
                background: active ? 'var(--nexora-signal)' : 'transparent',
                color: active ? '#000' : 'var(--nexora-ink-dim)',
                borderColor: active ? 'var(--nexora-signal)' : 'rgba(255,255,255,0.15)',
              }}
            >
              {tool.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" disabled={saving} onClick={handleSave}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
        {saved && (
          <span className="text-xs" style={{ color: 'var(--nexora-signal)' }}>Guardado</span>
        )}
        {error && (
          <span className="text-xs" style={{ color: 'var(--nexora-alert)' }}>{error}</span>
        )}
      </div>
    </div>
  );
}
