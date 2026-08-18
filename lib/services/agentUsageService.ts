// lib/services/agentUsageService.ts
//
// Tracking de tokens/costo del agente por negocio, desde el día uno —
// aunque todavía no se cobre por uso. Va con service role porque
// `agent_usage_log` no tiene policy de INSERT (solo SELECT para el admin
// del negocio) — mismo criterio que `businessBrandingService.ts`.
import { createAdminClient } from "@/lib/supabase/server";

export async function logAgentUsage(
  businessId: string,
  inputTokens: number,
  outputTokens: number,
  model: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("agent_usage_log").insert({
    business_id: businessId,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    model,
  });

  // Nunca bloquea la respuesta del agente al cliente por esto — es
  // observabilidad, no algo de lo que dependa la conversación.
  if (error) {
    console.error("[logAgentUsage] error:", error);
  }
}
