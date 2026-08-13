"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { updateIndustryTemplateAction } from "./actions";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-8">
      <ToolCatalogSection catalog={catalog} />

      <div className="space-y-4">
        <div>
          <h2 className="font-medium" style={{ color: 'var(--nexora-ink)' }}>Plantillas por industria</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--nexora-ink-dim)' }}>
            Qué herramientas trae por defecto un negocio nuevo, según su tipo. El admin de
            cada negocio puede después prender/apagar las suyas desde &quot;Mi Agente&quot;.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <IndustryTemplateRow key={template.industryType} template={template} catalog={catalog} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Colapsado por defecto — es solo informativo (qué existe hoy) y ocupaba
// demasiado espacio siempre abierto encima de lo que sí se edita.
function ToolCatalogSection({ catalog }: { catalog: ToolCatalog }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div>
          <p className="font-medium" style={{ color: 'var(--nexora-ink)' }}>Catálogo de herramientas</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--nexora-ink-dim)' }}>
            Lo que un agente puede hacer hoy — cada una es código real, no un dato editable.
          </p>
        </div>
        <ChevronDown
          size={18}
          className="shrink-0 transition-transform duration-200"
          style={{ color: 'var(--nexora-ink-dim)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div className="border-t divide-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {catalog.map((tool) => (
            <div key={tool.key} className="px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>{tool.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--nexora-ink-dim)' }}>{tool.description}</p>
            </div>
          ))}
        </div>
      )}
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
    <div className="rounded-2xl border p-4 space-y-3 text-center" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <p className="font-medium" style={{ color: 'var(--nexora-ink)' }}>{template.industryLabel}</p>

      <div className="flex flex-wrap justify-center gap-2">
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

      <div className="flex items-center justify-center gap-3">
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
