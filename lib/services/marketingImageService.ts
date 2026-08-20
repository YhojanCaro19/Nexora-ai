// lib/services/marketingImageService.ts
//
// Generación de imágenes publicitarias con IA (Marketing → Generar
// imagen). Claude/Anthropic no genera imágenes — se usa la API de
// imágenes de OpenAI vía `fetch` directo, sin instalar su SDK completo
// (una llamada HTTP no justifica una dependencia nueva). Investigado y
// aprobado explícitamente antes de construir (ver conversación) — el
// modelo `gpt-image-1` original de OpenAI se retira el 23 de octubre de
// 2026; si esa fecha ya pasó, revisar platform.openai.com/docs/models
// por el modelo de imágenes vigente y actualizar IMAGE_MODEL.
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";

const IMAGE_MODEL = "gpt-image-1";
const BUCKET = "marketing-images";

export type ImageQuality = "low" | "medium" | "high";

export interface MarketingImage {
  id: string;
  prompt: string;
  imageUrl: string;
  quality: ImageQuality;
  createdAt: string;
}

function getApiKey(): string | null {
  return process.env.OPENAI_API_KEY ?? null;
}

// Nunca deja al negocio generar sin límite — la ausencia de un rate limit
// acá sería directamente una forma de gastar dinero real de la cuenta de
// OpenAI del proyecto sin control, no solo un problema de UX.
export async function generateMarketingImage(
  businessId: string,
  prompt: string,
  quality: ImageQuality = "low"
): Promise<{ error: string | null; image: MarketingImage | null }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { error: "La generación de imágenes no está configurada todavía (falta OPENAI_API_KEY).", image: null };
  }

  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length < 5 || trimmedPrompt.length > 800) {
    return { error: "Describe la imagen con al menos 5 caracteres (máximo 800).", image: null };
  }

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: trimmedPrompt,
        size: "1024x1024",
        quality,
        n: 1,
      }),
    });
  } catch (err) {
    console.error("[generateMarketingImage] error de red:", err);
    return { error: "No se pudo conectar con el servicio de generación de imágenes.", image: null };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[generateMarketingImage] error de OpenAI:", response.status, body);
    return { error: "No se pudo generar la imagen, intenta con otra descripción.", image: null };
  }

  const json = (await response.json()) as { data?: { b64_json?: string }[] };
  const base64 = json.data?.[0]?.b64_json;
  if (!base64) {
    console.error("[generateMarketingImage] respuesta sin imagen:", json);
    return { error: "El servicio no devolvió ninguna imagen, intenta de nuevo.", image: null };
  }

  const buffer = Buffer.from(base64, "base64");
  const admin = createAdminClient();
  const path = `${businessId}/${Date.now()}.png`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: "image/png", upsert: false });
  if (uploadError) {
    console.error("[generateMarketingImage] error de storage:", uploadError);
    return { error: "La imagen se generó pero no se pudo guardar, intenta de nuevo.", image: null };
  }

  const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(path);
  const imageUrl = publicUrlData.publicUrl;

  const { data: row, error: dbError } = await admin
    .from("marketing_images")
    .insert({ business_id: businessId, prompt: trimmedPrompt, image_url: imageUrl, quality })
    .select("id, prompt, image_url, quality, created_at")
    .single();

  if (dbError || !row) {
    console.error("[generateMarketingImage] error guardando registro:", dbError);
    return { error: translateError(dbError), image: null };
  }

  return {
    error: null,
    image: { id: row.id, prompt: row.prompt, imageUrl: row.image_url, quality: row.quality, createdAt: row.created_at },
  };
}

export async function getMarketingImages(businessId: string): Promise<MarketingImage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_images")
    .select("id, prompt, image_url, quality, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getMarketingImages] error:", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    prompt: row.prompt,
    imageUrl: row.image_url,
    quality: row.quality,
    createdAt: row.created_at,
  }));
}
