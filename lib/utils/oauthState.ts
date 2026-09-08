// lib/utils/oauthState.ts
//
// Firma y verificación del parámetro `state` de OAuth (protección CSRF),
// compartida por todos los proveedores que conectamos: Meta (canales +
// Meta Ads, ver metaOAuthService) y Google Ads (googleAdsOAuthService).
//
// El `state` viaja por el navegador del admin y vuelve en el callback, así
// que no puede confiarse en él sin firma: se serializa el payload en
// base64url y se le adjunta un HMAC-SHA256. Además lleva `iat` para que un
// enlace viejo no sirva (TTL de 10 min entre "Conectar" y el callback).
//
// Solo código server — necesita el secreto de firma.
import { createHmac, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

/** Campos que todo `state` nuestro lleva, además de los propios del proveedor. */
export interface OAuthStateBase {
  businessId: string;
  userId: string;
  /** A dónde volver en el panel después del callback. */
  returnPath: string;
  iat: number;
}

/**
 * Secreto de firma. `OAUTH_STATE_SECRET` es el nombre nuevo (sirve para
 * cualquier proveedor); `META_OAUTH_STATE_SECRET` se acepta como fallback
 * porque es el que ya está configurado en los entornos existentes.
 */
export function oauthStateSecret(): string {
  const v = process.env.OAUTH_STATE_SECRET || process.env.META_OAUTH_STATE_SECRET;
  if (!v) throw new Error("OAUTH_STATE_SECRET (o META_OAUTH_STATE_SECRET) no está definida.");
  return v;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Firma `payload` + `iat`. Devuelve `body.firma`, ambos en base64url. */
export function signOAuthState<T extends object>(payload: T, secret: string): string {
  const full = { ...payload, iat: Date.now() };
  const body = b64url(Buffer.from(JSON.stringify(full), "utf8"));
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

/**
 * Verifica firma y TTL. Devuelve el payload o `null` si el `state` fue
 * alterado, tiene otro formato, o ya venció.
 */
export function verifyOAuthState<T>(state: string, secret: string): (T & { iat: number }) | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", secret).update(body).digest();
  const got = fromB64url(sig);
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;

  let payload: T & { iat: number };
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8")) as T & { iat: number };
  } catch {
    return null;
  }
  if (typeof payload.iat !== "number" || Date.now() - payload.iat > STATE_TTL_MS) return null;
  return payload;
}
