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
import {
  signOAuthState,
  verifyOAuthState,
  oauthStateSecret,
  type OAuthStateBase,
} from "@/lib/utils/oauthState";

/**
 * Qué está conectando el negocio:
 *  - `channels`   → Facebook Login: Página de FB (Messenger) + IG ligada a ella.
 *  - `instagram`  → Instagram Business Login DIRECTO: el negocio conecta su
 *    cuenta de IG con un botón, SIN necesidad de Página de Facebook. Otro
 *    host (instagram.com / graph.instagram.com), otras credenciales
 *    (`INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`). Ver instagramLoginService.
 *  - `marketing`  → Facebook Login: ads (módulo de Marketing).
 */
export type MetaConnectionKind = "channels" | "instagram" | "marketing";

const SCOPES: Record<MetaConnectionKind, string[]> = {
  channels: [
    "pages_show_list",
    "pages_messaging",
    "pages_manage_metadata",
    "instagram_basic",
    "instagram_manage_messages",
    "business_management",
  ],
  // Instagram Business Login usa sus propios scopes (host instagram.com).
  instagram: ["instagram_business_basic", "instagram_business_manage_messages"],
  marketing: ["ads_management", "business_management", "pages_show_list"],
};

function graphVersion(): string {
  return process.env.META_GRAPH_VERSION || "v21.0";
}

function appId(): string {
  const v = process.env.META_APP_ID;
  if (!v) throw new Error("META_APP_ID no está definida.");
  return v;
}

/** URI a la que Meta devuelve el `code`. Debe estar registrada en la app
 *  (la de producción); `localhost` se permite solo en modo desarrollo. */
export function callbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/auth/meta/callback`;
}

/**
 * redirect_uri para Instagram Business Login. Debe coincidir EXACTO entre
 * la URL de autorización y el canje del token, y estar registrado en
 * Meta → Instagram → login empresarial. Instagram NO acepta `http://localhost`,
 * así que en local hay que apuntarlo a la URL del túnel:
 *   INSTAGRAM_REDIRECT_URI=https://xxx.trycloudflare.com/api/auth/meta/callback
 * En prod, si no se define, usa `callbackUrl()` (el dominio real).
 */
export function instagramRedirectUri(): string {
  return process.env.INSTAGRAM_REDIRECT_URI || callbackUrl();
}

// ── state firmado ────────────────────────────────────────────────────────
// La firma en sí (HMAC + TTL) vive en lib/utils/oauthState.ts, compartida
// con Google Ads. Acá solo se fija la forma del payload de Meta.

export interface OAuthStatePayload extends OAuthStateBase {
  kind: MetaConnectionKind;
}

export function signState(payload: Omit<OAuthStatePayload, "iat">): string {
  return signOAuthState(payload, oauthStateSecret());
}

export function verifyState(state: string): OAuthStatePayload | null {
  return verifyOAuthState<Omit<OAuthStatePayload, "iat">>(state, oauthStateSecret());
}

// ── URL de autorización ──────────────────────────────────────────────────

/**
 * URL del diálogo de OAuth de Facebook (kinds `channels` / `marketing`).
 * El navegador del admin se manda acá al pulsar "Conectar".
 */
export function buildAuthorizeUrl(state: string, kind: "channels" | "marketing"): string {
  const url = new URL(`https://www.facebook.com/${graphVersion()}/dialog/oauth`);
  url.searchParams.set("client_id", appId());
  url.searchParams.set("redirect_uri", callbackUrl());
  url.searchParams.set("state", state);
  url.searchParams.set("scope", SCOPES[kind].join(","));
  url.searchParams.set("response_type", "code");
  return url.toString();
}

/**
 * URL del diálogo de Instagram Business Login (kind `instagram`). Otro
 * host, otras credenciales, `redirect_uri` = `instagramRedirectUri()`.
 */
export function buildInstagramAuthorizeUrl(state: string): string {
  const clientId = process.env.INSTAGRAM_APP_ID;
  if (!clientId) throw new Error("INSTAGRAM_APP_ID no está definida.");
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", instagramRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.instagram.join(","));
  url.searchParams.set("state", state);
  return url.toString();
}
