// lib/services/googleAdsClient.ts
//
// Wrapper fino sobre OAuth de Google + la Google Ads API (REST). Cubre el
// canje del `code`, el refresco del access token (dura 1 h) y el listado de
// las cuentas de Ads a las que el admin tiene acceso. La publicación de
// campañas llega en una fase siguiente.
//
// Mismo espíritu que metaGraphClient.ts: sin SDK nuevo, solo `fetch`.
// La librería oficial `google-ads-api` traería una dependencia grande para
// lo poco que necesitamos hoy — si más adelante hace falta el reporting
// completo, se reevalúa.
//
// Solo código server: necesita GOOGLE_ADS_CLIENT_SECRET y el developer token.

import { googleAdsClientId, googleAdsClientSecret, callbackUrl } from "./googleAdsOAuthService";

/** Versión de la Google Ads API. Google saca una nueva cada ~4 meses y
 *  sunsettea las viejas; por eso es configurable sin tocar código. */
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v25";
const API_BASE = `https://googleads.googleapis.com/${API_VERSION}`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GoogleAdsApiError extends Error {
  readonly status: number;
  /** Código simbólico de Google (`UNAUTHENTICATED`, `PERMISSION_DENIED`, …). */
  readonly code: string | null;
  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "GoogleAdsApiError";
    this.status = status;
    this.code = code;
  }
}

function developerToken(): string {
  const v = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!v) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN no está definida.");
  return v;
}

/** Customer ID de la cuenta Manager (MCC), solo dígitos. Opcional: hace
 *  falta cuando se accede a una cuenta a través del MCC. */
export function managerCustomerId(): string | null {
  const raw = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  return raw ? raw.replace(/\D/g, "") : null;
}

interface GoogleErrorBody {
  error?:
    | string
    | {
        code?: number;
        message?: string;
        status?: string;
        details?: { errors?: { message?: string }[] }[];
      };
  error_description?: string;
}

async function parseOrThrow<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // respuesta no-JSON
  }
  if (!res.ok) {
    const err = (body as GoogleErrorBody | null)?.error;
    // El endpoint de token devuelve `{error: "invalid_grant", error_description}`;
    // la Ads API devuelve `{error: {message, status, details[].errors[]}}`.
    if (typeof err === "string") {
      const desc = (body as GoogleErrorBody).error_description;
      throw new GoogleAdsApiError(desc || err, res.status, err);
    }
    const inner = err?.details?.[0]?.errors?.[0]?.message;
    throw new GoogleAdsApiError(
      inner || err?.message || `${label} respondió ${res.status}`,
      res.status,
      err?.status ?? null
    );
  }
  return body as T;
}

// ── OAuth ────────────────────────────────────────────────────────────────

export interface GoogleTokenSet {
  accessToken: string;
  /** Solo viene en el PRIMER canje (access_type=offline + prompt=consent). */
  refreshToken: string | null;
  /** ISO — cuándo vence el access token (típicamente 1 h). */
  expiresAt: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

function toTokenSet(data: TokenResponse): GoogleTokenSet {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

/** Canjea el `code` del callback por access + refresh token. */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleAdsClientId(),
      client_secret: googleAdsClientSecret(),
      redirect_uri: callbackUrl(),
      grant_type: "authorization_code",
    }),
  });
  return toTokenSet(await parseOrThrow<TokenResponse>(res, "OAuth de Google"));
}

/**
 * Renueva el access token con el refresh token guardado. El refresh token
 * NO se rota: sigue sirviendo hasta que el admin revoque el acceso (o, si
 * la app quedó en modo "Testing" en Google Cloud, hasta los 7 días).
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: googleAdsClientId(),
      client_secret: googleAdsClientSecret(),
      grant_type: "refresh_token",
    }),
  });
  return toTokenSet(await parseOrThrow<TokenResponse>(res, "OAuth de Google"));
}

// ── Google Ads API ───────────────────────────────────────────────────────

function adsHeaders(accessToken: string, loginCustomerId?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken(),
    "Content-Type": "application/json",
  };
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;
  return headers;
}

/**
 * IDs de las cuentas de Google Ads accesibles directamente por el usuario
 * que autorizó. Devuelve solo dígitos (`"1234567890"`), no el
 * `customers/1234567890` crudo de la API. Incluye cuentas Manager.
 */
