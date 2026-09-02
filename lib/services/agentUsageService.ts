// lib/services/agentUsageService.ts
//
// Tracking de tokens/costo del agente por negocio, desde el día uno —
// aunque todavía no se cobre por uso. Va con service role porque
// `agent_usage_log` no tiene policy de INSERT (solo SELECT para el admin
// del negocio) — mismo criterio que `businessBrandingService.ts`.
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { estimateCostUsd, estimateCacheSavingsUsd } from "@/lib/config/modelPricing";

export interface AgentTurnUsage {
  /** Tokens de entrada NO cacheados (Anthropic los reporta aparte de cache). */
  inputTokens: number;
  outputTokens: number;
  /** Tokens leídos del cache de prompt (se cobran a 0,1×). */
  cacheReadTokens: number;
  /** Tokens escritos al cache de prompt (se cobran a 1,25×). */
  cacheCreationTokens: number;
}

// Un turno del agente puede ser varias llamadas a la API (rondas de tool):
// `usage` ya viene sumado desde runAgentTurn. Guardar el desglose de cache
// aparte es lo que permite calcular el costo real (input a 1×, cache_read a
// 0,1×, cache_creation a 1,25×) para calibrar los precios en créditos.
export async function logAgentUsage(
  businessId: string,
  usage: AgentTurnUsage,
  model: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("agent_usage_log").insert({
    business_id: businessId,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cache_read_input_tokens: usage.cacheReadTokens,
    cache_creation_input_tokens: usage.cacheCreationTokens,
    model,
  });

  // Nunca bloquea la respuesta del agente al cliente por esto — es
  // observabilidad, no algo de lo que dependa la conversación.
  if (error) {
    console.error("[logAgentUsage] error:", error);
  }
}

// Ventana del "consumo del agente" que ve el dueño en Perfil. Va acotado
// a los últimos 30 días — si no, el total crece para siempre y nunca
// cuadra con nada que el dueño pueda comparar (ej. el panel de Anthropic
// muestra ventanas móviles / reset mensual). 30 días ≈ "este mes", que es
// el marco con el que se piensan los cupos del plan.
export const OWN_AGENT_USAGE_WINDOW_DAYS = 30;

// Consumo del agente de UN negocio, para que su propio admin lo vea en
// Perfil → Plan (hereda la misma fuente que el panel de superadmin, pero
// SIN precios — al dueño solo le mostramos tokens gastados). Va por el
// cliente normal: `agent_usage_log` tiene SELECT para is_business_admin
// (RLS), así que un colaborador recibe null y la UI simplemente no lo
// muestra. Se agrega en JS por el mismo motivo que getAgentUsageByBusiness.
export interface OwnAgentUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  /** Volumen total procesado: entrada fresca + caché leído + caché escrito + salida. */
  totalTokens: number;
  // Cada fila de agent_usage_log = un turno del agente = una respuesta a un
  // mensaje entrante del cliente (ver logAgentUsage en runAgentTurn). NO es
  // el número de conversaciones/hilos — eso es `conversationCount`.
  replyCount: number;
  // Hilos de conversación con actividad del agente en la ventana (filas de
  // `conversations` actualizadas en los últimos 30 días).
  conversationCount: number;
  lastUsedAt: string | null;
  // Días que cubre la ventana — para rotularlo en la UI.
  windowDays: number;
}

