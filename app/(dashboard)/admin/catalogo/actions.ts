"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createProduct, updateProduct, toggleProductActive } from "@/lib/services/productService";
import type { ProductInput } from "@/lib/validators/productSchema";

async function requireAdminBusinessId() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return null;
  }
  return profile.businessId;
}

export async function createProductAction(input: ProductInput) {
  const businessId = await requireAdminBusinessId();
  if (!businessId) {
    return { error: "No autorizado", data: null };
  }

  const result = await createProduct(businessId, input);
  revalidatePath("/admin/catalogo");
  return result;
}

export async function updateProductAction(productId: string, input: ProductInput) {
  const businessId = await requireAdminBusinessId();
  if (!businessId) {
    return { error: "No autorizado" };
  }

  const result = await updateProduct(productId, businessId, input);
  revalidatePath("/admin/catalogo");
  return result;
}

export async function toggleProductActiveAction(productId: string, active: boolean) {
  const businessId = await requireAdminBusinessId();
  if (!businessId) {
    return { error: "No autorizado" };
  }

  const result = await toggleProductActive(productId, businessId, active);
  revalidatePath("/admin/catalogo");
  return result;
}
