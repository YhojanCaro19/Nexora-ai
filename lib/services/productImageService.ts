// lib/services/productImageService.ts
//
// Sube la foto de un producto de forma segura, reusando el pipeline de
// validación/reconstrucción compartido (ver imageSecurityService.ts).
// El bucket "product-images" no tiene policies propias, solo se escribe
// desde acá, con service role.
import { createAdminClient } from "@/lib/supabase/server";
import { sanitizeImageUpload } from "@/lib/services/imageSecurityService";

export async function uploadProductImage(
  businessId: string,
  productId: string,
  file: File
): Promise<{ error: string | null; url: string | null }> {
  const { error, buffer } = await sanitizeImageUpload(file);
  if (error || !buffer) {
    return { error, url: null };
  }

  const admin = createAdminClient();
  const path = `${businessId}/${productId}.jpg`;

  const { error: uploadError } = await admin.storage
    .from("product-images")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) {
    return { error: "No se pudo subir la imagen, intenta de nuevo", url: null };
  }

  const { data } = admin.storage.from("product-images").getPublicUrl(path);
  // Evita que el navegador/agente muestre una versión vieja en caché tras
  // reemplazar la foto de un producto ya existente.
  return { error: null, url: `${data.publicUrl}?v=${Date.now()}` };
}
