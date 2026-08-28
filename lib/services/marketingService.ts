// lib/services/marketingService.ts
//
// Capa de datos del módulo Marketing IA. La ESTRATEGIA es la unidad
// principal (objetivo, canal, inversión, fechas, ubicación) y genera
// PIEZAS (imagen + copy) que se aprueban antes de lanzar.
//
// Todo va por el cliente normal — RLS `is_business_admin(business_id)`
// deja al admin del negocio hacer CRUD sobre lo suyo. Cada server action
// que llama acá ya validó rol + businessId de la sesión.
import { createClient } from "@/lib/supabase/server";
import type { StrategyOutput } from "@/lib/services/strategyService";

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

// ── KPIs (agregado de strategy_metrics — hoy devuelve ceros) ─────────────

export interface MarketingKpis {
  spendCop: number;
  salesCount: number;
  reach: number;
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
