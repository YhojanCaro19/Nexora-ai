"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/get-session";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sanitizeImageUpload } from "@/lib/services/imageSecurityService";
import { generateImage, type ImageQuality, type GenerateImageResult } from "@/lib/services/imageService";
import { generateStrategy, type StrategyWizardAnswers } from "@/lib/services/strategyService";
import {
  createStrategy,
  updateStrategyStatus,
  getStrategy,
  listPieces,
  updatePieceStatus,
  markStrategyPublished,
  markStrategyActivated,
  markPieceExternalAd,
  upsertStrategyMetric,
  type StrategyStatus,
  type PieceStatus,
} from "@/lib/services/marketingService";
import { signState, buildAuthorizeUrl } from "@/lib/services/metaOAuthService";
import { revokeAdAccount, getActiveAdAccount } from "@/lib/services/adAccountService";
import { getActiveConnection } from "@/lib/services/channelConnectionService";
import { generatePieceVariants, piecePublicUrl, type GeneratePiecesResult } from "@/lib/services/creativeService";
import {
  createCampaign,
  createAdSet,
  createAdCreative,
  createAd,
  setCampaignStatus,
  getCampaignInsights,
  toMinorUnits,
  MetaAdsPublishError,
} from "@/lib/services/metaMarketingClient";

// ── Contexto del negocio para la IA ──────────────────────────────────────
async function buildBusinessContext(businessId: string): Promise<string> {
  const supabase = await createClient();
  const [{ data: biz }, { count: productCount }] = await Promise.all([
    supabase.from("businesses").select("name, industry_type").eq("id", businessId).maybeSingle(),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("active", true),
  ]);
  return [
    `Nombre: ${biz?.name ?? "el negocio"}`,
    `Industria: ${biz?.industry_type ?? "sin especificar"}`,
    `Productos activos en catálogo: ${productCount ?? 0}`,
  ].join("\n");
}

// ── Nueva estrategia ─────────────────────────────────────────────────────
export type NewStrategyResult =
  | { ok: true; strategyId: string; creditsLeft: number }
  | { ok: false; reason: "insufficient_credits"; needed: number; have: number }
  | { ok: false; reason: "error"; message: string };

/** Sube el logo (PNG, con transparencia) o la foto de referencia del
 *  producto (JPG/PNG) a una ruta fija ligada a la estrategia — el mismo
 *  pipeline de seguridad que el resto del proyecto (firma binaria real +
 *  re-codificado con sharp), nunca el archivo original. */
async function uploadStrategyAsset(
  businessId: string,
  strategyId: string,
  file: File,
  filename: "logo.png" | "reference.png"
): Promise<void> {
  const { buffer, error } = await sanitizeImageUpload(file, {
    maxDimension: filename === "logo.png" ? 600 : 1600,
    maxBytes: 5 * 1024 * 1024,
    outputFormat: "png",
  });
  if (error || !buffer) {
    console.warn(`[uploadStrategyAsset] ${filename} rechazado:`, error);
    return;
  }
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("marketing")
    .upload(`${businessId}/${strategyId}/${filename}`, buffer, { contentType: "image/png", upsert: true });
  if (uploadError) console.error(`[uploadStrategyAsset] error subiendo ${filename}:`, uploadError);
}

