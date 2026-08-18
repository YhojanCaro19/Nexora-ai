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

// `agent_configs` en Supabase tiene más columnas de las que esta pantalla
// expone hoy (Mi Agente solo deja editar name/personality/enabled_tools)
// — el resto (system_prompt_extra, use_emojis, response_length, language,
// priority_products, restrictions, faq_text) ya existen en la base,
// esperando su UI. El motor del agente SÍ las lee y las usa todas, aunque
// todavía no haya dónde configurarlas desde el panel — cuando se
// construya esa UI, ya quedan conectadas.
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
}

export async function getAgentConfig(businessId: string): Promise<AgentConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_configs")
    .select(
      "name, personality, enabled_tools, system_prompt_extra, use_emojis, response_length, language, priority_products, restrictions, faq_text"
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
  };
}

export async function updateAgentConfig(
  businessId: string,
  input: { name: string; personality: string; enabledTools: string[] }
): Promise<{ error: string | null }> {
  const name = input.name.trim() || "Tu Agente";
  const personality = input.personality.trim();
  const clean = sanitizeToolKeys(input.enabledTools);

  const supabase = await createClient();
  const { error } = await supabase
    .from("agent_configs")
    .update({ name, personality: personality || null, enabled_tools: clean })
    .eq("business_id", businessId);

  if (error) {
    console.error("[updateAgentConfig] error:", error);
    return { error: translateError(error) };
  }
  return { error: null };
}
