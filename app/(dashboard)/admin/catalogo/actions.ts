"use server";

import { revalidatePath } from "next/cache";
import { requireModuleAccess } from "@/lib/auth/require-module-access";
import { createProduct, updateProduct, toggleProductActive } from "@/lib/services/productService";
import type { ProductInput } from "@/lib/validators/productSchema";

// Estas actions las usan tanto la página de admin como la de colaborador
// (app/(dashboard)/colaborador/catalogo/page.tsx importa este mismo
// archivo) — por eso el guard acepta admin O colaborador-con-permiso.
function revalidateCatalogo() {
  revalidatePath("/admin/catalogo");
  revalidatePath("/colaborador/catalogo");
}

export async function createProductAction(input: ProductInput, imageFile?: File | null) {
  const businessId = await requireModuleAccess("catalogo");
  if (!businessId) {
    return { error: "No autorizado", data: null };
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
