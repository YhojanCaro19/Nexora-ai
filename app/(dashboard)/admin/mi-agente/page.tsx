// app/(dashboard)/admin/mi-agente/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getAgentConfig } from "@/lib/services/agentConfigService";
import { AGENT_TOOLS } from "@/lib/config/agentTools";
import { MiAgentePanel } from "./mi-agente-panel";

export default async function MiAgentePage() {
  const profile = await getSessionProfile();
  const agentConfig = profile?.businessId
    ? await getAgentConfig(profile.businessId)
    : { name: "Tu Agente", personality: "", enabledTools: [] };

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Mi Agente
      </h1>
      <MiAgentePanel agentConfig={agentConfig} catalog={AGENT_TOOLS} />
    </div>
  );
}
