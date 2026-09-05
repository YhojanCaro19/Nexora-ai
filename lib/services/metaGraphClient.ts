// lib/services/metaGraphClient.ts
//
// Wrapper fino sobre la Graph API de Meta. Cubre el flujo de OAuth
// (canje de `code` → token, extensión a token largo, listado de Páginas)
// y utilidades de token/webhook. El ENVÍO de mensajes vive en
// `metaChannelService.ts` (usa `graphPost` de acá).
//
// Solo se usa en código server (route handlers, crons, server actions):
// necesita `META_APP_SECRET`.
//
// Ver docs/channels-module-plan.md §4.2.

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export class GraphApiError extends Error {
  readonly status: number;
  readonly code: number | null;
  readonly fbtraceId: string | null;
  constructor(message: string, status: number, code: number | null, fbtraceId: string | null) {
    super(message);
    this.name = "GraphApiError";
    this.status = status;
    this.code = code;
    this.fbtraceId = fbtraceId;
  }
}

interface GraphErrorBody {
  error?: { message?: string; code?: number; fbtrace_id?: string };
}

function appId(): string {
  const v = process.env.META_APP_ID;
  if (!v) throw new Error("META_APP_ID no está definida.");
  return v;
}

function appSecret(): string {
  const v = process.env.META_APP_SECRET;
  if (!v) throw new Error("META_APP_SECRET no está definida.");
  return v;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // respuesta no-JSON
  }
  if (!res.ok) {
    const err = (body as GraphErrorBody | null)?.error;
    throw new GraphApiError(
      err?.message || `Graph API respondió ${res.status}`,
      res.status,
      err?.code ?? null,
      err?.fbtrace_id ?? null
    );
  }
  return body as T;
}

/** GET a la Graph API. `params` se serializa como query string. */
export async function graphGet<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${GRAPH_BASE}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { method: "GET" });
  return parseOrThrow<T>(res);
}

/** POST a la Graph API con body JSON. `accessToken` va como Bearer. */
export async function graphPost<T>(
  path: string,
  body: Record<string, unknown>,
  accessToken: string
): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  return parseOrThrow<T>(res);
}

// ── OAuth ────────────────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

/**
 * Canjea el `code` del redirect de Facebook Login por un token de usuario
 * de corta duración. `redirectUri` debe ser IDÉNTICA a la usada al iniciar
 * el flujo (Meta la valida).
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  return graphGet<TokenResponse>("oauth/access_token", {
    client_id: appId(),
    client_secret: appSecret(),
    redirect_uri: redirectUri,
    code,
  });
}

/**
 * Extiende un token de usuario de corta duración a uno de larga (~60 días).
 * Las Page access tokens derivadas de un token de usuario largo no expiran
 * mientras el usuario no revoque el acceso ni cambie la contraseña.
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<TokenResponse> {
  return graphGet<TokenResponse>("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId(),
    client_secret: appSecret(),
    fb_exchange_token: shortLivedToken,
  });
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  /** Cuenta de Instagram Business ligada a la Página, si existe. */
  instagram_business_account?: { id: string; username?: string };
}

/**
 * Lista las Páginas que el usuario administra y autorizó, cada una con su
 * propio Page access token (el que se guarda para responder por Messenger)
 * y, si aplica, la cuenta de Instagram ligada.
 */
export async function getUserPages(userAccessToken: string): Promise<FacebookPage[]> {
  const data = await graphGet<{ data?: FacebookPage[] }>("me/accounts", {
    fields: "id,name,access_token,category,instagram_business_account{id,username}",
    access_token: userAccessToken,
  });
  return data.data ?? [];
}

interface DebugTokenResponse {
  data?: {
    app_id?: string;
    type?: string;
    is_valid?: boolean;
    /** epoch en segundos; 0 = no expira. */
    expires_at?: number;
    scopes?: string[];
  };
}

/** Metadata de un token (validez, expiración, scopes). */
export async function debugToken(token: string): Promise<DebugTokenResponse["data"]> {
  const res = await graphGet<DebugTokenResponse>("debug_token", {
    input_token: token,
    access_token: `${appId()}|${appSecret()}`,
  });
  return res.data;
}

/**
 * Suscribe nuestra app a los webhooks de una Página (mensajes entrantes).
 * `pageAccessToken` es el token de ESA Página.
 */
export async function subscribePageToWebhooks(
  pageId: string,
  pageAccessToken: string,
  fields: string[] = ["messages", "messaging_postbacks"]
): Promise<void> {
  await graphPost(
    `${pageId}/subscribed_apps`,
    { subscribed_fields: fields.join(",") },
    pageAccessToken
  );
}

export interface FacebookAdAccount {
  id: string; // viene como "act_1234567890"
  account_id: string; // el número solo, sin "act_"
  name: string;
  currency: string;
  account_status: number; // 1 = ACTIVE
}

/**
 * Lista las cuentas publicitarias que el usuario administra y autorizó
 * (scope `ads_management`). Se usa al conectar Meta Ads — ver
 * app/api/auth/meta/callback/route.ts (kind = "marketing").
 */
export async function getUserAdAccounts(userAccessToken: string): Promise<FacebookAdAccount[]> {
  const data = await graphGet<{ data?: FacebookAdAccount[] }>("me/adaccounts", {
    fields: "id,account_id,name,currency,account_status",
    access_token: userAccessToken,
  });
  return data.data ?? [];
}

/** epoch-segundos de expiración → ISO string, o null si no expira. */
export function expiresAtToIso(expiresAt: number | undefined): string | null {
  if (!expiresAt || expiresAt <= 0) return null;
  return new Date(expiresAt * 1000).toISOString();
}

/**
 * Nombre del perfil de una persona que le escribió a la Página / cuenta de
 * IG (Messenger PSID o IGSID). Requiere el token de ESA Página. Devuelve
 * null si Meta no lo da (ventana de mensajería vencida, permisos, etc.) —
 * el llamador simplemente deja el cliente sin nombre.
 */
export async function getUserProfileName(
  userId: string,
  pageAccessToken: string
): Promise<string | null> {
  try {
    const data = await graphGet<{ name?: string; first_name?: string; last_name?: string }>(
      userId,
      { fields: "name,first_name,last_name", access_token: pageAccessToken }
    );
    const name =
      data.name?.trim() ||
      [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
    return name || null;
  } catch {
    return null;
  }
}