export async function createStrategyAction(
  name: string,
  answers: StrategyWizardAnswers,
  logoFile?: File | null,
  referenceFile?: File | null
): Promise<NewStrategyResult> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { ok: false, reason: "error", message: "No autorizado" };
  }

  const limit = checkRateLimit(`nueva-estrategia:${profile.userId}`, 6, 60 * 1000);
  if (!limit.allowed) {
    return { ok: false, reason: "error", message: `Demasiadas seguidas. Espera ${limit.retryAfterSeconds}s.` };
  }

  const cleanName = name.trim() || answers.goal.trim().slice(0, 60) || "Estrategia sin nombre";
  const context = await buildBusinessContext(profile.businessId);

  const gen = await generateStrategy(profile.businessId, context, answers);
  if (!gen.ok) {
    if (gen.reason === "insufficient_credits") {
      return { ok: false, reason: "insufficient_credits", needed: gen.needed, have: gen.have };
    }
    return { ok: false, reason: "error", message: gen.message };
  }

  const primaryChannel = answers.channels[0] ?? "organic";
  const { data: strategy, error } = await createStrategy(profile.businessId, {
    name: cleanName,
    goal: answers.goal,
    objective: gen.output.campaignIdeas[0]?.objective ?? null,
    provider: primaryChannel,
    channel: primaryChannel,
    budgetAmount: answers.monthlyBudget,
    budgetCurrency: answers.budgetCurrency,
    budgetPeriod: "total",
    language: answers.language,
    location: null,
    startsAt: null,
    endsAt: null,
    wizardAnswers: answers,
    aiStrategy: gen.output,
  });

  if (error || !strategy) {
    return { ok: false, reason: "error", message: error ?? "No se pudo guardar la estrategia" };
  }

  // Recién acá existe strategy.id — el logo/referencia se suben a una ruta
  // fija ligada a ese id (ver creativeService.strategyLogoUrl/ReferenceUrl).
  // No es fatal si alguno falla: la estrategia ya quedó creada y las piezas
  // se generan igual, simplemente sin ese extra.
  await Promise.all([
    logoFile ? uploadStrategyAsset(profile.businessId, strategy.id, logoFile, "logo.png") : Promise.resolve(),
    referenceFile ? uploadStrategyAsset(profile.businessId, strategy.id, referenceFile, "reference.png") : Promise.resolve(),
  ]);

  revalidatePath("/admin/marketing");
  return { ok: true, strategyId: strategy.id, creditsLeft: gen.creditsLeft };
}

export async function setStrategyStatusAction(id: string, status: StrategyStatus) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) return { error: "No autorizado" };

  const result = await updateStrategyStatus(profile.businessId, id, status);
  revalidatePath("/admin/marketing");
  revalidatePath(`/admin/marketing/${id}`);
  return result;
}

export async function archiveStrategyAction(id: string) {
  const result = await setStrategyStatusAction(id, "archived");
  if (!result.error) redirect("/admin/marketing");
  return result;
}

// ── Imagen suelta (probador / biblioteca) ────────────────────────────────
export async function generateImageAction(
  prompt: string,
  quality: ImageQuality
): Promise<GenerateImageResult> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { ok: false, reason: "provider_error", message: "No autorizado" };
  }

  const limit = checkRateLimit(`generar-imagen:${profile.userId}`, 10, 60 * 1000);
  if (!limit.allowed) {
    return {
      ok: false,
      reason: "provider_error",
      message: `Demasiadas imágenes seguidas. Espera ${limit.retryAfterSeconds}s.`,
    };
  }

  return generateImage(profile.businessId, prompt, quality);
}

// ── Conexiones de pauta (Marketing → Conexiones) ─────────────────────────
// El módulo de Marketing publica pauta con la propia cuenta de Meta Ads del
// negocio (OAuth), nunca con una cuenta de AVENTHRA. Mismo flujo que
// "Conectar redes" en Perfil, con kind="marketing" (scope ads_management,
// ver metaOAuthService). Ver docs/marketing-module-plan.md §8.

const MARKETING_RETURN_PATH = "/admin/marketing/conexiones";

/** Arranca el OAuth de Meta Ads: firma el `state` y manda el navegador al
 *  diálogo de Facebook. Al volver, /api/auth/meta/callback guarda todo. */
export async function startMetaAdsConnectAction(): Promise<void> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    redirect("/login");
  }

  const limit = checkRateLimit(`meta-ads-connect:${profile.userId}`, 8, 60 * 1000);
  if (!limit.allowed) {
    redirect(`${MARKETING_RETURN_PATH}?error=rate`);
  }

  const state = signState({
    businessId: profile.businessId,
    userId: profile.userId,
    kind: "marketing",
    returnPath: MARKETING_RETURN_PATH,
  });
  redirect(buildAuthorizeUrl(state, "marketing"));
}

/** Desconecta la cuenta de pauta de un proveedor (marca la conexión como revocada). */
export async function disconnectAdAccountAction(provider: "meta" | "google" | "tiktok") {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) return { error: "No autorizado" };

  await revokeAdAccount(profile.businessId, provider);
  revalidatePath(MARKETING_RETURN_PATH);
  return { error: null };
}

// ── Piezas (Estrategia → Generar/Aprobar piezas) ─────────────────────────
// Ver docs/marketing-module-plan.md §5 Fase 1 (creativos).

