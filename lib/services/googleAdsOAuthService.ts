// lib/services/googleAdsOAuthService.ts
//
// Inicio del flujo de OAuth con Google para el módulo de Marketing —
// el negocio conecta SU propia cuenta de Google Ads. El canje del `code`
// y el guardado de la conexión pasan en
// `app/api/auth/google-ads/callback/route.ts`.
//
// OJO: esto NO es el mismo Google OAuth del botón "Continuar con Google"
// del login — ese lo administra Supabase y su scope es solo identidad.
// Acá va un client OAuth propio (Google Cloud → Credentials) con el scope
// `adwords`. Ver docs/google-ads-setup-checklist.md.
//
// Solo código server. Ver docs/marketing-module-plan.md §5 Fase 3.
import {
  signOAuthState,
  verifyOAuthState,
  oauthStateSecret,
  type OAuthStateBase,
} from "@/lib/utils/oauthState";

/** Único scope que necesita la Google Ads API. */
const SCOPE = "https://www.googleapis.com/auth/adwords";

export function googleAdsClientId(): string {
  const v = process.env.GOOGLE_ADS_CLIENT_ID;
  if (!v) throw new Error("GOOGLE_ADS_CLIENT_ID no está definida.");
  return v;
}

export function googleAdsClientSecret(): string {
  const v = process.env.GOOGLE_ADS_CLIENT_SECRET;
  if (!v) throw new Error("GOOGLE_ADS_CLIENT_SECRET no está definida.");
  return v;
}

/**
 * ¿Están las credenciales cargadas? La UI lo usa para mostrar "Conectar"
 * en vez de "Próximamente" — sin esto, el botón llevaría a un error.
 */
export function isGoogleAdsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  );
}

/**
 * URI a la que Google devuelve el `code`. Debe estar registrada EXACTA en
 * el client OAuth (Google Cloud → Credentials → Authorized redirect URIs).
 * A diferencia de Instagram, Google sí acepta `http://localhost:3000`.
 */
export function callbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/auth/google-ads/callback`;
}

// ── state firmado ────────────────────────────────────────────────────────

export type GoogleAdsStatePayload = OAuthStateBase;

export function signState(payload: Omit<GoogleAdsStatePayload, "iat">): string {
  return signOAuthState(payload, oauthStateSecret());
}

export function verifyState(state: string): GoogleAdsStatePayload | null {
  return verifyOAuthState<Omit<GoogleAdsStatePayload, "iat">>(state, oauthStateSecret());
}

// ── URL de autorización ──────────────────────────────────────────────────

/**
 * URL del diálogo de consentimiento de Google. El navegador del admin se
 * manda acá al pulsar "Conectar".
 *
 * - `access_type=offline` + `prompt=consent` son obligatorios: sin ellos
 *   Google NO devuelve `refresh_token`, y el access token de Ads dura solo
 *   1 hora — la conexión quedaría muerta al día siguiente. `prompt=consent`
 *   fuerza el refresh_token incluso si el admin ya había autorizado antes.
 * - Mientras la app esté en modo "Testing" en Google Cloud, solo los
 *   correos de la lista de Test users pueden completar este paso.
 */
export function buildAuthorizeUrl(state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", googleAdsClientId());
  url.searchParams.set("redirect_uri", callbackUrl());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}