export async function getAgentUsageForBusiness(
  businessId: string
): Promise<OwnAgentUsage | null> {
  const supabase = await createClient();
  const since = new Date(
    Date.now() - OWN_AGENT_USAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const [{ data, error }, { count: conversationCount, error: convError }] = await Promise.all([
    supabase
      .from("agent_usage_log")
      .select(
        "input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, created_at"
      )
      .eq("business_id", businessId)
      .gte("created_at", since),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("updated_at", since),
  ]);

  if (error) {
    console.error("[getAgentUsageForBusiness] error:", error);
    return null;
  }
  if (convError) {
    console.error("[getAgentUsageForBusiness] error contando conversaciones:", convError);
  }

  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheCreation = 0;
  let lastUsedAt: string | null = null;
  for (const row of data ?? []) {
    input += row.input_tokens ?? 0;
    output += row.output_tokens ?? 0;
    cacheRead += row.cache_read_input_tokens ?? 0;
    cacheCreation += row.cache_creation_input_tokens ?? 0;
    if (!lastUsedAt || row.created_at > lastUsedAt) lastUsedAt = row.created_at;
  }

  return {
    totalInputTokens: input,
    totalOutputTokens: output,
    totalCacheReadTokens: cacheRead,
    totalCacheCreationTokens: cacheCreation,
    totalTokens: input + output + cacheRead + cacheCreation,
    replyCount: (data ?? []).length,
    conversationCount: conversationCount ?? 0,
    lastUsedAt,
    windowDays: OWN_AGENT_USAGE_WINDOW_DAYS,
  };
}

export interface BusinessAgentUsage {
  businessId: string;
  businessName: string;
  /** Entrada fresca — tokens que NO vinieron de caché (precio completo). */
  totalInputTokens: number;
  totalOutputTokens: number;
  /** Tokens leídos del caché de prompt (0,1× del precio de entrada). */
  totalCacheReadTokens: number;
  /** Tokens escritos al caché de prompt (1,25× con TTL de 5m). */
  totalCacheCreationTokens: number;
  /** Volumen real procesado: entrada fresca + caché leído + caché escrito + salida. */
  totalTokens: number;
  /** Costo estimado en USD a precio de lista de Anthropic (suma por fila, respeta el `model` de cada una). */
  estimatedCostUsd: number;
  /** Cuánto se ahorró gracias al caché, en USD (vs. pagar esos tokens completos). */
  cacheSavingsUsd: number;
  /** Fracción de la entrada total servida desde caché (0–1). 0 = el caché no está pegando. */
  cacheHitRatio: number;
  /** Último modelo visto en las filas de este negocio (contexto para la UI). */
  model: string | null;
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
    .select(
      "business_id, input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, model, created_at, businesses(name)"
    );

  if (error) {
    console.error("[getAgentUsageByBusiness] error:", error);
    return [];
  }

  // Acumulador mutable por negocio — el costo se calcula por fila (respeta
  // el `model` de cada una) y se suma. Los ratios/derivados se resuelven al
  // final, una vez que están todos los totales.
  interface Acc {
    businessId: string;
    businessName: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    costUsd: number;
    savingsUsd: number;
    model: string | null;
    turnCount: number;
    lastUsedAt: string | null;
  }

  const byBusiness = new Map<string, Acc>();
  for (const row of data ?? []) {
    const businessName =
      (row.businesses as unknown as { name: string } | null)?.name ?? "Negocio eliminado";
    const cacheRead = row.cache_read_input_tokens ?? 0;
    const cacheCreation = row.cache_creation_input_tokens ?? 0;
    const rowCost = estimateCostUsd(row.model, {
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      cacheReadTokens: cacheRead,
      cacheCreationTokens: cacheCreation,
    });
    const rowSavings = estimateCacheSavingsUsd(row.model, cacheRead, cacheCreation);

    const existing = byBusiness.get(row.business_id);
    if (existing) {
      existing.inputTokens += row.input_tokens;
      existing.outputTokens += row.output_tokens;
      existing.cacheReadTokens += cacheRead;
      existing.cacheCreationTokens += cacheCreation;
      existing.costUsd += rowCost;
      existing.savingsUsd += rowSavings;
      existing.turnCount += 1;
      if (!existing.lastUsedAt || row.created_at > existing.lastUsedAt) {
        existing.lastUsedAt = row.created_at;
        existing.model = row.model ?? existing.model;
      }
    } else {
      byBusiness.set(row.business_id, {
        businessId: row.business_id,
        businessName,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        cacheReadTokens: cacheRead,
        cacheCreationTokens: cacheCreation,
        costUsd: rowCost,
        savingsUsd: rowSavings,
        model: row.model ?? null,
        turnCount: 1,
        lastUsedAt: row.created_at,
      });
    }
  }

  return Array.from(byBusiness.values())
    .map((a): BusinessAgentUsage => {
      const totalInputSide = a.inputTokens + a.cacheReadTokens;
      return {
        businessId: a.businessId,
        businessName: a.businessName,
        totalInputTokens: a.inputTokens,
        totalOutputTokens: a.outputTokens,
        totalCacheReadTokens: a.cacheReadTokens,
        totalCacheCreationTokens: a.cacheCreationTokens,
        totalTokens:
          a.inputTokens + a.cacheReadTokens + a.cacheCreationTokens + a.outputTokens,
        estimatedCostUsd: a.costUsd,
        cacheSavingsUsd: a.savingsUsd,
        cacheHitRatio: totalInputSide > 0 ? a.cacheReadTokens / totalInputSide : 0,
        model: a.model,
        turnCount: a.turnCount,
        lastUsedAt: a.lastUsedAt,
      };
    })
    .sort((x, y) => y.estimatedCostUsd - x.estimatedCostUsd);
}
