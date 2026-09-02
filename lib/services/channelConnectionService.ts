// lib/services/channelConnectionService.ts
//
// CRUD de `channel_connections` — las conexiones OAuth de cada negocio a
// sus canales de Meta. El token se guarda CIFRADO (tokenCrypto) y solo se
// descifra acá, para código server.
//
// - Lecturas para la UI  → `listConnectionsForBusiness` (cliente de sesión,
//   RLS deja ver solo al admin del negocio; nunca selecciona el token).
// - Lecturas para motor/webhook → `getConnection*` (admin client, service
//   role: el webhook no corre con sesión de usuario). Devuelven el token
//   YA descifrado.
// - Escrituras → siempre admin client (callback de OAuth y crons).
//
// Ver docs/channels-module-plan.md §4.3.
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { encryptToken, decryptToken } from "@/lib/utils/tokenCrypto";
import {
  isChannel,
  type Channel,
  type ChannelConnectionPublic,
  type ChannelConnectionStatus,
} from "@/lib/types/channel";

const TABLE = "channel_connections";

const PUBLIC_COLUMNS =
  "id, business_id, channel, provider, external_id, external_name, token_expires_at, webhook_subscribed, status, last_error, connected_at";

interface PublicRow {
  id: string;
  business_id: string;
  channel: string;
  provider: string;
  external_id: string;
  external_name: string | null;
  token_expires_at: string | null;
  webhook_subscribed: boolean;
  status: string;
  last_error: string | null;
  connected_at: string;
}

function toPublic(row: PublicRow): ChannelConnectionPublic {
  return {
    id: row.id,
    businessId: row.business_id,
    channel: isChannel(row.channel) ? row.channel : "messenger",
    provider: row.provider,
    externalId: row.external_id,
    externalName: row.external_name,
    tokenExpiresAt: row.token_expires_at,
    webhookSubscribed: row.webhook_subscribed,
    status: row.status as ChannelConnectionStatus,
    lastError: row.last_error,
    connectedAt: row.connected_at,
  };
}

/** Estado de los canales de un negocio, para la pantalla "Mi Agente → Canales". */
export async function listConnectionsForBusiness(
  businessId: string
): Promise<ChannelConnectionPublic[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(PUBLIC_COLUMNS)
    .eq("business_id", businessId)
    .order("connected_at", { ascending: true });

  if (error) {
    console.error("[listConnectionsForBusiness] error:", error);
    return [];
  }
  return ((data as PublicRow[] | null) ?? []).map(toPublic);
}

export interface ChannelConnectionWithToken extends ChannelConnectionPublic {
  /** Token en claro — NUNCA devolver esto a un client component. */
  accessToken: string;
  extra: Record<string, unknown>;
}

const FULL_COLUMNS = `${PUBLIC_COLUMNS}, access_token, extra`;

interface FullRow extends PublicRow {
  access_token: string;
  extra: Record<string, unknown> | null;
}

function toWithToken(row: FullRow): ChannelConnectionWithToken {
  return {
    ...toPublic(row),
    accessToken: decryptToken(row.access_token),
    extra: row.extra ?? {},
  };
}

/**
 * Conexión por el id externo que recibió el mensaje (Page ID / IG id /
 * phone_number_id). La usa el webhook para saber a qué negocio pertenece.
 */
export async function getConnectionByExternalId(
  channel: Channel,
  externalId: string
): Promise<ChannelConnectionWithToken | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(TABLE)
    .select(FULL_COLUMNS)
    .eq("channel", channel)
    .eq("external_id", externalId)
    .maybeSingle();

  if (error) {
    console.error("[getConnectionByExternalId] error:", error);
    return null;
  }
  return data ? toWithToken(data as FullRow) : null;
}

/** Conexión activa de un negocio en un canal, para enviar mensajes salientes. */
export async function getActiveConnection(
  businessId: string,
  channel: Channel
): Promise<ChannelConnectionWithToken | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(TABLE)
    .select(FULL_COLUMNS)
    .eq("business_id", businessId)
    .eq("channel", channel)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[getActiveConnection] error:", error);
    return null;
  }
  return data ? toWithToken(data as FullRow) : null;
}

export interface SaveConnectionInput {
  businessId: string;
  channel: Channel;
  externalId: string;
  externalName?: string | null;
  /** Token en claro — se cifra antes de escribir. */
  accessToken: string;
  tokenExpiresAt?: string | null;
  extra?: Record<string, unknown>;
  webhookSubscribed?: boolean;
  connectedBy?: string | null;
}

/**
 * Upsert de una conexión (clave `channel + external_id`). Si ese
 * Page/número ya estaba conectado a OTRO negocio, la constraint única lo
 * rechaza — el llamador debe traducir ese error a "ese canal ya está
 * conectado a otra cuenta".
 */
export async function saveConnection(
  input: SaveConnectionInput
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { error } = await admin.from(TABLE).upsert(
    {
      business_id: input.businessId,
      channel: input.channel,
      provider: "meta",
      external_id: input.externalId,
      external_name: input.externalName ?? null,
      access_token: encryptToken(input.accessToken),
      token_expires_at: input.tokenExpiresAt ?? null,
      extra: input.extra ?? {},
      webhook_subscribed: input.webhookSubscribed ?? false,
      status: "active",
      last_error: null,
      connected_by: input.connectedBy ?? null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "channel,external_id" }
  );

  if (error) {
    console.error("[saveConnection] error:", error);
    if (error.code === "23505") {
      return { error: "Ese canal ya está conectado a otra cuenta de AVENTHRA." };
    }
    return { error: "No se pudo guardar la conexión." };
  }
  return { error: null };
}

export async function setWebhookSubscribed(id: string, value: boolean): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from(TABLE)
    .update({ webhook_subscribed: value, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("[setWebhookSubscribed] error:", error);
}

export async function markConnectionError(id: string, message: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from(TABLE)
    .update({
      status: "error",
      last_error: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) console.error("[markConnectionError] error:", error);
}

/** Marca la conexión como revocada (el negocio la desconectó). */
export async function revokeConnection(businessId: string, channel: Channel): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from(TABLE)
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("channel", channel);
  if (error) console.error("[revokeConnection] error:", error);
}
