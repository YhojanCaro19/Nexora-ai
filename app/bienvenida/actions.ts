"use server";

import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/get-session";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { isValidPhone } from "@/lib/utils/phone";
import { businessSchema } from "@/lib/validators/businessSchema";
import { completeOnboarding } from "@/lib/services/onboardingService";

export type OnboardingState = { ok: true } | { ok: false; error: string } | null;

// businessName / industryType reutilizan las reglas de businessSchema
// (min 2 / max 100 y el enum de industrias) — mismas que usa el resto del
// panel. fullName y phone son propios de esta pantalla. Los strings se
// recortan ANTES de validar (abajo), no en el schema.
const onboardingSchema = z.object({
  fullName: z.string().min(2, "Tu nombre es muy corto").max(80),
  businessName: businessSchema.shape.name,
  phone: z.string().max(20),
  industryType: businessSchema.shape.industry_type,
  // "¿Qué vende u ofrece tu negocio?" — alimenta agent_configs.business_description.
  businessOffer: z.string().max(600).optional().default(""),
  // "¿Atiende con reservas o citas?" — setea booking_settings.mode.
  bookingMode: z.enum(["off", "tables", "appointments", "both"]).default("off"),
});

export async function completarOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { ok: false, error: "No autorizado" };
  }
  if (profile.onboardingCompleted) {
    return { ok: false, error: "Tu cuenta ya está configurada" };
  }

  const limit = checkRateLimit(`onboarding:${profile.userId}`, 15, 10 * 60 * 1000);
  if (!limit.allowed) {
    return { ok: false, error: "Demasiados intentos. Espera unos minutos." };
  }

  const parsed = onboardingSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    businessName: String(formData.get("businessName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    industryType: String(formData.get("industryType") ?? ""),
    businessOffer: String(formData.get("businessOffer") ?? "").trim(),
    bookingMode: String(formData.get("bookingMode") ?? "off"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  }

  const phone = parsed.data.phone;
  if (phone && !isValidPhone(phone)) {
    return { ok: false, error: "El teléfono no es válido, revisa el número" };
  }

  // País resuelto por PhoneField (input oculto `phone_country`) — lo usa
  // Reportes para la zona horaria del negocio, igual que el flujo de alta
  // anterior. Solo se acepta un ISO2 (2 letras); si no, se ignora y la
  // columna se queda con su default.
  const rawCountry = String(formData.get("phone_country") ?? "").trim().toUpperCase();
  const countryIso2 = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;

  const result = await completeOnboarding({
    businessId: profile.businessId,
    userId: profile.userId,
    fullName: parsed.data.fullName,
    businessName: parsed.data.businessName,
    phone: phone || null,
    countryIso2,
    industryType: parsed.data.industryType,
    businessDescription: parsed.data.businessOffer || null,
    bookingMode: parsed.data.bookingMode,
  });
  if (result.error) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
