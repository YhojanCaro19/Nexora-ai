"use server";

import { getSessionProfile } from "@/lib/auth/get-session";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { generateImage, type ImageQuality, type GenerateImageResult } from "@/lib/services/imageService";

// Generación de imagen de prueba desde el panel de Marketing IA. Todavía
// no se guarda en ningún lado — es para validar el proveedor (Gemini) y el
// cobro en créditos. El módulo de marketing completo (estrategia, copy,
// campañas) es fase aparte.
export async function generateImageAction(
  prompt: string,
  quality: ImageQuality
): Promise<GenerateImageResult> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { ok: false, reason: "provider_error", message: "No autorizado" };
  }

  const limit = checkRateLimit(`generar-imagen:${profile.userId}`, 10, 60 * 1000);
  if (!limit.allowed) {
    return {
      ok: false,
      reason: "provider_error",
      message: `Demasiadas imágenes seguidas. Espera ${limit.retryAfterSeconds}s.`,
    };
  }

  return generateImage(profile.businessId, prompt, quality);
}
