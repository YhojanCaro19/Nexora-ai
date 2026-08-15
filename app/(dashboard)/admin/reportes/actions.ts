"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import {
  updateBusinessContact,
  uploadBusinessLogo,
} from "@/lib/services/businessBrandingService";
import { businessBrandingSchema } from "@/lib/validators/businessBrandingSchema";
import { checkRateLimit } from "@/lib/utils/rateLimit";

// Personalizar el PDF es exclusivo del admin (como Reportes en general) —
// nunca asignable a un colaborador, por eso no usa requireModuleAccess.
async function requireAdminBusinessId() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return null;
  }
  return profile.businessId;
}

export async function updateBusinessContactAction(input: { contactEmail: string; contactPhone: string }) {
  const businessId = await requireAdminBusinessId();
  if (!businessId) {
    return { error: "No autorizado" };
  }

  const parsed = businessBrandingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await updateBusinessContact(businessId, {
    contactEmail: parsed.data.contactEmail ?? "",
    contactPhone: parsed.data.contactPhone ?? "",
  });
  revalidatePath("/admin/reportes");
  return result;
}

export async function uploadBusinessLogoAction(file: File) {
  const businessId = await requireAdminBusinessId();
  if (!businessId) {
    return { error: "No autorizado", url: null };
  }

  const limit = checkRateLimit(`upload-imagen:${businessId}`, 10, 60 * 1000);
  if (!limit.allowed) {
    return { error: `Demasiadas subidas seguidas. Espera ${limit.retryAfterSeconds}s.`, url: null };
  }

  const result = await uploadBusinessLogo(businessId, file);
  revalidatePath("/admin/reportes");
  return result;
}
