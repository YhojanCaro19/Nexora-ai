"use server";

import { revalidatePath } from "next/cache";
import { requireModuleAccess } from "@/lib/auth/require-module-access";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createProduct, updateProduct, toggleProductActive } from "@/lib/services/productService";
import type { ProductInput } from "@/lib/validators/productSchema";
import { checkRateLimit } from "@/lib/utils/rateLimit";

// Estas actions las usan tanto la página de admin como la de colaborador
// (app/(dashboard)/colaborador/catalogo/page.tsx importa este mismo
// archivo) — por eso el guard acepta admin O colaborador-con-permiso.
function revalidateCatalogo() {
  revalidatePath("/admin/catalogo");
  revalidatePath("/colaborador/catalogo");
}

// Solo limita cuando de verdad hay una imagen de por medio (decodificar
// con sharp y subir a Storage es lo costoso de repetir en ráfaga) — la
// llamada ya está cacheada por request, no es una consulta extra real.
async function checkUploadRateLimit(): Promise<string | null> {
  const profile = await getSessionProfile();
  const limit = checkRateLimit(`upload-imagen:${profile?.userId ?? "anon"}`, 10, 60 * 1000);
  if (!limit.allowed) {
    return `Demasiadas subidas seguidas. Espera ${limit.retryAfterSeconds}s.`;
  }
  return null;
}

export async function createProductAction(input: ProductInput, imageFile?: File | null) {
  const businessId = await requireModuleAccess("catalogo");
  if (!businessId) {
    return { error: "No autorizado", data: null };
  }

  if (imageFile && imageFile.size > 0) {
    const limitError = await checkUploadRateLimit();
    if (limitError) return { error: limitError, data: null };
  }

  const result = await createProduct(businessId, input, imageFile);
  revalidateCatalogo();
  return result;
}

export async function updateProductAction(productId: string, input: ProductInput, imageFile?: File | null) {
  const businessId = await requireModuleAccess("catalogo");
  if (!businessId) {
    return { error: "No autorizado" };
  }

  if (imageFile && imageFile.size > 0) {
    const limitError = await checkUploadRateLimit();
    if (limitError) return { error: limitError };
  }

  const result = await updateProduct(productId, businessId, input, imageFile);
  revalidateCatalogo();
  return result;
}

export async function toggleProductActiveAction(productId: string, active: boolean) {
  const businessId = await requireModuleAccess("catalogo");
  if (!businessId) {
    return { error: "No autorizado" };
  }

  const result = await toggleProductActive(productId, businessId, active);
  revalidateCatalogo();
  return result;
}
