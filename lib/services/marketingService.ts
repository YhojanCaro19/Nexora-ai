// lib/services/marketingService.ts
//
// Capa de datos del módulo Marketing IA. La ESTRATEGIA es la unidad
// principal (objetivo, canal, inversión, fechas, ubicación) y genera
// PIEZAS (imagen + copy) que se aprueban antes de lanzar.
//
// Todo va por el cliente normal — RLS `is_business_admin(business_id)`
// deja al admin del negocio hacer CRUD sobre lo suyo. Cada server action
// que llama acá ya validó rol + businessId de la sesión.
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { StrategyOutput } from "@/lib/services/strategyService";
import type { CampaignReviewResult } from "@/lib/services/campaignReviewService";

export type StrategyStatus =
  | "draft"
  | "ready"
  | "active"
  | "paused"
  | "ended"
  | "archived"
  | "rejected";

export interface MarketingStrategy {
  id: string;
  businessId: string;
  name: string;
  goal: string | null;
  objective: string | null;
  provider: string | null;
  channel: string | null;
  budgetAmount: number | null;
  budgetCurrency: "COP" | "USD";
  budgetPeriod: "daily" | "total";
  language: string;
  location: unknown;
  startsAt: string | null;
  endsAt: string | null;
  wizardAnswers: unknown;
  aiStrategy: StrategyOutput | null;
  status: StrategyStatus;
  externalId: string | null;
  externalStatus: string | null;
  externalAdsetId: string | null;
  externalCreativeId: string | null;
  publishedAt: string | null;
  activatedAt: string | null;
  /** Opinión del media buyer IA sobre esta campaña, generada una sola vez al
   *  publicar (ver campaignReviewService.ts) — nunca bloquea, solo informa
   *  la pantalla de "Confirmar y activar". null si aún no se publicó, o si
   *  la revisión falló/no había créditos (el publish nunca se bloquea por
   *  esto). */
  reviewResult: CampaignReviewResult | null;
  reviewedAt: string | null;
  createdAt: string;
}

