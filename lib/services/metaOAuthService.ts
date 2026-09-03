// lib/services/metaOAuthService.ts
//
// Inicio del flujo de OAuth con Meta (Facebook Login clásico) y firma del
// parámetro `state` (CSRF). El canje del `code` y el guardado de la
// conexión pasan en `app/api/auth/meta/callback/route.ts`.
//
// Se usa Facebook Login clásico (no "for Business"): para nuestro caso
// —un negocio conecta su Página para que el agente responda— hace lo
// mismo sin Config ID ni "acceso avanzado a public_profile". Si algún día
// hace falta el flujo multi-negocio de Tech Provider, se migra.
//
// Solo código server. Ver docs/channels-module-plan.md §4.5.
import { createHmac, timingSafeEqual } from "crypto";

/** Qué está conectando el negocio: canales del agente o su cuenta de ads. */
export type MetaConnectionKind = "channels" | "marketing";

const SCOPES: Record<MetaConnectionKind, string[]> = {
  channels: [
    "pages_show_list",
    "pages_messaging",
    "pages_manage_metadata",
    "instagram_basic",
    "instagram_manage_messages",
    "business_management",
  ],
  marketing: ["ads_management", "business_management", "pages_show_list"],
};

const STATE_TTL_MS = 10 * 60 * 1000; // 10 min entre "Conectar" y el callback

function graphVersion(): string {
  return process.env.META_GRAPH_VERSION || "v21.0";
}

function appId(): string {
  const v = process.env.META_APP_ID;
  if (!v) throw new Error("META_APP_ID no está definida.");
  return v;
}

function stateSecret(): string {
  const v = process.env.META_OAUTH_STATE_SECRET;
  if (!v) throw new Error("META_OAUTH_STATE_SECRET no está definida.");
  return v;
}

/** URI a la que Meta devuelve el `code`. Debe estar registrada en la app
 *  (la de producción); `localhost` se permite solo en modo desarrollo. */
export function callbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/auth/meta/callback`;
}

// ── state firmado ────────────────────────────────────────────────────────

export interface OAuthStatePayload {
  businessId: string;
  userId: string;
  kind: MetaConnectionKind;
  /** A dónde volver en el panel después del callback. */
  returnPath: string;
  iat: number;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signState(payload: Omit<OAuthStatePayload, "iat">): string {
  const full: OAuthStatePayload = { ...payload, iat: Date.now() };
  const body = b64url(Buffer.from(JSON.stringify(full), "utf8"));
  const sig = b64url(createHmac("sha256", stateSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyState(state: string): OAuthStatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", stateSecret()).update(body).digest();
  const got = fromB64url(sig);
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8")) as OAuthStatePayload;
  } catch {
    return null;
  }
  if (typeof payload.iat !== "number" || Date.now() - payload.iat > STATE_TTL_MS) return null;
  return payload;
}

// ── URL de autorización ──────────────────────────────────────────────────

/**
 * URL del diálogo de OAuth de Facebook. El navegador del admin se manda
 * acá al pulsar "Conectar".
 */
export function buildAuthorizeUrl(state: string, kind: MetaConnectionKind): string {
  const url = new URL(`https://www.facebook.com/${graphVersion()}/dialog/oauth`);
  url.searchParams.set("client_id", appId());
  url.searchParams.set("redirect_uri", callbackUrl());
  url.searchParams.set("state", state);
  url.searchParams.set("scope", SCOPES[kind].join(","));
  url.searchParams.set("response_type", "code");
  return url.toString();
}
