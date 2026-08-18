// app/(dashboard)/admin/mi-agente/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getAgentConfig } from "@/lib/services/agentConfigService";
import { AGENT_TOOLS } from "@/lib/config/agentTools";
import { MiAgentePanel } from "./mi-agente-panel";
import { TestAgentChat } from "./test-agent-chat";

const DEFAULT_AGENT_CONFIG = {
  name: "Tu Agente",
  personality: "",
  enabledTools: [],
  systemPromptExtra: "",
  useEmojis: false,
  responseLength: null,
  language: null,
  priorityProducts: [],
  restrictions: "",
  faqText: "",
};

export default async function MiAgentePage() {
  const profile = await getSessionProfile();
  const agentConfig = profile?.businessId
    ? await getAgentConfig(profile.businessId)
    : DEFAULT_AGENT_CONFIG;

  return (
    <div className="space-y-10">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Mi Agente
      </h1>
      <MiAgentePanel agentConfig={agentConfig} catalog={AGENT_TOOLS} />
      <div className="max-w-lg mx-auto border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      <TestAgentChat />
    </div>
  );
}
