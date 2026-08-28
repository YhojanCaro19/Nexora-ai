// app/(dashboard)/admin/mi-agente/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getAgentConfig } from "@/lib/services/agentConfigService";
import { getProducts } from "@/lib/services/productService";
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
  faqs: [],
  businessHours: "",
  greetingMessage: "",
  escalationMessage: "",
  fallbackMessage: "",
  afterHoursMessage: "",
  farewellMessage: "",
  acceptsCashPickup: false,
  bankName: "",
  bankAccountNumber: "",
};

export default async function MiAgentePage() {
  const profile = await getSessionProfile();
  const [agentConfig, products] = await Promise.all([
    profile?.businessId ? getAgentConfig(profile.businessId) : Promise.resolve(DEFAULT_AGENT_CONFIG),
    profile?.businessId ? getProducts(profile.businessId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Mi Agente
      </h1>
      <MiAgentePanel agentConfig={agentConfig} catalog={AGENT_TOOLS} products={products} />

      <div className="border-t pt-10" style={{ borderColor: 'var(--nexora-line)' }}>
        <TestAgentChat />
      </div>
    </div>
  );
}
