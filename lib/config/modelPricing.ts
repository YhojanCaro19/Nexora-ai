// lib/config/modelPricing.ts
//
// Precios de lista de la API de Anthropic, en USD por millón de tokens.
// Fuente: console.anthropic.com → Billing y la doc de precios de Anthropic.
// Revisar acá si se cambia el modelo del agente (agentEngineService.ts) o si
// Anthropic ajusta tarifas. Es precio de LISTA — no contempla descuentos por
// volumen, Batch API (50%), ni créditos promocionales.
//
// Reglas de caché de prompts (todas las familias actuales de Claude):
//   - lectura de caché       = 0,10x del precio de input
//   - escritura de caché 5m  = 1,25x del precio de input   ← lo que usa el motor
//   - escritura de caché 1h  = 2,00x del precio de input
// El motor solo usa TTL de 5 minutos, así que el cálculo asume 1,25x.

export interface ModelPricing {
  /** USD por millón de tokens de entrada (no cacheados). */
  inputPerMTok: number;
  /** USD por millón de tokens de salida. */
  outputPerMTok: number;
}

// Solo los modelos que el proyecto puede llegar a usar. Si aparece un `model`
// desconocido en `agent_usage_log` (ej. se probó otro modelo a mano), se cae
// al precio de Sonnet 5 para no romper el cálculo ni subestimar el costo.
const PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-5": { inputPerMTok: 2, outputPerMTok: 10 },
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5 },
  "claude-opus-5": { inputPerMTok: 5, outputPerMTok: 25 },
};

const FALLBACK_PRICING: ModelPricing = PRICING["claude-sonnet-5"];

const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_5M_MULTIPLIER = 1.25;

export interface TokenBreakdown {
  /** Entrada fresca — tokens que NO vinieron de caché. */
  inputTokens: number;
  outputTokens: number;
  /** Tokens leídos del caché de prompt (se cobran a 0,1x). */
  cacheReadTokens: number;
  /** Tokens escritos al caché de prompt (se cobran a 1,25x con TTL de 5m). */
  cacheCreationTokens: number;
}

export function getModelPricing(model: string | null | undefined): ModelPricing {
  if (!model) return FALLBACK_PRICING;
  return PRICING[model] ?? FALLBACK_PRICING;
}

// Costo en USD de un desglose de tokens para un modelo dado. Se llama por
// fila de `agent_usage_log` y se suma — nunca asume que todas las filas usan
// el mismo modelo.
export function estimateCostUsd(model: string | null | undefined, tokens: TokenBreakdown): number {
  const p = getModelPricing(model);
  const inPerTok = p.inputPerMTok / 1_000_000;
  const outPerTok = p.outputPerMTok / 1_000_000;
  return (
    tokens.inputTokens * inPerTok +
    tokens.outputTokens * outPerTok +
    tokens.cacheReadTokens * inPerTok * CACHE_READ_MULTIPLIER +
    tokens.cacheCreationTokens * inPerTok * CACHE_WRITE_5M_MULTIPLIER
  );
}

// Cuánto se habría pagado por los tokens que se sirvieron desde caché si NO
// hubiera caché (para mostrar el ahorro). Compara "lo que costó leerlos de
// caché (0,1x) + escribirlos una vez (1,25x)" contra "pagarlos completos
// cada vez". Aproximación: asume que cada token cacheado se escribió una vez
// y se leyó las demás — con `cacheCreationTokens` como proxy de escrituras.
export function estimateCacheSavingsUsd(
  model: string | null | undefined,
  cacheReadTokens: number,
  cacheCreationTokens: number
): number {
  const p = getModelPricing(model);
  const inPerTok = p.inputPerMTok / 1_000_000;
  const withoutCache = (cacheReadTokens + cacheCreationTokens) * inPerTok;
  const withCache =
    cacheReadTokens * inPerTok * CACHE_READ_MULTIPLIER +
    cacheCreationTokens * inPerTok * CACHE_WRITE_5M_MULTIPLIER;
  return Math.max(0, withoutCache - withCache);
}
