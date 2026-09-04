// lib/services/instagramLoginService.ts
//
// "Instagram API with Instagram Login" — el negocio conecta su cuenta de
// Instagram profesional DIRECTAMENTE, sin necesidad de vincular una Página
// de Facebook. Host `graph.instagram.com` (no graph.facebook.com),
// credenciales propias (`INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`), que
// se sacan de: App de Meta → Instagram → "Configuración de la API con
// Instagram Login" → "Configuración de inicio de sesión empresarial".
//
// Las conexiones creadas por este flujo se guardan con
// `provider = "instagram_login"` en channel_connections — metaChannelService
// y el webhook ramifican por ahí para usar el host correcto.
//
// Solo código server.

const IG_GRAPH = "https://graph.instagram.com";

function appId(): string {
  const v = process.env.INSTAGRAM_APP_ID;
  if (!v) throw new Error("INSTAGRAM_APP_ID no está definida.");
  return v;
}
function appSecret(): string {
  const v = process.env.INSTAGRAM_APP_SECRET;
  if (!v) throw new Error("INSTAGRAM_APP_SECRET no está definida.");
  return v;
}
function graphVersion(): string {
  return process.env.META_GRAPH_VERSION || "v21.0";
}

export class InstagramApiError extends Error {
  readonly status: number;
  readonly code: number | null;
  constructor(message: string, status: number, code: number | null) {
    super(message);
    this.name = "InstagramApiError";
    this.status = status;
    this.code = code;
  }
}

interface IgErrorBody {
  error?: { message?: string; code?: number };
  error_message?: string;
  error_type?: string;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* no-json */
  }
  if (!res.ok) {
    const b = body as IgErrorBody | null;
    const msg = b?.error?.message || b?.error_message || `Instagram respondió ${res.status}`;
    throw new InstagramApiError(msg, res.status, b?.error?.code ?? null);
  }
  return body as T;
}

// ── OAuth ────────────────────────────────────────────────────────────────

interface ShortTokenResponse {
  access_token: string;
  user_id: string | number;
  permissions?: string;
}

/**
 * Canjea el `code` del redirect por un token de corta duración (1 h) + el
 * id de la cuenta de IG. La API a veces envuelve la respuesta en `data: []`
 * y a veces la devuelve plana — se cubren ambas.
 */
export async function exchangeInstagramCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; userId: string }> {
  const form = new URLSearchParams({
    client_id: appId(),
    client_secret: appSecret(),
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const raw = await parseOrThrow<ShortTokenResponse | { data: ShortTokenResponse[] }>(res);
  const t = "data" in raw ? raw.data[0] : raw;
  if (!t?.access_token) throw new InstagramApiError("Respuesta sin access_token.", 502, null);
  return { accessToken: t.access_token, userId: String(t.user_id) };
}

interface LongTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

/** Corta duración → larga duración (~60 días). */
export async function exchangeInstagramLongLived(
  shortToken: string
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const url = new URL(`${IG_GRAPH}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret());
  url.searchParams.set("access_token", shortToken);
  const res = await fetch(url, { method: "GET" });
  const t = await parseOrThrow<LongTokenResponse>(res);
  return { accessToken: t.access_token, expiresInSeconds: t.expires_in ?? 60 * 24 * 60 * 60 };
}

/** Refresca un token largo (debe tener ≥ 24 h de vida). Lo usa el cron de salud. */
export async function refreshInstagramToken(
  longToken: string
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const url = new URL(`${IG_GRAPH}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", longToken);
  const res = await fetch(url, { method: "GET" });
  const t = await parseOrThrow<LongTokenResponse>(res);
  return { accessToken: t.access_token, expiresInSeconds: t.expires_in ?? 60 * 24 * 60 * 60 };
}

/** Perfil de la cuenta conectada (para mostrar "@usuario" en la UI). */
export async function getInstagramSelf(
  token: string
): Promise<{ id: string; username: string | null }> {
  const url = new URL(`${IG_GRAPH}/me`);
  url.searchParams.set("fields", "user_id,username");
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { method: "GET" });
  const d = await parseOrThrow<{ user_id?: string | number; id?: string; username?: string }>(res);
  return { id: String(d.user_id ?? d.id ?? ""), username: d.username ?? null };
}

/** Nombre de la persona que escribió un DM (best-effort, para el CRM). */
export async function getInstagramUserName(igsid: string, token: string): Promise<string | null> {
  try {
    const url = new URL(`${IG_GRAPH}/${igsid}`);
    url.searchParams.set("fields", "name,username");
    url.searchParams.set("access_token", token);
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const d = (await res.json()) as { name?: string; username?: string };
    return d.name?.trim() || (d.username ? `@${d.username}` : null);
  } catch {
    return null;
  }
}

/** Suscribe la app a los webhooks de esta cuenta de IG (best-effort). */
export async function subscribeInstagramWebhooks(igUserId: string, token: string): Promise<void> {
  const url = new URL(`${IG_GRAPH}/${graphVersion()}/${igUserId}/subscribed_apps`);
  url.searchParams.set("subscribed_fields", "messages");
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { method: "POST" });
  await parseOrThrow(res);
}

/** Envía un DM. `recipientId` = IGSID de la persona (viene del webhook). */
export async function sendInstagramMessage(
  igUserId: string,
  token: string,
  recipientId: string,
  text: string
): Promise<{ error: string | null; code?: number | null }> {
  try {
    const res = await fetch(`${IG_GRAPH}/${graphVersion()}/${igUserId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        access_token: token,
      }),
    });
    await parseOrThrow(res);
    return { error: null };
  } catch (err) {
    if (err instanceof InstagramApiError) {
      console.error(`[sendInstagramMessage] code=${err.code}: ${err.message}`);
      return { error: err.message, code: err.code };
    }
    console.error("[sendInstagramMessage] error inesperado:", err);
    return { error: "No se pudo enviar el mensaje de Instagram." };
  }
}
