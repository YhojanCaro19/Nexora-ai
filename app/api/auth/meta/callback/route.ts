// app/api/auth/meta/callback/route.ts
//
// Meta devuelve acá el `code` después de que el admin autoriza en el
// diálogo de Facebook. Flujo:
//   1. verificar `state` (firmado, ver metaOAuthService)
//   2. confirmar que la sesión actual es el mismo admin que inició
//   3. canjear code → token largo
//   4. listar las Páginas autorizadas
//   5. guardar la conexión de Messenger (y la de Instagram si la Página
//      tiene cuenta de IG ligada), con el token cifrado
//   6. intentar suscribir el webhook (no fatal si aún no está configurado)
//   7. redirigir al panel con ?connected= o ?error=
//
// Solo cubre `kind = "channels"` por ahora. `marketing` (ads) se agrega
// con el módulo de Marketing.
import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import {
  verifyState,
  callbackUrl,
  type MetaConnectionKind,
} from "@/lib/services/metaOAuthService";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getUserPages,
  subscribePageToWebhooks,
  debugToken,
  expiresAtToIso,
  GraphApiError,
} from "@/lib/services/metaGraphClient";
import { saveConnection, setWebhookSubscribed } from "@/lib/services/channelConnectionService";

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

  const fallback = "/admin/mi-agente/canales";

  const parsed = state ? verifyState(state) : null;
  if (!parsed) {
    return back(fallback, { error: "state_invalido" });
  }
  const returnPath = parsed.returnPath || fallback;

  // El admin canceló en el diálogo de Facebook.
  if (oauthError || !code) {
    return back(returnPath, { error: "cancelado" });
  }

  // La sesión del navegador que llega en el redirect debe ser el mismo
  // admin que inició el flujo (defensa extra sobre la firma del state).
  const profile = await getSessionProfile();
  if (
    !profile ||
    profile.role !== "admin" ||
    profile.userId !== parsed.userId ||
    profile.businessId !== parsed.businessId
  ) {
    return back(returnPath, { error: "sesion" });
  }

  if ((parsed.kind as MetaConnectionKind) !== "channels") {
    return back(returnPath, { error: "kind_no_soportado" });
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