export async function generatePieceAction(strategyId: string): Promise<GeneratePiecesResult> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { ok: false, reason: "provider_error", message: "No autorizado" };
  }

  const limit = checkRateLimit(`generar-pieza:${profile.userId}`, 5, 60 * 1000);
  if (!limit.allowed) {
    return { ok: false, reason: "provider_error", message: `Demasiadas seguidas. Espera ${limit.retryAfterSeconds}s.` };
  }

  const strategy = await getStrategy(profile.businessId, strategyId);
  if (!strategy) return { ok: false, reason: "provider_error", message: "Estrategia no encontrada." };

  const context = await buildBusinessContext(profile.businessId);
  const result = await generatePieceVariants(profile.businessId, strategy, context);
  if (result.ok) revalidatePath(`/admin/marketing/${strategyId}`);
  return result;
}

export async function updatePieceStatusAction(strategyId: string, pieceId: string, status: PieceStatus) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) return { error: "No autorizado" };

  const result = await updatePieceStatus(profile.businessId, pieceId, status);
  revalidatePath(`/admin/marketing/${strategyId}`);
  return result;
}

// ── Publicar en Meta (Fase 2b) ────────────────────────────────────────────
// Se crea SIEMPRE en pausa (PAUSED). Publicar != gastar plata: el admin
// tiene que ver el resumen exacto y confirmar aparte (activateStrategyAction)
// antes de que la campaña quede ACTIVE. Ver docs/marketing-module-plan.md §8.

export type PublishStrategyResult =
  | { ok: true; campaignId: string }
  | { ok: false; reason: "no_ad_account" | "no_page" | "no_piece" | "no_budget" | "meta_error" | "error"; message: string };

export async function publishStrategyAction(strategyId: string): Promise<PublishStrategyResult> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { ok: false, reason: "error", message: "No autorizado" };
  }

  const limit = checkRateLimit(`publicar-estrategia:${profile.userId}`, 5, 60 * 1000);
  if (!limit.allowed) {
    return { ok: false, reason: "error", message: `Demasiados intentos. Espera ${limit.retryAfterSeconds}s.` };
  }

  const strategy = await getStrategy(profile.businessId, strategyId);
  if (!strategy) return { ok: false, reason: "error", message: "Estrategia no encontrada." };
  if (strategy.externalId) {
    return { ok: false, reason: "error", message: "Esta estrategia ya se publicó en Meta." };
  }
  if (!strategy.budgetAmount || strategy.budgetAmount <= 0) {
    return { ok: false, reason: "no_budget", message: "Define un presupuesto antes de publicar." };
  }

  const adAccount = await getActiveAdAccount(profile.businessId, "meta");
  if (!adAccount) {
    return { ok: false, reason: "no_ad_account", message: "Conecta tu cuenta de Meta Ads primero (Marketing → Conexiones)." };
  }
  if (adAccount.currency && adAccount.currency !== strategy.budgetCurrency) {
    return {
      ok: false,
      reason: "error",
      message: `Tu cuenta de Meta Ads factura en ${adAccount.currency}, pero el presupuesto de la estrategia está en ${strategy.budgetCurrency}. Ajusta la estrategia antes de publicar.`,
    };
  }

  const page = await getActiveConnection(profile.businessId, "messenger");
  if (!page) {
    return { ok: false, reason: "no_page", message: "Conecta tu Página de Facebook primero (Perfil → Conectar redes) — el anuncio lleva a una conversación por Messenger." };
  }

  const pieces = await listPieces(profile.businessId, strategyId);
  const piece = pieces.find((p) => p.status === "approved" && p.imagePath);
  if (!piece) {
    return { ok: false, reason: "no_piece", message: "Genera y aprueba al menos una pieza (imagen + copy) antes de publicar." };
  }

  const dailyBudgetMinor = toMinorUnits(strategy.budgetAmount, adAccount.currency ?? strategy.budgetCurrency);
  const startTime = strategy.startsAt ? new Date(strategy.startsAt).toISOString() : new Date().toISOString();
  const endTime = strategy.endsAt ? new Date(strategy.endsAt).toISOString() : null;
  const location = strategy.location as { country?: string } | null;
  const countryCode = location?.country || "CO";

  try {
    const campaign = await createCampaign({
      adAccountId: adAccount.externalAccountId,
      accessToken: adAccount.accessToken,
      name: strategy.name,
    });
    const adset = await createAdSet({
      adAccountId: adAccount.externalAccountId,
      accessToken: adAccount.accessToken,
      campaignId: campaign.id,
      name: `${strategy.name} — Adset`,
      dailyBudgetMinorUnits: dailyBudgetMinor,
      startTime,
      endTime,
      countryCode,
    });
    const creative = await createAdCreative({
      adAccountId: adAccount.externalAccountId,
      accessToken: adAccount.accessToken,
      pageId: page.externalId,
      name: `${strategy.name} — Creativo`,
      headline: piece.headline ?? strategy.name,
      body: piece.body ?? strategy.goal ?? "",
      imageUrl: piecePublicUrl(piece.imagePath!),
    });
    const ad = await createAd({
      adAccountId: adAccount.externalAccountId,
      accessToken: adAccount.accessToken,
      adsetId: adset.id,
      creativeId: creative.id,
      name: `${strategy.name} — Anuncio`,
    });

    await markStrategyPublished(strategyId, {
      campaignId: campaign.id,
      adsetId: adset.id,
      creativeId: creative.id,
      publishedBy: profile.userId,
    });
    await markPieceExternalAd(piece.id, ad.id);

    revalidatePath(`/admin/marketing/${strategyId}`);
    return { ok: true, campaignId: campaign.id };
  } catch (err) {
    if (err instanceof MetaAdsPublishError) {
      console.error(`[publishStrategyAction] error en paso "${err.step}":`, err.message);
      return { ok: false, reason: "meta_error", message: `Meta rechazó el paso "${err.step}": ${err.message}` };
    }
    console.error("[publishStrategyAction] error inesperado:", err);
    return { ok: false, reason: "error", message: "Ocurrió un error inesperado publicando en Meta." };
  }
}

