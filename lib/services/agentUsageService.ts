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

export interface BusinessAgentUsage {
  businessId: string;
  businessName: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  turnCount: number;
  lastUsedAt: string | null;
}

// Vista de superadmin (Sistema → Consumo): tokens del agente sumados por
// negocio, de TODOS los negocios — a diferencia de logAgentUsage (por
// negocio, con service role porque el cron/motor del agente no corre con
// sesión de usuario), esto también va con service role porque el
// superadmin no es miembro de ningún negocio y `agent_usage_log` solo
// tiene policy de SELECT para is_business_admin(business_id). La ruta ya
// está protegida en el layout de /superadmin.
//
// Se agrega en JS, no con una vista SQL: el volumen esperado hoy (proyecto
// formativo, agente aún sin tráfico real de producción) no lo justifica.
// Si el volumen crece, este es el punto exacto a reemplazar por una vista
// materializada o una función agregada en Postgres.
export async function getAgentUsageByBusiness(): Promise<BusinessAgentUsage[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_usage_log")
    .select("business_id, input_tokens, output_tokens, created_at, businesses(name)");

  if (error) {
    console.error("[getAgentUsageByBusiness] error:", error);
    return [];
  }

  const byBusiness = new Map<string, BusinessAgentUsage>();
  for (const row of data ?? []) {
    const businessName = (row.businesses as unknown as { name: string } | null)?.name ?? "Negocio eliminado";
    const existing = byBusiness.get(row.business_id);
    if (existing) {
      existing.totalInputTokens += row.input_tokens;
      existing.totalOutputTokens += row.output_tokens;
      existing.totalTokens += row.input_tokens + row.output_tokens;
      existing.turnCount += 1;
      if (!existing.lastUsedAt || row.created_at > existing.lastUsedAt) {
        existing.lastUsedAt = row.created_at;
      }
    } else {
      byBusiness.set(row.business_id, {
        businessId: row.business_id,
        businessName,
        totalInputTokens: row.input_tokens,
        totalOutputTokens: row.output_tokens,
        totalTokens: row.input_tokens + row.output_tokens,
        turnCount: 1,
        lastUsedAt: row.created_at,
      });
    }
  }

  return Array.from(byBusiness.values()).sort((a, b) => b.totalTokens - a.totalTokens);
}
