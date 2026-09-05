// lib/services/campaignReviewService.ts
//
// El "media buyer" que revisa la campaña ANTES de que el dueño la active de
// verdad (Meta ya la creó en pausa — ver publishStrategyAction). No es un
// gate que bloquea: es una segunda opinión honesta, igual que le pediría un
// dueño a alguien que sabe del tema antes de gastar su plata. El dueño
// sigue siendo el único que aprieta el botón de activar.
//
// Se genera UNA vez, justo al publicar (no en cada visita a la pantalla de
// "Confirmar y activar" — así no se re-cobra créditos por recargar la
// página), y queda guardado en marketing_strategies.review_result.
//
// El criterio de qué revisar viene de dos fuentes reales: las reglas de
// rechazo de Meta (atributos personales, promesas exageradas, categorías
// sensibles, escasez falsa — la causa de rechazo más común y menos
// conocida) y el sentido común de un media buyer evaluando coherencia
// mensaje/producto/presupuesto — no hay fórmula de LTV porque el wizard de
// AVENTHRA hoy no le pregunta al dueño cuánto vale un cliente nuevo.
import Anthropic from "@anthropic-ai/sdk";
import { getCreditPrice, getCreditBalance, deductCredits } from "@/lib/services/creditService";
import type { MarketingStrategy, MarketingPiece } from "@/lib/services/marketingService";

const client = new Anthropic();
const MODEL = "claude-sonnet-5";

export interface CampaignReviewFinding {
  title: string;
  detail: string;
}

export interface CampaignReviewResult {
  /** "ok": nada que objetar. "atencion": hay algo que vale la pena leer antes
   *  de activar, pero no es grave. "alto": riesgo real de rechazo de Meta o
   *  de gastar mal la plata — se muestra en rojo, pero NUNCA bloquea. */
  riskLevel: "ok" | "atencion" | "alto";
  findings: CampaignReviewFinding[];
  /** Opinión honesta, 2-4 frases, en primera persona de un media buyer. */
  opinion: string;
}

export type ReviewCampaignResult =
  | { ok: true; review: CampaignReviewResult; creditsLeft: number }
  | { ok: false; reason: "insufficient_credits"; needed: number; have: number }
  | { ok: false; reason: "ai_error"; message: string };

export async function reviewCampaign(
  businessId: string,
  strategy: MarketingStrategy,
  piece: MarketingPiece,
  businessContext: string
): Promise<ReviewCampaignResult> {
  const [price, balance] = await Promise.all([
    getCreditPrice("campaign_review"),
    getCreditBalance(businessId),
  ]);
  if (price !== null && price > 0) {
    const have = balance?.total ?? 0;
    if (have < price) return { ok: false, reason: "insufficient_credits", needed: price, have };
  }

  const budgetText = strategy.budgetAmount
    ? `${strategy.budgetAmount.toLocaleString("es-CO")} ${strategy.budgetCurrency} ${strategy.budgetPeriod === "daily" ? "por día" : "en total"}`
    : "sin definir";
  const angles = strategy.aiStrategy?.messageAngles?.map((a) => `${a.title}: ${a.description}`).join(" | ") ?? "sin definir";

  const system = `Eres el subagente especializado en Meta Ads de AVENTHRA: revisas UNA campaña antes de que el dueño del negocio la active — ya está creada en Meta, en pausa, no gastando nada todavía. Tu trabajo es dar la segunda opinión honesta que le daría un media buyer profesional antes de dejarlo apretar el botón. No eres condescendiente: si algo está flojo, lo dices directo; si está bien, lo dices también, sin inventar problemas para parecer útil.

Revisa estas tres cosas, en este orden de importancia:

1. RIESGO DE RECHAZO DE META — la causa de rechazo más común y menos conocida es que el anuncio dé a entender que conoce características personales de quien lo lee (ej. "¿tienes deudas?", "¿te sientes solo?") en vez de describir el producto y a quién sirve (ej. "herramientas para quien quiere ordenar sus números"). También rechazan: promesas de resultado garantizado o exageradas ("10x tus ventas", "resultados en 7 días"), lenguaje sensacionalista en salud/dinero/peso, y escasez que no se puede verificar como real. Revisa el copy contra esto.

2. COHERENCIA — ¿el copy, la imagen y el ángulo elegido cuentan la misma historia sobre EL MISMO producto? ¿El mensaje es sobre el producto a impulsar o se diluyó combinándolo con el negocio en general? Un anuncio manda un solo mensaje — si hay dos ideas peleando, dilo.

3. PRESUPUESTO Y OBJETIVO — sin saber el valor real de un cliente nuevo (el wizard de este negocio no lo preguntó), da una opinión cualitativa: ¿el monto declarado alcanza para que el algoritmo de Meta aprenda algo con este objetivo y este tipo de negocio, o es tan bajo que no va a salir de la fase de aprendizaje?

Responde SOLO con un objeto JSON válido (sin markdown, sin texto antes o después) con exactamente esta forma:
{
  "riskLevel": "ok" | "atencion" | "alto",
  "findings": [ { "title": "máximo 6 palabras", "detail": "1-2 frases, concreto, cita la parte del copy o dato que lo motiva" } ],
  "opinion": "2-4 frases en primera persona, directas, diciendo si lanzarías esto tal cual o qué cambiarías primero"
}
"findings" solo con problemas REALES que encontraste — 0 a 5 items, nunca inventes uno para llenar la lista. "riskLevel" es "alto" solo si hay riesgo concreto de rechazo de Meta o un problema serio de coherencia; "atencion" para detalles menores; "ok" si de verdad no hay nada que objetar.`;

  const userPrompt = `NEGOCIO (contexto, no el tema del anuncio):
${businessContext}

ESTRATEGIA "${strategy.name}"
- Objetivo: ${strategy.objective ?? "sin definir"}
- Posicionamiento: ${strategy.aiStrategy?.positioning ?? "sin definir"}
- Ángulos de mensaje disponibles: ${angles}
- Presupuesto: ${budgetText}
- Canal: ${strategy.channel ?? "Meta (Facebook/Instagram)"}, lleva a conversación por Messenger

LA PIEZA APROBADA QUE SE VA A PUBLICAR:
- Titular: ${piece.headline ?? "(sin titular)"}
- Cuerpo: ${piece.body ?? "(sin cuerpo)"}
- Llamado a la acción: ${piece.cta ?? "sin definir"}

Da tu revisión.`;

  let text: string;
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: userPrompt }],
    });
    text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  } catch (err) {
    console.error("[reviewCampaign] error de Claude:", err);
    return {
      ok: false,
      reason: "ai_error",
      message: err instanceof Error ? err.message : "No se pudo revisar la campaña.",
    };
  }

  let review: CampaignReviewResult;
  try {
    const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    review = JSON.parse(json) as CampaignReviewResult;
    if (!review.opinion || !Array.isArray(review.findings) || !review.riskLevel) {
      throw new Error("forma inesperada");
    }
  } catch {
    console.error("[reviewCampaign] JSON inválido:", text.slice(0, 500));
    return { ok: false, reason: "ai_error", message: "La IA devolvió un formato inesperado." };
  }

  let creditsLeft = balance?.total ?? 0;
  if (price !== null && price > 0) {
    try {
      const nb = await deductCredits(businessId, price, "campaign_review", "strategy", strategy.id);
      if (nb !== null) creditsLeft = nb;
    } catch (err) {
      console.error("[reviewCampaign] no se pudo descontar créditos:", err);
    }
  }

  return { ok: true, review, creditsLeft };
}
