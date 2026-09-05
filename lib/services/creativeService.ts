// lib/services/creativeService.ts
//
// Genera PIEZAS (imagen + copy) para una estrategia de marketing — el paso
// 2 del módulo. Genera varias variantes de una vez (mejora inspirada en
// AdCreative.ai: varias opciones + puntaje de la propia IA para elegir
// rápido), y le aplica a la imagen un tratamiento de marca (logo del
// negocio en una insignia + barra de color) vía `sharp` — ya es dependencia
// del proyecto (product photos, imageSecurityService), no se agregó nada
// nuevo.
//
// Por qué no se le pide a la IA que escriba el titular DENTRO de la imagen:
// ningún modelo de imágenes (Gemini, gpt-image) renderiza texto legible de
// forma confiable — sale con letras deformadas o inventadas. El titular y
// el cuerpo del anuncio ya viajan aparte como campos reales del ad creative
// de Meta (los muestra Meta como texto de verdad alrededor de la imagen),
// así que no hace falta arriesgar la calidad visual por eso.
//
// Cobra créditos DESPUÉS de generar bien cada parte: el copy se cobra UNA
// vez por el lote completo (una sola llamada a Claude genera las N
// opciones), la imagen se cobra por cada variante (cada una es una llamada
// real al proveedor). Si no alcanza el saldo para el lote completo, bloquea
// antes de gastar nada.
import Anthropic from "@anthropic-ai/sdk";
import sharp, { type OverlayOptions } from "sharp";
import { createAdminClient } from "@/lib/supabase/server";
import { getCreditPrice, getCreditBalance, deductCredits } from "@/lib/services/creditService";
import { generateImage, type ImageQuality } from "@/lib/services/imageService";
import type { MarketingStrategy } from "@/lib/services/marketingService";

const client = new Anthropic();
const MODEL = "claude-sonnet-5";
const BUCKET = "marketing";
const VARIANTS = 3;

/** CTA válidos para un anuncio de Meta (subconjunto que aplica a un negocio
 *  que atiende por chat — ver object_story_spec.link_data.call_to_action). */
export const AD_CTA_OPTIONS = [
  "MESSAGE_PAGE",
  "WHATSAPP_MESSAGE",
  "LEARN_MORE",
  "SHOP_NOW",
  "CONTACT_US",
] as const;
export type AdCta = (typeof AD_CTA_OPTIONS)[number];

interface CopyOption {
  headline: string;
  body: string;
  cta: AdCta;
  score: number; // 1-10, qué tan bien cree la IA que va a funcionar
  reason: string; // 1 frase corta de por qué
}

export type GeneratePiecesResult =
  | {
      ok: true;
      pieces: { id: string; imagePath: string; headline: string; body: string; cta: string; score: number; reason: string }[];
      creditsLeft: number;
    }
  | { ok: false; reason: "insufficient_credits"; needed: number; have: number }
  | { ok: false; reason: "ai_error" | "provider_error" | "storage_error" | "db_error"; message: string };

async function generateCopyOptions(
  strategy: MarketingStrategy,
  businessContext: string,
  n: number
): Promise<{ ok: true; options: CopyOption[] } | { ok: false; message: string }> {
  const system = `Eres un redactor publicitario para pequeños negocios en Latinoamérica. Escribes copy de anuncio CONCRETO, corto y persuasivo — nunca genérico. Tono directo, en el idioma pedido.

Genera ${n} opciones DISTINTAS entre sí (ángulos o ganchos diferentes, no variaciones mínimas de la misma frase), y califícalas tú mismo con honestidad — no todas tienen que ser un 9, si una es más floja que otra dilo.

Responde SOLO con un array JSON válido (sin markdown) con exactamente esta forma, ${n} elementos:
[{ "headline": "titular corto, máx 40 caracteres", "body": "texto principal del anuncio, máx 220 caracteres", "cta": "uno de: ${AD_CTA_OPTIONS.join(" | ")}", "score": 8, "reason": "1 frase de por qué crees que funciona o no tan bien" }]

Reglas: el "cta" debe ser EXACTAMENTE uno de los valores listados. "score" es un entero de 1 a 10. Si el negocio atiende por chat/WhatsApp/Messenger, prefiere MESSAGE_PAGE o WHATSAPP_MESSAGE.`;

  const userPrompt = `QUIÉN LO VENDE (contexto, no el tema):
${businessContext}

PRODUCTO/SERVICIO A IMPULSAR:
${strategy.goal ?? "(ver posicionamiento)"}

ESTRATEGIA:
- Objetivo: ${strategy.objective ?? "sin definir"}
- Posicionamiento: ${strategy.aiStrategy?.positioning ?? "sin definir"}
- Idioma: ${strategy.language}

Genera las ${n} opciones de copy.`;

  let text: string;
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 900,
      system,
      messages: [{ role: "user", content: userPrompt }],
    });
    text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  } catch (err) {
    console.error("[generateCopyOptions] error de Claude:", err);
    return { ok: false, message: err instanceof Error ? err.message : "No se pudo generar el copy." };
  }

  try {
    const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    const options = JSON.parse(json) as CopyOption[];
    if (!Array.isArray(options) || options.length === 0) throw new Error("forma inesperada");
    for (const o of options) {
      if (!o.headline || !o.body || !AD_CTA_OPTIONS.includes(o.cta)) throw new Error("opción inválida");
    }
    return { ok: true, options };
  } catch {
    console.error("[generateCopyOptions] JSON inválido:", text.slice(0, 400));
    return { ok: false, message: "La IA devolvió un formato inesperado. Intenta de nuevo." };
  }
}

