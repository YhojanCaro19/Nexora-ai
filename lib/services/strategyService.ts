// lib/services/strategyService.ts
//
// Generación de la ESTRATEGIA de marketing con IA — el paso 1 de una
// estrategia (posicionamiento, ángulos de mensaje, plan por canal, ideas
// de campañas). Se llama desde el wizard "Nueva estrategia".
//
// Cobra `strategy` en créditos DESPUÉS de generar bien. Si no alcanza el
// saldo, bloquea antes (acción explícita y cara, tiene sentido avisar).
import Anthropic from "@anthropic-ai/sdk";
import { getCreditPrice, getCreditBalance, deductCredits } from "@/lib/services/creditService";

const client = new Anthropic();
const MODEL = "claude-sonnet-5";

export interface StrategyWizardAnswers {
  /** Qué quiere lograr (ej. "vender más", "recuperar clientes", "lanzar un producto"). */
  goal: string;
  /** Cliente ideal, en palabras del admin. */
  audience: string;
  /** Producto o servicio a impulsar. */
  focus: string;
  /** Qué lo diferencia de la competencia. */
  differentiator: string;
  /** Presupuesto mensual de pauta (en la moneda del negocio). null = sin definir. */
  monthlyBudget: number | null;
  budgetCurrency: "COP" | "USD";
  /** Canales elegidos: 'meta' | 'google' | 'tiktok' | 'organic'. */
  channels: string[];
  language: string;
}

export interface StrategyOutput {
  positioning: string;
  messageAngles: { title: string; description: string }[];
  channelPlan: { channel: string; audience: string; budgetShare: number; note: string }[];
  campaignIdeas: {
    name: string;
    objective: "awareness" | "traffic" | "leads" | "sales" | "engagement";
    channel: string;
    summary: string;
  }[];
}

export type GenerateStrategyResult =
  | { ok: true; output: StrategyOutput; creditsLeft: number }
  | { ok: false; reason: "insufficient_credits"; needed: number; have: number }
  | { ok: false; reason: "ai_error"; message: string };

export async function generateStrategy(
  businessId: string,
  businessContext: string,
  answers: StrategyWizardAnswers
): Promise<GenerateStrategyResult> {
  const [price, balance] = await Promise.all([
    getCreditPrice("strategy"),
    getCreditBalance(businessId),
  ]);
  if (price !== null && price > 0) {
    const have = balance?.total ?? 0;
    if (have < price) return { ok: false, reason: "insufficient_credits", needed: price, have };
  }

  const system = `Eres un estratega de marketing digital para pequeños negocios en Latinoamérica. Generas estrategias CONCRETAS y accionables — nunca genéricas, nunca frases de manual. Tono directo, en español.

Responde SOLO con un objeto JSON válido (sin markdown, sin texto antes o después) con exactamente esta forma:
{
  "positioning": "1-2 frases: cómo se debe posicionar el negocio",
  "messageAngles": [ { "title": "nombre corto del ángulo", "description": "cómo se usa, 1-2 frases" } ],
  "channelPlan": [ { "channel": "meta|google|tiktok|organic", "audience": "a quién apuntar en ese canal", "budgetShare": 40, "note": "recomendación breve" } ],
  "campaignIdeas": [ { "name": "nombre de la campaña", "objective": "awareness|traffic|leads|sales|engagement", "channel": "meta|google|tiktok|organic", "summary": "de qué va, 1-2 frases" } ]
}
Reglas: messageAngles 3-4 items. channelPlan solo con los canales que el negocio eligió, budgetShare debe sumar 100. campaignIdeas 2-4 items.`;

  const userPrompt = `NEGOCIO:
${businessContext}

RESPUESTAS DEL DUEÑO:
- Objetivo: ${answers.goal}
- Cliente ideal: ${answers.audience}
- Producto/servicio a impulsar: ${answers.focus}
- Qué lo diferencia: ${answers.differentiator}
- Presupuesto mensual de pauta: ${answers.monthlyBudget ? `${answers.monthlyBudget} ${answers.budgetCurrency}` : "sin definir"}
- Canales: ${answers.channels.join(", ") || "sin definir"}
- Idioma de la comunicación: ${answers.language}

Genera la estrategia.`;

  let text: string;
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system,
      messages: [{ role: "user", content: userPrompt }],
    });
    text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  } catch (err) {
    console.error("[generateStrategy] error de Claude:", err);
    return {
      ok: false,
      reason: "ai_error",
      message: err instanceof Error ? err.message : "No se pudo generar la estrategia.",
    };
  }

  let output: StrategyOutput;
  try {
    const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    output = JSON.parse(json) as StrategyOutput;
    if (!output.positioning || !Array.isArray(output.messageAngles)) {
      throw new Error("forma inesperada");
    }
  } catch {
    console.error("[generateStrategy] JSON inválido:", text.slice(0, 500));
    return { ok: false, reason: "ai_error", message: "La IA devolvió un formato inesperado. Intenta de nuevo." };
  }

  let creditsLeft = balance?.total ?? 0;
  if (price !== null && price > 0) {
    try {
      const nb = await deductCredits(businessId, price, "strategy", "strategy");
      if (nb !== null) creditsLeft = nb;
    } catch (err) {
      console.error("[generateStrategy] no se pudo descontar créditos:", err);
    }
  }

  return { ok: true, output, creditsLeft };
}
