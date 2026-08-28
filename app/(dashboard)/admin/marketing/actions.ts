"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/get-session";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { generateImage, type ImageQuality, type GenerateImageResult } from "@/lib/services/imageService";
import { generateStrategy, type StrategyWizardAnswers } from "@/lib/services/strategyService";
import { createStrategy, updateStrategyStatus, type StrategyStatus } from "@/lib/services/marketingService";

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

export async function createStrategyAction(
  name: string,
  answers: StrategyWizardAnswers
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
