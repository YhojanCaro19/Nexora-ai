// app/(dashboard)/superadmin/agentes/page.tsx
import { getIndustryTemplates, getToolCatalog } from "@/lib/services/agentTemplateService";
import { AgentTemplatesPanel } from "./agent-templates-panel";

export default async function AgentesPage() {
  const [templates, catalog] = await Promise.all([
    getIndustryTemplates(),
    Promise.resolve(getToolCatalog()),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Agentes
      </h1>

      <AgentTemplatesPanel templates={templates} catalog={catalog} />
    </div>
  );
}
