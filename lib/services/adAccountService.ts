// lib/services/adAccountService.ts
//
// CRUD de `ad_accounts` — las conexiones OAuth de cada negocio a sus
// cuentas publicitarias (Meta Ads hoy; Google/TikTok Ads después, mismo
// esquema). El token se guarda CIFRADO (tokenCrypto) y solo se descifra
// acá, para código server. Mismo patrón que channelConnectionService.ts.
//
// - Lecturas para la UI     → `listAdAccountsForBusiness` (cliente de
//   sesión, RLS deja ver solo al admin del negocio; nunca selecciona el
//   token).
// - Lecturas para publicar  → `getActiveAdAccount` (admin client, service
//   role). Devuelve el token YA descifrado.
// - Escrituras              → siempre admin client (callback de OAuth).
//
// Ver docs/marketing-module-plan.md §8.
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { encryptToken, decryptToken } from "@/lib/utils/tokenCrypto";
import {
  isAdProvider,
  type AdProvider,
  type AdAccountPublic,
  type AdAccountStatus,
} from "@/lib/types/adAccount";

const TABLE = "ad_accounts";

const PUBLIC_COLUMNS =
  "id, business_id, provider, external_account_id, external_name, currency, token_expires_at, status, last_error, connected_at";

interface PublicRow {
  id: string;
  business_id: string;
  provider: string;
  external_account_id: string;
  external_name: string | null;
  currency: string | null;
  token_expires_at: string | null;
  status: string;
  last_error: string | null;
  connected_at: string;
}

function toPublic(row: PublicRow): AdAccountPublic {
  return {
    id: row.id,
    businessId: row.business_id,
    provider: isAdProvider(row.provider) ? row.provider : "meta",
    externalAccountId: row.external_account_id,
    externalName: row.external_name,
    currency: row.currency,
    tokenExpiresAt: row.token_expires_at,
    status: row.status as AdAccountStatus,
    lastError: row.last_error,
    connectedAt: row.connected_at,
  };
}

/** Estado de las cuentas de pauta de un negocio, para "Marketing → Conexiones". */
export async function listAdAccountsForBusiness(businessId: string): Promise<AdAccountPublic[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(PUBLIC_COLUMNS)
    .eq("business_id", businessId)
    .order("connected_at", { ascending: true });

  if (error) {
    console.error("[listAdAccountsForBusiness] error:", error);
    return [];
  }
  return ((data as PublicRow[] | null) ?? []).map(toPublic);
}

export interface AdAccountWithToken extends AdAccountPublic {
  /** Token en claro — NUNCA devolver esto a un client component. */
  accessToken: string;
}

const FULL_COLUMNS = `${PUBLIC_COLUMNS}, access_token`;

interface FullRow extends PublicRow {
  access_token: string;
}

function toWithToken(row: FullRow): AdAccountWithToken {
  return { ...toPublic(row), accessToken: decryptToken(row.access_token) };
}

/** Cuenta activa de un negocio en un proveedor, para publicar pauta (Fase 2b). */
export async function getActiveAdAccount(
  businessId: string,
  provider: AdProvider
): Promise<AdAccountWithToken | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(TABLE)
    .select(FULL_COLUMNS)
    .eq("business_id", businessId)
    .eq("provider", provider)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[getActiveAdAccount] error:", error);
    return null;
  }
  return data ? toWithToken(data as FullRow) : null;
}

export interface SaveAdAccountInput {
  businessId: string;
  provider: AdProvider;
  externalAccountId: string;
  externalName?: string | null;
  currency?: string | null;
  /** Token en claro — se cifra antes de escribir. */
  accessToken: string;
  tokenExpiresAt?: string | null;
  connectedBy?: string | null;
}

/**
 * Upsert de una conexión (clave `provider + external_account_id`). Si esa
 * cuenta ya estaba conectada a OTRO negocio, la constraint única lo
 * rechaza — el llamador debe traducir ese error a "esa cuenta ya está
 * conectada a otro negocio de AVENTHRA".
 */
export async function saveAdAccount(
  input: SaveAdAccountInput
): Promise<{ error: string | null; id: string | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(TABLE)
    .upsert(
      {
        business_id: input.businessId,
        provider: input.provider,
        external_account_id: input.externalAccountId,
        external_name: input.externalName ?? null,
        currency: input.currency ?? null,
        access_token: encryptToken(input.accessToken),
        token_expires_at: input.tokenExpiresAt ?? null,
        status: "active",
        last_error: null,
        connected_by: input.connectedBy ?? null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,external_account_id" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("[saveAdAccount] error:", error);
    if (error.code === "23505") {
      return { error: "Esa cuenta publicitaria ya está conectada a otro negocio de AVENTHRA.", id: null };
    }
    return { error: "No se pudo guardar la conexión.", id: null };
  }
  return { error: null, id: (data as { id: string }).id };
}

export async function markAdAccountError(id: string, message: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from(TABLE)
    .update({ status: "error", last_error: message.slice(0, 500), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("[markAdAccountError] error:", error);
}

/** Marca la conexión como revocada (el negocio la desconectó). */
export async function revokeAdAccount(businessId: string, provider: AdProvider): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from(TABLE)
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("provider", provider);
  if (error) console.error("[revokeAdAccount] error:", error);
}
