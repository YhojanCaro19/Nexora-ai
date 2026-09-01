// app/(dashboard)/admin/mi-agente/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getAgentConfig, type AgentConfig } from "@/lib/services/agentConfigService";
import { getProducts } from "@/lib/services/productService";
import { getBusinessName, getBusinessIndustryType } from "@/lib/services/businessBrandingService";
import { AGENT_TOOLS } from "@/lib/config/agentTools";
import { MiAgentePanel } from "./mi-agente-panel";
import { TestAgentChat } from "./test-agent-chat";

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  name: "Tu Agente",
  personality: "",
  enabledTools: [],
  systemPromptExtra: "",
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
  paymentMethods: [],
  businessDescription: "",
  locations: "",
  socialLinks: "",
  emojiMode: "pocos",
  emojiSet: "",
  addressForm: "auto",
  localPhrases: "",
  escalationTriggers: [],
};

export default async function MiAgentePage() {
  const profile = await getSessionProfile();
  const [agentConfig, products, businessName, industryType] = await Promise.all([
    profile?.businessId ? getAgentConfig(profile.businessId) : Promise.resolve(DEFAULT_AGENT_CONFIG),
    profile?.businessId ? getProducts(profile.businessId) : Promise.resolve([]),
    profile?.businessId ? getBusinessName(profile.businessId) : Promise.resolve(null),
    profile?.businessId ? getBusinessIndustryType(profile.businessId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Mi Agente
      </h1>
      <MiAgentePanel
        agentConfig={agentConfig}
        catalog={AGENT_TOOLS}
        products={products}
        businessName={businessName}
        industryType={industryType}
      />

      <div className="border-t pt-10" style={{ borderColor: 'var(--nexora-line)' }}>
        <TestAgentChat />
      </div>
    </div>
  );
}
