// app/api/auth/meta/callback/route.ts
//
// Meta devuelve acá el `code` después de que el admin autoriza en el
// diálogo de Facebook. Tres flujos, según `state.kind`:
//
// `channels` — conectar Messenger/Instagram (Perfil → Conectar redes):
//   1. verificar `state` (firmado, ver metaOAuthService)
//   2. confirmar que la sesión actual es el mismo admin que inició
//   3. canjear code → token largo
//   4. listar las Páginas autorizadas
//   5. guardar la conexión de Messenger (y la de Instagram si la Página
//      tiene cuenta de IG ligada), con el token cifrado
//   6. intentar suscribir el webhook (no fatal si aún no está configurado)
//   7. redirigir al panel con ?connected= o ?error=
//
// `marketing` — conectar Meta Ads (Marketing → Conexiones): mismo canje de
// token, pero lista cuentas publicitarias (`ads_management`) en vez de
// Páginas, y guarda en `ad_accounts` (ver adAccountService). Sin webhook.
//
// `instagram` — Instagram Business Login directo, ver más abajo.
import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { verifyState, callbackUrl, instagramRedirectUri } from "@/lib/services/metaOAuthService";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getUserPages,
  getUserAdAccounts,
  subscribePageToWebhooks,
  debugToken,
  expiresAtToIso,
  GraphApiError,
} from "@/lib/services/metaGraphClient";
import {
  exchangeInstagramCode,
  exchangeInstagramLongLived,
  getInstagramSelf,
  subscribeInstagramWebhooks,
  InstagramApiError,
} from "@/lib/services/instagramLoginService";
import { saveConnection, setWebhookSubscribed } from "@/lib/services/channelConnectionService";
import { saveAdAccount } from "@/lib/services/adAccountService";

export const dynamic = "force-dynamic";

