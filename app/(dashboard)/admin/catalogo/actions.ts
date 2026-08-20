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

const MAX_BULK_IMPORT_ROWS = 300;

export interface BulkImportRowResult {
  row: number;
  name: string;
  error: string | null;
}

// Reutiliza createProduct() fila por fila (mismo validado + generación de
// embedding que el alta manual) — nunca se salta esa lógica solo porque
// vino de un CSV. Secuencial a propósito, no Promise.all: generar
// embeddings en paralelo sin límite golpearía la API de Voyage con todo
// el archivo a la vez; para el volumen de un negocio pequeño (decenas de
// filas, no miles) la espera es aceptable.
export async function bulkImportProductsAction(
  rows: { name: string; description?: string; price: number; stock?: number | null; category?: string; lowStockThreshold?: number | null }[]
): Promise<{ error: string | null; results: BulkImportRowResult[] }> {
  const businessId = await requireModuleAccess("catalogo");
  if (!businessId) {
    return { error: "No autorizado", results: [] };
  }

  if (rows.length === 0) {
    return { error: "El archivo no tiene filas para importar", results: [] };
  }
  if (rows.length > MAX_BULK_IMPORT_ROWS) {
    return { error: `Máximo ${MAX_BULK_IMPORT_ROWS} productos por archivo — divide el CSV en partes más chicas.`, results: [] };
  }

  const profile = await getSessionProfile();
  const limit = checkRateLimit(`bulk-import:${profile?.userId ?? "anon"}`, 3, 5 * 60 * 1000);
  if (!limit.allowed) {
    return { error: `Demasiadas importaciones seguidas. Espera ${Math.ceil(limit.retryAfterSeconds / 60)} min.`, results: [] };
  }

  const results: BulkImportRowResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const result = await createProduct(businessId, {
      name: row.name,
      description: row.description || undefined,
      price: row.price,
      stock: row.stock ?? null,
      category: row.category || undefined,
      lowStockThreshold: row.lowStockThreshold ?? null,
    });
    results.push({ row: i + 2, name: row.name, error: result.error }); // +2: fila 1 es encabezado
  }

  revalidateCatalogo();
  return { error: null, results };
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
