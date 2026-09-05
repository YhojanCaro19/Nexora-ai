// lib/services/imageService.ts
//
// Generación de imágenes para el marketing con IA. Proveedor abstraído
// (env `IMAGE_PROVIDER`): 'gemini' (default) | 'openai'. Raw fetch, sin
// dependencia nueva.
//
// Cobra en créditos DESPUÉS de generar bien (image_standard / image_hd).
// A diferencia del agente, acá SÍ se bloquea si no alcanza el saldo — la
// generación es una acción explícita del usuario y cara, tiene sentido
// avisarle antes en vez de regalarle imágenes.
//
// Devuelve los bytes de la imagen (base64). Guardarla / mostrarla es
// responsabilidad del módulo de marketing, no de este servicio.
import { getCreditPrice, getCreditBalance, deductCredits } from "@/lib/services/creditService";

export type ImageQuality = "standard" | "hd";
type Provider = "gemini" | "openai";

export interface GeneratedImage {
  /** base64 sin el prefijo `data:`. */
  base64: string;
  mimeType: string;
  provider: Provider;
  model: string;
}

export type GenerateImageResult =
  | { ok: true; image: GeneratedImage; creditsLeft: number }
  | { ok: false; reason: "insufficient_credits"; needed: number; have: number }
  | { ok: false; reason: "provider_error" | "not_configured"; message: string };

export interface ReferenceImage {
  /** base64 sin el prefijo `data:`. */
  base64: string;
  mimeType: string;
}

export async function generateImage(
  businessId: string,
  prompt: string,
  quality: ImageQuality = "standard",
  reference?: ReferenceImage | null
): Promise<GenerateImageResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { ok: false, reason: "provider_error", message: "El prompt está vacío." };
  }

  const actionKey = quality === "hd" ? "image_hd" : "image_standard";

  const [price, balance] = await Promise.all([
    getCreditPrice(actionKey),
    getCreditBalance(businessId),
  ]);

  // price === null → el módulo de créditos no está aplicado: no cobramos.
  if (price !== null && price > 0) {
    const have = balance?.total ?? 0;
    if (have < price) {
      return { ok: false, reason: "insufficient_credits", needed: price, have };
    }
  }

  const provider: Provider = process.env.IMAGE_PROVIDER === "openai" ? "openai" : "gemini";

  let image: GeneratedImage;
  try {
    image =
      provider === "openai"
        ? await generateWithOpenAI(trimmed, quality) // la foto de referencia no aplica acá — ver comentario en generateWithGemini
        : await generateWithGemini(trimmed, reference ?? undefined);
  } catch (err) {
    console.error("[generateImage] error del proveedor:", err);
    const message = err instanceof Error ? err.message : "No se pudo generar la imagen.";
    return {
      ok: false,
      reason: /no configurada/i.test(message) ? "not_configured" : "provider_error",
      message,
    };
  }

  let creditsLeft = balance?.total ?? 0;
  if (price !== null && price > 0) {
    try {
      const newBalance = await deductCredits(businessId, price, actionKey, "image");
      if (newBalance !== null) creditsLeft = newBalance;
    } catch (err) {
      // La imagen ya está generada — no se pierde por un fallo de cobro.
      console.error("[generateImage] no se pudo descontar créditos:", err);
    }
  }

  return { ok: true, image, creditsLeft };
}

// ── Gemini 2.5 Flash Image ("Nano Banana") ───────────────────────────────
// Un solo nivel (~1024px). 'hd' hoy usa el mismo modelo — cuando haya un
// proveedor HD real (Imagen 4 Ultra) se ramifica acá.
//
// `reference`: foto real del producto que subió el dueño. Nano Banana
// soporta "edición"/composición a partir de una imagen de entrada — se la
// mandamos como primera parte junto con el texto, pidiéndole que respete
// la apariencia real del producto en vez de inventarla. Solo Gemini: la
// API de OpenAI para esto (`/v1/images/edits`) es un endpoint distinto
// (multipart, no JSON) que no se integró todavía — si el proveedor activo
// es OpenAI, la referencia simplemente se ignora (fallback a texto solo).
async function generateWithGemini(prompt: string, reference?: ReferenceImage): Promise<GeneratedImage> {
  const key = process.env.GOOGLE_GENAI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENAI_API_KEY no configurada");

  const model = "gemini-2.5-flash-image";
  const fullPrompt = reference
    ? `${prompt} Usa el producto de la imagen adjunta tal cual se ve —su forma, color y empaque reales—, no inventes uno distinto; solo cambia el entorno/composición según la descripción.`
    : prompt;
  const requestParts: Record<string, unknown>[] = reference
    ? [{ inlineData: { mimeType: reference.mimeType, data: reference.base64 } }, { text: fullPrompt }]
    : [{ text: fullPrompt }];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: requestParts }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const json: unknown = await res.json();
  const parts =
    (json as { candidates?: { content?: { parts?: unknown[] } }[] })?.candidates?.[0]?.content
      ?.parts ?? [];

  for (const part of parts) {
    const inline =
      (part as { inlineData?: { data?: string; mimeType?: string } }).inlineData ??
      (part as { inline_data?: { data?: string; mime_type?: string } }).inline_data;
    const data = (inline as { data?: string })?.data;
    if (data) {
      const mime =
        (inline as { mimeType?: string; mime_type?: string }).mimeType ??
        (inline as { mime_type?: string }).mime_type ??
        "image/png";
      return { base64: data, mimeType: mime, provider: "gemini", model };
    }
  }

  throw new Error(`Gemini no devolvió imagen: ${JSON.stringify(json).slice(0, 300)}`);
}

// ── OpenAI (fallback) ────────────────────────────────────────────────────
async function generateWithOpenAI(prompt: string, quality: ImageQuality): Promise<GeneratedImage> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY no configurada");

  const model = quality === "hd" ? "gpt-image-1" : "gpt-image-1-mini";
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1024",
      ...(quality === "hd" ? { quality: "high" } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const json: unknown = await res.json();
  const b64 = (json as { data?: { b64_json?: string }[] })?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI no devolvió imagen.");
  return { base64: b64, mimeType: "image/png", provider: "openai", model };
}
