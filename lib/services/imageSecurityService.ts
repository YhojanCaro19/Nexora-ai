// lib/services/imageSecurityService.ts
//
// Pipeline de validación/reconstrucción de imágenes, compartido por
// cualquier lugar del proyecto que reciba una foto subida por el usuario
// (hoy: fotos de producto y logo de negocio). Nunca confía en la
// extensión del archivo ni en el Content-Type que reporta el navegador
// (ambos se falsifican trivialmente renombrando cualquier archivo):
//
// 1. Se leen los primeros bytes reales del archivo y se comparan contra la
//    firma binaria conocida de JPEG/PNG — si no calza con ninguna, se
//    rechaza antes de tocar nada más. WebP se quitó a propósito (pedido
//    explícito, solo JPG/JPEG/PNG en todo el proyecto).
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
  /** 'jpeg' (default, comportamiento histórico) o 'png' — usar 'png' cuando
   *  hace falta conservar transparencia (ej. logo para componer sobre otra
   *  imagen). El chequeo de firma real sigue aceptando JPG o PNG de entrada
   *  sin importar el formato de salida elegido. */
  outputFormat?: "jpeg" | "png";
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 85;

// Firmas binarias reales — no la extensión del nombre del archivo.
function detectRealImageType(bytes: Uint8Array): "jpeg" | "png" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  // PNG: 8 bytes fijos de cabecera (89 50 4E 47 0D 0A 1A 0A).
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "png";
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
    return { error: "El archivo no es una imagen JPG o PNG válida", buffer: null };
  }

  try {
    const pipeline = sharp(Buffer.from(arrayBuffer))
      .rotate() // respeta la orientación EXIF antes de descartar los metadatos
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true });
    const buffer =
      options.outputFormat === "png" ? await pipeline.png().toBuffer() : await pipeline.jpeg({ quality }).toBuffer();
    return { error: null, buffer };
  } catch {
    // sharp no pudo decodificarlo como imagen real, aunque la firma haya
    // calzado — se rechaza, nunca se sube el original.
    return { error: "No se pudo procesar la imagen — el archivo puede estar dañado", buffer: null };
  }
}