export async function listAccessibleCustomers(accessToken: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/customers:listAccessibleCustomers`, {
    method: "GET",
    headers: adsHeaders(accessToken),
  });
  const data = await parseOrThrow<{ resourceNames?: string[] }>(res, "Google Ads API");
  return (data.resourceNames ?? []).map((name) => name.split("/").pop() ?? "").filter(Boolean);
}

export interface GoogleAdsCustomer {
  id: string;
  descriptiveName: string | null;
  currencyCode: string | null;
  /** true = es una cuenta Manager (MCC): no se pauta desde ella. */
  manager: boolean;
  testAccount: boolean;
}

interface SearchRow {
  customer?: {
    id?: string;
    descriptiveName?: string;
    currencyCode?: string;
    manager?: boolean;
    testAccount?: boolean;
  };
}

/**
 * Nombre / moneda / tipo de una cuenta. `listAccessibleCustomers` solo
 * devuelve IDs, así que hay que preguntar por cada una.
 */
export async function getCustomerDetails(
  customerId: string,
  accessToken: string,
  loginCustomerId?: string | null
): Promise<GoogleAdsCustomer | null> {
  const res = await fetch(`${API_BASE}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: adsHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({
      query:
        "SELECT customer.id, customer.descriptive_name, customer.currency_code, " +
        "customer.manager, customer.test_account FROM customer LIMIT 1",
    }),
  });
  const data = await parseOrThrow<{ results?: SearchRow[] }>(res, "Google Ads API");
  const c = data.results?.[0]?.customer;
  if (!c?.id) return null;
  return {
    id: c.id,
    descriptiveName: c.descriptiveName ?? null,
    currencyCode: c.currencyCode ?? null,
    manager: Boolean(c.manager),
    testAccount: Boolean(c.testAccount),
  };
}

/**
 * Cuentas colgadas de una cuenta Manager (recurso `customer_client`).
 *
 * `listAccessibleCustomers` SOLO devuelve las cuentas de nivel superior a
 * las que el usuario tiene acceso directo — en la práctica, casi siempre
 * la(s) cuenta(s) Manager, nunca las cuentas operativas que cuelgan de
 * ellas. Para llegar a una cuenta con la que sí se puede pautar hay que
 * preguntarle a CADA Manager por su árbol — eso es esto.
 *
 * `login-customer-id` va como el propio `managerCustomerId`: así se
 * consulta la Google Ads API "desde" ese Manager.
 */
export async function listChildAccounts(
  managerCustomerId: string,
  accessToken: string
): Promise<GoogleAdsCustomer[]> {
  const res = await fetch(`${API_BASE}/customers/${managerCustomerId}/googleAds:search`, {
    method: "POST",
    headers: adsHeaders(accessToken, managerCustomerId),
    body: JSON.stringify({
      query:
        "SELECT customer_client.id, customer_client.descriptive_name, " +
        "customer_client.currency_code, customer_client.manager, " +
        "customer_client.test_account FROM customer_client " +
        "WHERE customer_client.level <= 1",
    }),
  });
  const data = await parseOrThrow<{ results?: ChildRow[] }>(res, "Google Ads API");
  return (data.results ?? [])
    .map((r) => r.customerClient)
    .filter((c): c is NonNullable<typeof c> => Boolean(c?.id))
    .map((c) => ({
      id: c.id!,
      descriptiveName: c.descriptiveName ?? null,
      currencyCode: c.currencyCode ?? null,
      manager: Boolean(c.manager),
      testAccount: Boolean(c.testAccount),
    }));
}

interface ChildRow {
  customerClient?: {
    id?: string;
    descriptiveName?: string;
    currencyCode?: string;
    manager?: boolean;
    testAccount?: boolean;
  };
}

/** `1234567890` → `123-456-7890`, como lo muestra la interfaz de Google Ads. */
export function formatCustomerId(id: string): string {
  const digits = id.replace(/\D/g, "");
  return digits.length === 10
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
}
