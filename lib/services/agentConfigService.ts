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

export interface AgentConfig {
  name: string;
  personality: string;
  enabledTools: AgentToolKey[];
}

export async function getAgentConfig(businessId: string): Promise<AgentConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_configs")
    .select("name, personality, enabled_tools")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    console.error("[getAgentConfig] error:", error);
  }

  return {
    name: data?.name ?? "Tu Agente",
    personality: data?.personality ?? "",
    enabledTools: sanitizeToolKeys(data?.enabled_tools),
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