function back(returnPath: string, params: Record<string, string>): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL(returnPath, base.replace(/\/$/, ""));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const fallback = "/admin/perfil";

  const parsed = state ? verifyState(state) : null;
  if (!parsed) {
    return back(fallback, { error: "state_invalido" });
  }
  const returnPath = parsed.returnPath || fallback;

  // El admin canceló en el diálogo de Facebook.
  if (oauthError || !code) {
    return back(returnPath, { error: "cancelado" });
  }

  // ── Instagram Business Login directo ───────────────────────────────────
  // No se valida la sesión del navegador acá: Instagram redirige al host
  // del túnel (redirect_uri fijo), que NO comparte la cookie de sesión de
  // `localhost` / del dominio real. Se confía en el `state` firmado (HMAC +
  // TTL de 10 min) — trae businessId/userId y no se puede forjar.
  if (parsed.kind === "instagram") {
    try {
      const short = await exchangeInstagramCode(code, instagramRedirectUri());
      const long = await exchangeInstagramLongLived(short.accessToken);
      const self = await getInstagramSelf(long.accessToken);
      const igId = self.id || short.userId;

      const saved = await saveConnection({
        businessId: parsed.businessId,
        channel: "instagram",
        provider: "instagram_login",
        externalId: igId,
        externalName: self.username ? `@${self.username}` : "Instagram",
        accessToken: long.accessToken,
        tokenExpiresAt: new Date(Date.now() + long.expiresInSeconds * 1000).toISOString(),
        connectedBy: parsed.userId,
      });
      if (saved.error || !saved.id) {
        return back(returnPath, { error: "guardar", detail: saved.error ?? "" });
      }

      try {
        await subscribeInstagramWebhooks(igId, long.accessToken);
        await setWebhookSubscribed(saved.id, true);
      } catch (err) {
        console.warn("[meta/callback] IG: no se pudo suscribir el webhook todavía:", err);
      }

      return back(returnPath, {
        connected: "instagram",
        page: self.username ? `@${self.username}` : "Instagram",
      });
    } catch (err) {
      if (err instanceof InstagramApiError) {
        console.error(`[meta/callback] Instagram error code=${err.code}: ${err.message}`);
        return back(returnPath, { error: "graph", detail: err.message.slice(0, 120) });
      }
      console.error("[meta/callback] IG error inesperado:", err);
      return back(returnPath, { error: "inesperado" });
    }
  }

  if (parsed.kind !== "channels" && parsed.kind !== "marketing") {
    return back(returnPath, { error: "kind_no_soportado" });
  }

  // Facebook Login (channels/marketing) SÍ vuelve al mismo host (redirect_uri
  // registrado = dominio propio, y `localhost` va aparte en dev), así que la
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

  // ── Meta Ads (módulo de Marketing) ──────────────────────────────────────
  // No hay Página involucrada: se conecta directamente la cuenta
  // publicitaria (scope `ads_management`, ver metaOAuthService).
  if (parsed.kind === "marketing") {
    try {
      const short = await exchangeCodeForToken(code, callbackUrl());
      const long = await exchangeForLongLivedToken(short.access_token);
      const adAccounts = await getUserAdAccounts(long.access_token);

      if (adAccounts.length === 0) {
        return back(returnPath, { error: "sin_cuentas_publicitarias" });
      }

      // v1: se conecta la primera cuenta publicitaria activa (o la primera
      // de la lista si ninguna está ACTIVE). El selector cuando hay varias
      // llega en una fase siguiente, igual que con las Páginas de Messenger.
      const account = adAccounts.find((a) => a.account_status === 1) ?? adAccounts[0];
      const meta = await debugToken(long.access_token);
      const tokenExpiresAt = expiresAtToIso(meta?.expires_at);

      const saved = await saveAdAccount({
        businessId: profile.businessId,
        provider: "meta",
        externalAccountId: account.id,
        externalName: account.name,
        currency: account.currency,
        accessToken: long.access_token,
        tokenExpiresAt,
        connectedBy: profile.userId,
      });
      if (saved.error || !saved.id) {
        return back(returnPath, { error: "guardar", detail: saved.error ?? "" });
      }

      return back(returnPath, { connected: "meta_ads", account: account.name });
    } catch (err) {
      if (err instanceof GraphApiError) {
        console.error(`[meta/callback] Ads Graph error code=${err.code}: ${err.message}`);
        return back(returnPath, { error: "graph", detail: err.message.slice(0, 120) });
      }
      console.error("[meta/callback] Ads error inesperado:", err);
      return back(returnPath, { error: "inesperado" });
    }
  }

  try {
    const short = await exchangeCodeForToken(code, callbackUrl());
    const long = await exchangeForLongLivedToken(short.access_token);
    const pages = await getUserPages(long.access_token);

    if (pages.length === 0) {
      return back(returnPath, { error: "sin_paginas" });
    }

    // v1: se conecta la primera Página. El selector cuando hay varias
    // llega en una fase siguiente.
    const page = pages[0];
    const meta = await debugToken(page.access_token);
    const tokenExpiresAt = expiresAtToIso(meta?.expires_at);

    const saved = await saveConnection({
      businessId: profile.businessId,
      channel: "messenger",
      externalId: page.id,
      externalName: page.name,
      accessToken: page.access_token,
      tokenExpiresAt,
      extra: { category: page.category ?? null },
      connectedBy: profile.userId,
    });
    if (saved.error || !saved.id) {
      return back(returnPath, { error: "guardar", detail: saved.error ?? "" });
    }
    const savedIds: string[] = [saved.id];

    // Instagram: misma Página, mismo token, id de la cuenta de IG ligada.
    if (page.instagram_business_account?.id) {
      const ig = await saveConnection({
        businessId: profile.businessId,
        channel: "instagram",
        externalId: page.instagram_business_account.id,
        externalName: page.instagram_business_account.username
          ? `@${page.instagram_business_account.username}`
          : page.name,
        accessToken: page.access_token,
        tokenExpiresAt,
        extra: { pageId: page.id },
        connectedBy: profile.userId,
      });
      if (ig.id) savedIds.push(ig.id);
    }

    // Suscribir el webhook de la Página. No es fatal: si el producto
    // Messenger todavía no tiene webhook configurado (Fase 3), esto falla
    // y se reintenta luego — la conexión ya quedó guardada.
    try {
      await subscribePageToWebhooks(page.id, page.access_token);
      await Promise.all(savedIds.map((id) => setWebhookSubscribed(id, true)));
    } catch (err) {
      console.warn("[meta/callback] no se pudo suscribir el webhook todavía:", err);
    }

    const multiple = pages.length > 1 ? String(pages.length) : "";
    return back(returnPath, {
      connected: "messenger",
      page: page.name,
      ...(multiple ? { multiple } : {}),
    });
  } catch (err) {
    if (err instanceof GraphApiError) {
      console.error(`[meta/callback] Graph error code=${err.code}: ${err.message}`);
      return back(returnPath, { error: "graph", detail: err.message.slice(0, 120) });
    }
    console.error("[meta/callback] error inesperado:", err);
    return back(returnPath, { error: "inesperado" });
  }
}
