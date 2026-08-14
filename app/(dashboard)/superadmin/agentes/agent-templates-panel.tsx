"use client";

import { useState } from "react";
import { Wrench, LayoutTemplate, ChevronLeft } from "lucide-react";
import { updateIndustryTemplateAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { AGENT_TOOLS } from "@/lib/config/agentTools";
import type { IndustryTemplate } from "@/lib/services/agentTemplateService";

type ToolCatalog = typeof AGENT_TOOLS;
type View = "chooser" | "catalog" | "templates";

export function AgentTemplatesPanel({
  templates,
  catalog,
}: {
  templates: IndustryTemplate[];
  catalog: ToolCatalog;
}) {
  const [view, setView] = useState<View>("chooser");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.industryType === selectedIndustry) ?? null;

  if (view === "chooser") {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-10">
        <ChooserButton
          icon={Wrench}
          label="Catálogo de herramientas"
          count={catalog.length}
          onClick={() => setView("catalog")}
        />
        <ChooserButton
          icon={LayoutTemplate}
          label="Plantillas por industria"
          count={templates.length}
          onClick={() => setView("templates")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative flex items-center justify-center">
        <BackButton
          onClick={() => {
            if (view === "templates" && selectedIndustry) {
              setSelectedIndustry(null);
            } else {
              setView("chooser");
            }
          }}
        />
        <h2 className="font-nexora text-lg text-center" style={{ color: 'var(--nexora-ink)' }}>
          {view === "catalog"
            ? "Catálogo de herramientas"
            : selectedTemplate
              ? `Plantilla agente ${selectedTemplate.industryLabel}`
              : "Plantillas por industria"}
        </h2>
      </div>

      {view === "catalog" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map((tool) => (
            <div
              key={tool.key}
              className="rounded-2xl border p-6 text-center space-y-1.5"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--nexora-ink)' }}>{tool.label}</p>
              <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>{tool.description}</p>
            </div>
          ))}
        </div>
      )}

      {view === "templates" && !selectedTemplate && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.industryType}
              label={template.industryLabel}
              onClick={() => setSelectedIndustry(template.industryType)}
            />
          ))}
        </div>
      )}

      {view === "templates" && selectedTemplate && (
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

function ChooserButton({
  icon: Icon,
  label,
  count,
  onClick,
}: {
  icon: typeof Wrench;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 w-48 h-48 rounded-3xl border transition-all duration-300 hover:scale-105"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
    >
      <Icon size={32} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
      <span className="text-sm font-medium text-center px-2" style={{ color: 'var(--nexora-ink)' }}>
        {label}
      </span>
      <span className="text-2xl font-light" style={{ color: 'var(--nexora-ink-dim)' }}>
        {count}
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

function TemplateDetail({
  template,
  catalog,
}: {
  template: IndustryTemplate;
  catalog: ToolCatalog;
}) {
  // Siempre arranca vacío — el superadmin marca a mano lo que quiere para
  // esta plantilla cada vez, no se precarga con lo que ya estaba guardado.
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: string, checked: boolean) => {
    setSaved(false);
    setSelected((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
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
    <div className="max-w-lg mx-auto rounded-2xl border p-8 space-y-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
        Qué herramientas trae por defecto un negocio de este tipo al crearse. El admin de cada
        negocio puede después prender/apagar las suyas desde &quot;Mi Agente&quot;.
      </p>

      <div className="flex flex-col items-center gap-3">
        {catalog.map((tool) => (
          <Label key={tool.key} htmlFor={`tool-${tool.key}`} className="font-normal">
            <Checkbox
              id={`tool-${tool.key}`}
              checked={selected.includes(tool.key)}
              onCheckedChange={(checked) => toggle(tool.key, checked === true)}
            />
            {tool.label}
          </Label>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button disabled={saving} onClick={handleSave}>
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
