// lib/utils/tokenCrypto.ts
//
// Cifrado simétrico para los tokens de acceso de terceros que guardamos en
// la base (hoy: `channel_connections.access_token` — tokens de Meta para
// responder por WhatsApp/Messenger/Instagram). La base NUNCA ve el token en
// claro: se cifra acá antes de escribir y se descifra solo en código
// server (route handlers, crons, server actions).
//
// AES-256-GCM (autenticado: si el ciphertext se altera, `decrypt` lanza).
// Sin dependencia nueva — módulo `crypto` de Node.
//
// Llave: `CHANNELS_TOKEN_KEY`, 32 bytes en base64 (generar con
// `openssl rand -base64 32`). Debe ser el MISMO valor en cada entorno
// donde se descifre — si cambia, los tokens ya guardados quedan ilegibles
// y cada negocio tiene que reconectar sus canales.
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // recomendado para GCM
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.CHANNELS_TOKEN_KEY;
  if (!raw) {
    throw new Error(
      "CHANNELS_TOKEN_KEY no está definida — no se pueden cifrar/descifrar tokens de canal."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `CHANNELS_TOKEN_KEY debe decodificar a ${KEY_BYTES} bytes (son ${key.length}). Regenerar con: openssl rand -base64 32`
    );
  }
  cachedKey = key;
  return key;
}

/**
 * Cifra un token. Devuelve `iv:authTag:ciphertext`, cada parte en base64.
 * Es lo que se guarda tal cual en la columna `access_token`.
 */
export function encryptToken(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

/**
 * Descifra lo que produjo `encryptToken`. Lanza si el formato es inválido,
 * la llave no corresponde, o el ciphertext fue alterado.
 */
export function decryptToken(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Token cifrado con formato inválido (se esperaba iv:authTag:ciphertext).");
  }
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");

  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}