function buildImagePrompt(
  strategy: MarketingStrategy,
  businessContext: string,
  brandColor: string | null,
  styleDescription: string | null
): string {
  const angle = strategy.aiStrategy?.messageAngles?.[0];
  return [
    `Fotografía publicitaria profesional, calidad de campaña de agencia, para: ${businessContext.split("\n")[0]}.`,
    strategy.goal ? `Producto/servicio protagonista: ${strategy.goal}.` : "",
    angle ? `Ángulo de mensaje: ${angle.title} — ${angle.description}.` : "",
    brandColor ? `Paleta de color dominante de la escena (luz, fondo o accesorios) cercana a ${brandColor}.` : "",
    styleDescription ? `Cómo se imagina el dueño la imagen: ${styleDescription}.` : "",
    "Iluminación de estudio o luz natural cuidada, composición limpia, espacio negativo para no saturar, estilo apto para feed de Instagram/Facebook. Sin texto, sin letras, sin logotipos en la imagen — eso se agrega aparte.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Rutas fijas (mismo bucket `marketing`, público) para los activos que el
 *  dueño sube al crear la estrategia — logo y foto real del producto. Se
 *  intenta traerlos siempre; si no existen, `fetchAsBuffer` devuelve null
 *  y simplemente se omiten (no hace falta guardar un booleano aparte). */
function strategyLogoUrl(businessId: string, strategyId: string): string {
  return piecePublicUrl(`${businessId}/${strategyId}/logo.png`);
}
function strategyReferenceUrl(businessId: string, strategyId: string): string {
  return piecePublicUrl(`${businessId}/${strategyId}/reference.png`);
}

// ── Tratamiento de marca sobre la imagen (sharp, sin dependencias nuevas) ──

async function fetchAsBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Insignia blanca redondeada con el logo del negocio (esquina inferior
 *  derecha) + barra delgada del color de marca (si se dio uno). Se aplica
 *  siempre sobre insignia blanca, sin importar si el logo tiene fondo
 *  propio — así se ve limpio contra cualquier foto, es el mismo recurso
 *  que usan las plantillas de anuncios reales. */
async function applyBrandTreatment(
  baseBuffer: Buffer,
  opts: { logoBuffer?: Buffer | null; brandColor?: string | null }
): Promise<Buffer> {
  const img = sharp(baseBuffer);
  const meta = await img.metadata();
  const W = meta.width ?? 1024;
  const H = meta.height ?? 1024;
  const composites: OverlayOptions[] = [];

  if (opts.brandColor) {
    const barH = Math.round(H * 0.025);
    const bar = await sharp({
      create: { width: W, height: barH, channels: 4, background: opts.brandColor },
    })
      .png()
      .toBuffer();
    composites.push({ input: bar, top: H - barH, left: 0 });
  }

  if (opts.logoBuffer) {
    const maxLogo = Math.round(W * 0.16);
    const pad = Math.round(maxLogo * 0.22);
    try {
      const logoResized = await sharp(opts.logoBuffer)
        .resize({ width: maxLogo, height: maxLogo, fit: "inside" })
        .toBuffer();
      const logoMeta = await sharp(logoResized).metadata();
      const lw = logoMeta.width ?? maxLogo;
      const lh = logoMeta.height ?? maxLogo;
      const badgeW = lw + pad * 2;
      const badgeH = lh + pad * 2;
      const badge = await sharp({
        create: { width: badgeW, height: badgeH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .composite([
          {
            input: Buffer.from(
              `<svg width="${badgeW}" height="${badgeH}"><rect width="${badgeW}" height="${badgeH}" rx="${Math.round(badgeH * 0.18)}" fill="white" fill-opacity="0.92"/></svg>`
            ),
            top: 0,
            left: 0,
          },
        ])
        .png()
        .toBuffer();
      const margin = Math.round(W * 0.035);
      const badgeTop = H - badgeH - margin;
      const badgeLeft = W - badgeW - margin;
      composites.push({ input: badge, top: badgeTop, left: badgeLeft });
      composites.push({ input: logoResized, top: badgeTop + pad, left: badgeLeft + pad });
    } catch (err) {
      console.warn("[applyBrandTreatment] no se pudo componer el logo, se omite:", err);
    }
  }

  if (composites.length === 0) return baseBuffer;
  return img.composite(composites).png().toBuffer();
}

export async function generatePieceVariants(
  businessId: string,
  strategy: MarketingStrategy,
  businessContext: string,
  quality: ImageQuality = "standard"
): Promise<GeneratePiecesResult> {
  // Color y descripción de estilo vienen de lo que el dueño respondió en el
  // wizard "Nueva estrategia" — se guardan tal cual en wizard_answers.
  const answers = (strategy.wizardAnswers ?? {}) as { brandColor?: string | null; styleDescription?: string | null };
  const brandColor = answers.brandColor ?? null;
  const styleDescription = answers.styleDescription ?? null;

  // Logo y foto de referencia del producto: rutas fijas, subidas (si el
  // dueño quiso) al crear la estrategia. Si no existen, fetchAsBuffer
  // devuelve null y se generan las piezas igual, sin esos extras.
  const [logoBuffer, referenceBuffer] = await Promise.all([
    fetchAsBuffer(strategyLogoUrl(businessId, strategy.id)),
    fetchAsBuffer(strategyReferenceUrl(businessId, strategy.id)),
  ]);
  const reference = referenceBuffer ? { base64: referenceBuffer.toString("base64"), mimeType: "image/png" } : undefined;

  // Chequeo de saldo combinado ANTES de gastar nada: 1 copy (el lote
  // completo) + N imágenes.
  const [copyPrice, imagePrice, balance] = await Promise.all([
    getCreditPrice("copy"),
    getCreditPrice(quality === "hd" ? "image_hd" : "image_standard"),
    getCreditBalance(businessId),
  ]);
  const totalPrice = (copyPrice ?? 0) + (imagePrice ?? 0) * VARIANTS;
  if (totalPrice > 0) {
    const have = balance?.total ?? 0;
    if (have < totalPrice) {
      return { ok: false, reason: "insufficient_credits", needed: totalPrice, have };
    }
  }

  const copyResult = await generateCopyOptions(strategy, businessContext, VARIANTS);
  if (!copyResult.ok) {
    return { ok: false, reason: "ai_error", message: copyResult.message };
  }

  let creditsLeft = balance?.total ?? 0;
  if (copyPrice !== null && copyPrice > 0) {
    try {
      const nb = await deductCredits(businessId, copyPrice, "copy", "copy");
      if (nb !== null) creditsLeft = nb;
    } catch (err) {
      console.error("[generatePieceVariants] no se pudo descontar créditos de copy:", err);
    }
  }

  const admin = createAdminClient();
  const imagePrompt = buildImagePrompt(strategy, businessContext, brandColor, styleDescription);
  const results: { id: string; imagePath: string; headline: string; body: string; cta: string; score: number; reason: string }[] = [];

  for (const option of copyResult.options) {
    const imageResult = await generateImage(businessId, imagePrompt, quality, reference);
    if (!imageResult.ok) {
      // Una variante falló (ej. saldo se agotó a mitad de camino, o el
      // proveedor falló puntualmente) — se guardan las que sí salieron en
      // vez de perder todo el lote.
      console.warn("[generatePieceVariants] una variante falló:", imageResult);
      continue;
    }
    creditsLeft = imageResult.creditsLeft;

    let finalBuffer: Buffer<ArrayBufferLike> = Buffer.from(imageResult.image.base64, "base64");
    try {
      finalBuffer = await applyBrandTreatment(finalBuffer, { brandColor, logoBuffer });
    } catch (err) {
      console.warn("[generatePieceVariants] no se pudo aplicar el tratamiento de marca, se usa la imagen original:", err);
    }

    const path = `${businessId}/${strategy.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`;
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, finalBuffer, { contentType: "image/png", upsert: false });
    if (uploadError) {
      console.error("[generatePieceVariants] error de storage:", uploadError);
      continue;
    }

    const { data: row, error: dbError } = await admin
      .from("marketing_pieces")
      .insert({
        strategy_id: strategy.id,
        business_id: businessId,
        kind: "ad",
        image_path: path,
        headline: option.headline,
        body: option.body,
        cta: option.cta,
        status: "pending",
        is_ai_generated: true,
        ai_score: option.score,
        ai_score_reason: option.reason,
      })
      .select("id, image_path, headline, body, cta, ai_score, ai_score_reason")
      .single();

    if (dbError || !row) {
      console.error("[generatePieceVariants] error guardando pieza:", dbError);
      continue;
    }

    results.push({
      id: row.id,
      imagePath: row.image_path,
      headline: row.headline,
      body: row.body,
      cta: row.cta,
      score: row.ai_score,
      reason: row.ai_score_reason,
    });
  }

  if (results.length === 0) {
    return { ok: false, reason: "provider_error", message: "No se pudo generar ninguna imagen. Intenta de nuevo." };
  }

  return { ok: true, pieces: results, creditsLeft };
}

/** URL pública de una pieza (bucket `marketing` es público). */
export function piecePublicUrl(imagePath: string): string {
  const admin = createAdminClient();
  return admin.storage.from(BUCKET).getPublicUrl(imagePath).data.publicUrl;
}