/** El admin ya vio el resumen del gasto y confirma — acá SÍ se activa la
 *  campaña real en Meta (empieza a gastar). Queda logueado quién y cuándo. */
export async function activateStrategyAction(strategyId: string): Promise<{ error: string | null }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) return { error: "No autorizado" };

  const strategy = await getStrategy(profile.businessId, strategyId);
  if (!strategy?.externalId) return { error: "Esta estrategia todavía no se ha publicado en Meta." };

  const adAccount = await getActiveAdAccount(profile.businessId, "meta");
  if (!adAccount) return { error: "La cuenta de Meta Ads ya no está conectada." };

  try {
    await setCampaignStatus(strategy.externalId, adAccount.accessToken, "ACTIVE");
  } catch (err) {
    console.error("[activateStrategyAction] error activando en Meta:", err);
    return { error: "Meta no pudo activar la campaña. Revisa que la cuenta tenga un método de pago válido." };
  }

  await markStrategyActivated(strategyId, profile.userId);
  revalidatePath(`/admin/marketing/${strategyId}`);
  return { error: null };
}

/** Trae las métricas acumuladas de Meta y las guarda como el registro del
 *  día de hoy. El cron diario hace lo mismo para todas las activas; este
 *  botón es para actualizar bajo demanda (y para probar en desarrollo, ya
 *  que el cron solo corre en producción). */
export async function syncStrategyMetricsAction(strategyId: string): Promise<{ error: string | null }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) return { error: "No autorizado" };

  const strategy = await getStrategy(profile.businessId, strategyId);
  if (!strategy?.externalId) return { error: "Esta estrategia todavía no se ha publicado en Meta." };

  const adAccount = await getActiveAdAccount(profile.businessId, "meta");
  if (!adAccount) return { error: "La cuenta de Meta Ads ya no está conectada." };

  let insights;
  try {
    insights = await getCampaignInsights(strategy.externalId, adAccount.accessToken);
  } catch (err) {
    console.error("[syncStrategyMetricsAction] error de Meta:", err);
    return { error: "No se pudieron traer las métricas de Meta." };
  }
  if (!insights) return { error: null }; // sin actividad todavía, no es un error

  const result = await upsertStrategyMetric({
    strategyId,
    businessId: profile.businessId,
    metricDate: new Date().toISOString().slice(0, 10),
    spendCop: insights.spend,
    reach: insights.reach,
    impressions: insights.impressions,
    clicks: insights.clicks,
    source: "meta",
  });

  revalidatePath(`/admin/marketing/${strategyId}`);
  revalidatePath("/admin/marketing");
  return result;
}
