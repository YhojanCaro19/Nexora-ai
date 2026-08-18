// lib/services/agentConfigService.ts
//
// El agente de CADA negocio: nombre y personalidad/tono (personalización
// visual, sin efecto funcional todavía — ver docs/decisions.md, "Personalización
// del agente: nunca reemplaza la capa de seguridad base") y qué herramientas
// del catálogo tiene prendidas. Se crea automáticamente al aprobar una
// solicitud (ver createAccountFromRequest en adminService.ts), precargado
// con las herramientas por defecto de su industria — esta pantalla es
// donde el admin lo ve y lo ajusta.
import { createClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import { sanitizeToolKeys, type AgentToolKey } from "@/lib/config/agentTools";

// `agent_configs` — personalización completa del agente. El motor
// (agentEngineService.ts) lee y usa todos estos campos; esta pantalla es
// donde el admin los edita.
export interface AgentConfig {
  name: string;
  personality: string;
  enabledTools: AgentToolKey[];
  systemPromptExtra: string;
  useEmojis: boolean;
  responseLength: string | null;
  language: string | null;
  priorityProducts: string[];
  restrictions: string;
  faqText: string;
  businessHours: string;
  greetingMessage: string;
}

export interface UpdateAgentConfigInput {
  name: string;
  personality: string;
  enabledTools: string[];
  systemPromptExtra: string;
  useEmojis: boolean;
  responseLength: string;
  language: string;
  priorityProducts: string[];
  restrictions: string;
  faqText: string;
  businessHours: string;
  greetingMessage: string;
}

export async function getAgentConfig(businessId: string): Promise<AgentConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_configs")
    .select(
      "name, personality, enabled_tools, system_prompt_extra, use_emojis, response_length, language, priority_products, restrictions, faq_text, business_hours, greeting_message"
    )
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    console.error("[getAgentConfig] error:", error);
  }

  return {
    name: data?.name ?? "Tu Agente",
    personality: data?.personality ?? "",
    enabledTools: sanitizeToolKeys(data?.enabled_tools),
    systemPromptExtra: data?.system_prompt_extra ?? "",
    useEmojis: data?.use_emojis ?? false,
    responseLength: data?.response_length ?? null,
    language: data?.language ?? null,
    priorityProducts: Array.isArray(data?.priority_products) ? data.priority_products : [],
    restrictions: data?.restrictions ?? "",
    faqText: data?.faq_text ?? "",
    businessHours: data?.business_hours ?? "",
    greetingMessage: data?.greeting_message ?? "",
  };
}

export async function updateAgentConfig(
  businessId: string,
  input: UpdateAgentConfigInput
): Promise<{ error: string | null }> {
  const name = input.name.trim() || "Tu Agente";
  const clean = sanitizeToolKeys(input.enabledTools);

  const supabase = await createClient();
  const { error } = await supabase
    .from("agent_configs")
    .update({
      name,
      personality: input.personality.trim() || null,
      enabled_tools: clean,
      system_prompt_extra: input.systemPromptExtra.trim() || null,
      use_emojis: input.useEmojis,
      response_length: input.responseLength || null,
      language: input.language.trim() || null,
      priority_products: input.priorityProducts,
      restrictions: input.restrictions.trim() || null,
      faq_text: input.faqText.trim() || null,
      business_hours: input.businessHours.trim() || null,
      greeting_message: input.greetingMessage.trim() || null,
    })
    .eq("business_id", businessId);

  if (error) {
    console.error("[updateAgentConfig] error:", error);
    return { error: translateError(error) };
  }
  return { error: null };
}
