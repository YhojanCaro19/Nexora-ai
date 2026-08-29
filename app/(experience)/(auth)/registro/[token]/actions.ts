"use server";

import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { getClientIp } from "@/lib/utils/request";
import { isValidPhone } from "@/lib/utils/phone";
import { completeRegistration } from "@/lib/services/registrationService";

export type RegistrationState = { error: string } | null;

// El token viene en la ruta (/registro/[token]); se pasa como campo oculto
// del form para no re-parsear la URL acá.
export async function submitRegistration(
  _prev: RegistrationState,
  formData: FormData
): Promise<RegistrationState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "Enlace inválido" };

  const ip = await getClientIp();
  const limit = checkRateLimit(`registro:${ip}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return { error: "Demasiados intentos. Espera unos minutos." };
  }

  const phone = String(formData.get("phone") ?? "").trim();
  if (phone && !isValidPhone(phone)) {
    return { error: "El teléfono no es válido, revisa el número" };
  }

  const result = await completeRegistration(token, {
    businessName: String(formData.get("business_name") ?? ""),
    industryType: String(formData.get("industry_type") ?? ""),
    phone,
    countryIso2: String(formData.get("phone_country") ?? "") || undefined,
    fullName: String(formData.get("full_name") ?? ""),
  });

  if (result.error) {
    return { error: result.error };
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "Tu cuenta está lista. Entra con “Continuar con Google” usando el mismo correo."
    )}`
  );
}
