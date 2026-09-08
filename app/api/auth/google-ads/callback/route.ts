// app/api/auth/google-ads/callback/route.ts
//
// Google devuelve acá el `code` después de que el admin autoriza en la
// pantalla de consentimiento. Flujo (mismo espíritu que el callback de
// Meta, ver app/api/auth/meta/callback/route.ts):
//
//   1. verificar el `state` firmado (HMAC + TTL, ver oauthState)
//   2. confirmar que la sesión actual es el mismo admin que inició
//   3. canjear code → access token + refresh token
//   4. listar las cuentas de Google Ads accesibles y quedarse con una
//      cuenta operativa (NO un Manager: desde un MCC no se pauta)
//   5. guardar en `ad_accounts` con los dos tokens cifrados
//   6. redirigir al panel con ?connected= o ?error=
//
// Ver docs/google-ads-setup-checklist.md.
import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { verifyState } from "@/lib/services/googleAdsOAuthService";
import {
  exchangeCodeForTokens,
  listAccessibleCustomers,
  getCustomerDetails,
  listChildAccounts,
  formatCustomerId,
  GoogleAdsApiError,
  type GoogleAdsCustomer,
} from "@/lib/services/googleAdsClient";
import { saveAdAccount } from "@/lib/services/adAccountService";
import { logProfileSecurityEvent } from "@/lib/services/profileSecurityLogService";

export const dynamic = "force-dynamic";

/** Tope de cuentas que se consultan una por una — un admin normal tiene
 *  2 o 3; el tope evita una ráfaga de requests si alguien tiene decenas. */
const MAX_CUSTOMERS_TO_INSPECT = 20;

const FALLBACK_PATH = "/admin/marketing/conexiones";

function back(returnPath: string, params: Record<string, string>): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL(returnPath || FALLBACK_PATH, base.replace(/\/$/, ""));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const parsed = state ? verifyState(state) : null;
  if (!parsed) {
    return back(FALLBACK_PATH, { error: "state_invalido" });
  }
  const returnPath = parsed.returnPath || FALLBACK_PATH;

  // El admin canceló (o negó los permisos) en la pantalla de Google.
  if (oauthError || !code) {
    return back(returnPath, { error: "cancelado" });
  }

  // Google vuelve al mismo host que pidió la autorización, así que la
  // cookie de sesión llega — se valida como defensa extra sobre el `state`.
  const profile = await getSessionProfile();
  if (
    !profile ||
    profile.role !== "admin" ||
    profile.userId !== parsed.userId ||
    profile.businessId !== parsed.businessId
  ) {
    return back(returnPath, { error: "sesion" });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refreshToken) {
      // Sin refresh token la conexión duraría 1 hora. Pasa si Google no
      // volvió a pedir consentimiento; `prompt=consent` debería evitarlo.
      return back(returnPath, { error: "sin_refresh_token" });
    }

    const customerIds = await listAccessibleCustomers(tokens.accessToken);
    if (customerIds.length === 0) {
      return back(returnPath, { error: "sin_cuentas_publicitarias" });
    }

    // `listAccessibleCustomers` solo da las cuentas de NIVEL SUPERIOR a las
    // que el usuario tiene acceso directo — en la práctica, casi siempre
    // su(s) cuenta(s) Manager, nunca las operativas que cuelgan de ellas.
    // Para cada una: si ya es operativa, esa misma sirve; si es Manager,
    // hay que bajar un nivel y preguntarle por sus cuentas hijas
    // (`listChildAccounts`) hasta encontrar una que no sea Manager.
    let account: GoogleAdsCustomer | null = null;
    let loginCustomerId: string | null = null;

    for (const id of customerIds.slice(0, MAX_CUSTOMERS_TO_INSPECT)) {
      let details: GoogleAdsCustomer | null;
      try {
        details = await getCustomerDetails(id, tokens.accessToken);
      } catch (err) {
        // Una cuenta a la que el token no puede leer no debe tumbar todo.
        console.warn(`[google-ads/callback] no se pudo leer la cuenta ${id}:`, err);
        continue;
      }
      if (!details) continue;

      if (!details.manager) {
        account = details;
        break;
      }

      try {
        const children = await listChildAccounts(id, tokens.accessToken);
        const child = children.find((c) => !c.manager && c.id !== id);
        if (child) {
          account = child;
          loginCustomerId = id; // se pauta a través de este Manager
          break;
        }
      } catch (err) {
        console.warn(`[google-ads/callback] no se pudieron listar las cuentas de ${id}:`, err);
      }
    }

    // v1: se conecta la primera cuenta operativa. El selector cuando hay
    // varias llega en una fase siguiente, igual que con Meta y con las
    // Páginas de Messenger.
    if (!account) {
      return back(returnPath, { error: "solo_manager" });
    }

    const saved = await saveAdAccount({
      businessId: profile.businessId,
      provider: "google",
      externalAccountId: account.id,
      externalName: account.descriptiveName ?? formatCustomerId(account.id),
      currency: account.currencyCode,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      loginCustomerId,
      tokenExpiresAt: tokens.expiresAt,
      connectedBy: profile.userId,
    });
    if (saved.error || !saved.id) {
      return back(returnPath, { error: "guardar", detail: saved.error ?? "" });
    }
    await logProfileSecurityEvent(parsed.userId, parsed.businessId, "ad_account_connected_google");

    return back(returnPath, {
      connected: "google_ads",
      account: account.descriptiveName ?? formatCustomerId(account.id),
    });
  } catch (err) {
    if (err instanceof GoogleAdsApiError) {
      console.error(`[google-ads/callback] error code=${err.code}: ${err.message}`);
      // El developer token de nivel "Test accounts" solo funciona contra
      // cuentas de prueba: contra una cuenta real Google responde
      // PERMISSION_DENIED. Vale la pena distinguirlo del resto.
      const code = err.code === "PERMISSION_DENIED" ? "developer_token" : "google";
      return back(returnPath, { error: code, detail: err.message.slice(0, 120) });
    }
    console.error("[google-ads/callback] error inesperado:", err);
    return back(returnPath, { error: "inesperado" });
  }
}
