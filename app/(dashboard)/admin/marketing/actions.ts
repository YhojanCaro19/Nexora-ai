"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { generateMarketingImage, type ImageQuality } from "@/lib/services/marketingImageService";

// Generar imágenes cuesta dinero real de la cuenta de OpenAI del proyecto
// — el límite acá no es solo anti-abuso de UI, es control de gasto.
export async function generateMarketingImageAction(prompt: string, quality: ImageQuality) {
  const profile = await getSessionProfile();
  if (!profile || !profile.businessId || profile.role !== "admin") {
    return { error: "No autorizado", image: null };
  }

  const limit = checkRateLimit(`marketing-image:${profile.businessId}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return {
      error: `Llegaste al límite de generación por hora. Espera ${Math.ceil(limit.retryAfterSeconds / 60)} min.`,
      image: null,
    };
  }

  const result = await generateMarketingImage(profile.businessId, prompt, quality);
  revalidatePath("/admin/marketing");
  return result;
}
