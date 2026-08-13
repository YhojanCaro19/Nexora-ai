// lib/services/productImageService.ts
//
// Sube la foto de un producto de forma segura. El flujo NUNCA confía en la
// extensión del archivo ni en el Content-Type que reporta el navegador
// (ambos se falsifican trivialmente renombrando cualquier archivo):
//
// 1. Se leen los primeros bytes reales del archivo y se comparan contra la
//    firma binaria conocida de JPEG/WebP — si no calza con ninguna, se
//    rechaza antes de tocar nada más.
// 2. Se decodifica con sharp y se vuelve a codificar desde cero como JPEG.
//    Esto es lo que de verdad protege: cualquier archivo con algo pegado
//    al final (una técnica común para esconder contenido dentro de un
//    archivo de imagen válido) se pierde, porque el resultado final solo
//    contiene los píxeles decodificados, nunca los bytes originales. Si el
//    archivo no es una imagen real, sharp falla al decodificarlo y se
//    rechaza ahí mismo.
// 3. Se sube el buffer ya limpio (nunca el original) a Storage, con
//    service role — el bucket "product-images" no tiene policies propias,
//    solo se escribe desde acá.
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB, mismo límite configurado en el bucket
const MAX_DIMENSION = 1600; // suficiente para mostrarla bien, sin subir archivos gigantes

// Firmas binarias reales — no la extensión del nombre del archivo.
function detectRealImageType(bytes: Uint8Array): "jpeg" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export async function uploadProductImage(
  businessId: string,
  productId: string,
  file: File
): Promise<{ error: string | null; url: string | null }> {
  if (file.size === 0) {
    return { error: "El archivo está vacío", url: null };
  }
  if (file.size > MAX_BYTES) {
    return { error: "La imagen no puede pesar más de 5MB", url: null };
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const realType = detectRealImageType(bytes);
  if (!realType) {
    return { error: "El archivo no es una imagen JPG o WebP válida", url: null };
  }

  let cleanBuffer: Buffer;
  try {
    cleanBuffer = await sharp(Buffer.from(arrayBuffer))
      .rotate() // respeta la orientación EXIF antes de descartar los metadatos
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    // sharp no pudo decodificarlo como imagen real, aunque la firma haya
    // calzado — se rechaza, nunca se sube el original.
    return { error: "No se pudo procesar la imagen — el archivo puede estar dañado", url: null };
  }

  const admin = createAdminClient();
  const path = `${businessId}/${productId}.jpg`;

  const { error: uploadError } = await admin.storage
    .from("product-images")
    .upload(path, cleanBuffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) {
    return { error: "No se pudo subir la imagen, intenta de nuevo", url: null };
  }

  const { data } = admin.storage.from("product-images").getPublicUrl(path);
  // Evita que el navegador/agente muestre una versión vieja en caché tras
  // reemplazar la foto de un producto ya existente.
  return { error: null, url: `${data.publicUrl}?v=${Date.now()}` };
}
