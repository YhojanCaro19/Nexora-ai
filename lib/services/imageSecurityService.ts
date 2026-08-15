// lib/services/imageSecurityService.ts
//
// Pipeline de validación/reconstrucción de imágenes, compartido por
// cualquier lugar del proyecto que reciba una foto subida por el usuario
// (hoy: fotos de producto y logo de negocio). Nunca confía en la
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
//
// Quien llame a esto sigue siendo responsable de subir el buffer ya
// limpio (nunca el original) a Storage.
import sharp from "sharp";

export interface SanitizeImageOptions {
  maxBytes?: number;
  maxDimension?: number;
  quality?: number;
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 85;

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

export async function sanitizeImageUpload(
  file: File,
  options: SanitizeImageOptions = {}
): Promise<{ error: string | null; buffer: Buffer | null }> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;

  if (file.size === 0) {
    return { error: "El archivo está vacío", buffer: null };
  }
  if (file.size > maxBytes) {
    return { error: `La imagen no puede pesar más de ${Math.round(maxBytes / (1024 * 1024))}MB`, buffer: null };
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const realType = detectRealImageType(bytes);
  if (!realType) {
    return { error: "El archivo no es una imagen JPG o WebP válida", buffer: null };
  }

  try {
    const buffer = await sharp(Buffer.from(arrayBuffer))
      .rotate() // respeta la orientación EXIF antes de descartar los metadatos
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
    return { error: null, buffer };
  } catch {
    // sharp no pudo decodificarlo como imagen real, aunque la firma haya
    // calzado — se rechaza, nunca se sube el original.
    return { error: "No se pudo procesar la imagen — el archivo puede estar dañado", buffer: null };
  }
}