function mapStrategy(row: Record<string, unknown>): MarketingStrategy {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    name: row.name as string,
    goal: (row.goal as string) ?? null,
    objective: (row.objective as string) ?? null,
    provider: (row.provider as string) ?? null,
    channel: (row.channel as string) ?? null,
    budgetAmount: (row.budget_amount as number) ?? null,
    budgetCurrency: (row.budget_currency as "COP" | "USD") ?? "COP",
    budgetPeriod: (row.budget_period as "daily" | "total") ?? "daily",
    language: (row.language as string) ?? "es",
    location: row.location ?? null,
    startsAt: (row.starts_at as string) ?? null,
    endsAt: (row.ends_at as string) ?? null,
    wizardAnswers: row.wizard_answers ?? null,
    aiStrategy: (row.ai_strategy as StrategyOutput) ?? null,
    status: (row.status as StrategyStatus) ?? "draft",
    externalId: (row.external_id as string) ?? null,
    externalStatus: (row.external_status as string) ?? null,
    externalAdsetId: (row.external_adset_id as string) ?? null,
    externalCreativeId: (row.external_creative_id as string) ?? null,
    publishedAt: (row.published_at as string) ?? null,
    activatedAt: (row.activated_at as string) ?? null,
    reviewResult: (row.review_result as CampaignReviewResult) ?? null,
    reviewedAt: (row.reviewed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function listStrategies(businessId: string): Promise<MarketingStrategy[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_strategies")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapStrategy);
}

export async function getStrategy(
  businessId: string,
  id: string
): Promise<MarketingStrategy | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_strategies")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapStrategy(data);
}

export interface CreateStrategyInput {
  name: string;
  goal: string;
  objective: string | null;
  provider: string | null;
  channel: string | null;
  budgetAmount: number | null;
  budgetCurrency: "COP" | "USD";
  budgetPeriod: "daily" | "total";
  language: string;
  location: unknown;
  startsAt: string | null;
  endsAt: string | null;
  wizardAnswers: unknown;
  aiStrategy: StrategyOutput | null;
}

export async function createStrategy(
  businessId: string,
  input: CreateStrategyInput
): Promise<{ error: string | null; data: MarketingStrategy | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_strategies")
    .insert({
      business_id: businessId,
      name: input.name,
      goal: input.goal,
      objective: input.objective,
      provider: input.provider,
      channel: input.channel,
      budget_amount: input.budgetAmount,
      budget_currency: input.budgetCurrency,
      budget_period: input.budgetPeriod,
      language: input.language,
      location: input.location,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      wizard_answers: input.wizardAnswers,
      ai_strategy: input.aiStrategy,
      status: "draft",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[createStrategy] error:", error);
    return { error: error?.message ?? "No se pudo crear la estrategia", data: null };
  }
  return { error: null, data: mapStrategy(data) };
}

export async function updateStrategyStatus(
  businessId: string,
  id: string,
  status: StrategyStatus
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("marketing_strategies")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("id", id);

  return { error: error?.message ?? null };
}

// ── Piezas ───────────────────────────────────────────────────────────────

export type PieceStatus = "pending" | "approved" | "rejected";

export interface MarketingPiece {
  id: string;
  strategyId: string;
  kind: "ad" | "image" | "copy";
  imagePath: string | null;
  headline: string | null;
  body: string | null;
  cta: string | null;
  status: PieceStatus;
  aiScore: number | null;
  aiScoreReason: string | null;
  createdAt: string;
}

function mapPiece(row: Record<string, unknown>): MarketingPiece {
  return {
    id: row.id as string,
    strategyId: row.strategy_id as string,
    kind: (row.kind as "ad" | "image" | "copy") ?? "ad",
    imagePath: (row.image_path as string) ?? null,
    headline: (row.headline as string) ?? null,
    body: (row.body as string) ?? null,
    cta: (row.cta as string) ?? null,
    aiScore: (row.ai_score as number) ?? null,
    aiScoreReason: (row.ai_score_reason as string) ?? null,
    status: (row.status as PieceStatus) ?? "pending",
    createdAt: row.created_at as string,
  };
}

export async function listPieces(
  businessId: string,
  strategyId: string
): Promise<MarketingPiece[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_pieces")
    .select("*")
    .eq("business_id", businessId)
    .eq("strategy_id", strategyId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map(mapPiece);
}

export async function updatePieceStatus(
  businessId: string,
  pieceId: string,
  status: PieceStatus
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("marketing_pieces")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("id", pieceId);

  return { error: error?.message ?? null };
}

// ── KPIs (agregado de strategy_metrics — hoy devuelve ceros) ─────────────

export interface MarketingKpis {
  spendCop: number;
  salesCount: number;
  reach: number;
}

// ── Publicación en Meta (Fase 2b) ────────────────────────────────────────
// Siempre admin client: lo llaman los server actions de publicar/activar,
// después de validar rol + ownership de la estrategia con la sesión.

export async function markStrategyPublished(
  strategyId: string,
  input: {
    campaignId: string;
    adsetId: string;
    creativeId: string;
    publishedBy: string;
  }
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("marketing_strategies")
    .update({
      external_id: input.campaignId,
      external_adset_id: input.adsetId,
      external_creative_id: input.creativeId,
      external_status: "PAUSED",
      published_by: input.publishedBy,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", strategyId);
  return { error: error?.message ?? null };
}

export async function markStrategyActivated(
  strategyId: string,
  activatedBy: string
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("marketing_strategies")
    .update({
      status: "active",
      external_status: "ACTIVE",
      activated_by: activatedBy,
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", strategyId);
  return { error: error?.message ?? null };
}

/** Guarda la opinión del media buyer IA (ver campaignReviewService.ts).
 *  Se llama una sola vez, justo al publicar — nunca se regenera solo por
 *  volver a abrir la pantalla de "Confirmar y activar". */
export async function markStrategyReviewed(strategyId: string, review: CampaignReviewResult): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("marketing_strategies")
    .update({
      review_result: review,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", strategyId);
  if (error) console.error("[markStrategyReviewed] error:", error);
}

export async function markPieceExternalAd(pieceId: string, externalAdId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("marketing_pieces")
    .update({ external_ad_id: externalAdId, updated_at: new Date().toISOString() })
    .eq("id", pieceId);
  if (error) console.error("[markPieceExternalAd] error:", error);
}

/** Upsert de una métrica diaria de la estrategia (la escribe el cron o el
 *  botón "Actualizar métricas" — siempre backend, nunca el cliente). */
export async function upsertStrategyMetric(input: {
  strategyId: string;
  businessId: string;
  metricDate: string; // YYYY-MM-DD
  spendCop: number;
  reach: number;
  impressions: number;
  clicks: number;
  salesCount?: number;
  revenueCop?: number;
  source: "meta" | "google" | "tiktok" | "manual";
}): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { error } = await admin.from("strategy_metrics").upsert(
    {
      strategy_id: input.strategyId,
      business_id: input.businessId,
      metric_date: input.metricDate,
      spend_cop: input.spendCop,
      reach: input.reach,
      impressions: input.impressions,
      clicks: input.clicks,
      sales_count: input.salesCount ?? 0,
      revenue_cop: input.revenueCop ?? 0,
      source: input.source,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "strategy_id,metric_date,source" }
  );
  return { error: error?.message ?? null };
}

export interface StrategyMetricsSummary {
  spendCop: number;
  reach: number;
  impressions: number;
  clicks: number;
  lastSyncedAt: string | null;
}

/** Métricas acumuladas (suma de todos los días) de una estrategia puntual. */
export async function getStrategyMetricsSummary(
  businessId: string,
  strategyId: string
): Promise<StrategyMetricsSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategy_metrics")
    .select("spend_cop, reach, impressions, clicks, synced_at")
    .eq("business_id", businessId)
    .eq("strategy_id", strategyId);

  if (error || !data || data.length === 0) {
    return { spendCop: 0, reach: 0, impressions: 0, clicks: 0, lastSyncedAt: null };
  }
  return data.reduce(
    (acc, r) => ({
      spendCop: acc.spendCop + (r.spend_cop ?? 0),
      reach: Math.max(acc.reach, r.reach ?? 0), // reach no se suma entre días (se solapa)
      impressions: acc.impressions + (r.impressions ?? 0),
      clicks: acc.clicks + (r.clicks ?? 0),
      lastSyncedAt: !acc.lastSyncedAt || r.synced_at > acc.lastSyncedAt ? r.synced_at : acc.lastSyncedAt,
    }),
    { spendCop: 0, reach: 0, impressions: 0, clicks: 0, lastSyncedAt: null as string | null }
  );
}

export async function getMarketingKpis(businessId: string): Promise<MarketingKpis> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategy_metrics")
    .select("spend_cop, sales_count, reach")
    .eq("business_id", businessId);

  if (error || !data) return { spendCop: 0, salesCount: 0, reach: 0 };
  return data.reduce(
    (acc, r) => ({
      spendCop: acc.spendCop + (r.spend_cop ?? 0),
      salesCount: acc.salesCount + (r.sales_count ?? 0),
      reach: acc.reach + (r.reach ?? 0),
    }),
    { spendCop: 0, salesCount: 0, reach: 0 }
  );
}
