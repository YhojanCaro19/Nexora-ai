// app/(dashboard)/admin/mi-agente/page.tsx
import Link from "next/link";
import { Radio, ChevronRight } from "lucide-react";
import { getSessionProfile } from "@/lib/auth/get-session";
import { getAgentConfig, type AgentConfig } from "@/lib/services/agentConfigService";
import { getProducts } from "@/lib/services/productService";
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

      <Link
        href="/admin/mi-agente/canales"
        className="mx-auto flex max-w-md items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-white/[0.03]"
        style={{ borderColor: 'var(--nexora-line)' }}
      >
        <Radio size={18} strokeWidth={1.75} style={{ color: 'var(--nexora-nova)' }} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
            Canales
          </span>
          <span className="block text-[11px]" style={{ color: 'var(--nexora-ink-dim)' }}>
            Conecta WhatsApp, Messenger e Instagram para que el agente responda ahí
          </span>
        </span>
        <ChevronRight size={16} style={{ color: 'var(--nexora-ink-dim)' }} />
      </Link>

      <div className="border-t pt-10" style={{ borderColor: 'var(--nexora-line)' }}>
        <TestAgentChat />
      </div>
    </div>
  );
}
