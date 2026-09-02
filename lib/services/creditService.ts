// lib/services/creditService.ts
//
// Créditos de un negocio. Lecturas van por el cliente normal (RLS:
// `wallet_read` / `ledger_read`). Las escrituras — descontar y acreditar —
// van por las funciones SQL `deduct_credits` / `grant_credits`
// (SECURITY DEFINER, solo `service_role`), llamadas desde el motor del
// agente y el webhook de Wompi.
//
// Todo degrada suave: si el módulo de créditos no está aplicado en la DB,
// las lecturas devuelven null y las escrituras lanzan (que el llamador
// atrapa) — nunca rompen la conversación del agente.
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface CreditBalance {
  total: number;
  plan: number;
  topup: number;
  renewsAt: string | null;
}

export async function getCreditBalance(businessId: string): Promise<CreditBalance | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_wallets")
    .select("plan_balance, topup_balance, plan_renews_at")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    total: data.plan_balance + data.topup_balance,
    plan: data.plan_balance,
    topup: data.topup_balance,
    renewsAt: data.plan_renews_at ?? null,
  };
}

// Lo que el plan incluye cada ciclo (cupos v5) + topes de estructura.
// Se hereda tal cual de la tabla `plans` que administra el superadmin.
export interface PlanEntitlements {
  monthlyCredits: number;
  agentConversations: number;
  campaigns: number;
  images: number;
  maxBusinesses: number;
  maxCollaborators: number | null;
}

export interface BillingSummary {
  planName: string | null;
  planKey: string | null;
  renewsAt: string | null;
  credits: { total: number; plan: number; topup: number } | null;
  entitlements: PlanEntitlements | null;
}

// Resumen de plan + créditos para la pantalla de Perfil. Degrada suave:
// si no hay wallet (módulo de créditos sin aplicar), devuelve null.
export async function getBillingSummary(businessId: string): Promise<BillingSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_wallets")
    .select("plan_balance, topup_balance, plan_renews_at, plan_key")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data) return null;

  let planName: string | null = null;
  let entitlements: PlanEntitlements | null = null;
  if (data.plan_key) {
    const { data: plan } = await supabase
      .from("plans")
      .select(
        "name, monthly_credits, included_agent_conversations, included_campaigns, included_images, max_businesses, max_collaborators"
      )
      .eq("key", data.plan_key)
      .maybeSingle();
    const p = plan as
      | {
          name: string;
          monthly_credits: number | null;
          included_agent_conversations: number | null;
          included_campaigns: number | null;
          included_images: number | null;
          max_businesses: number | null;
          max_collaborators: number | null;
        }
      | null;
    planName = p?.name ?? data.plan_key;
    if (p) {
      entitlements = {
        monthlyCredits: p.monthly_credits ?? 0,
        agentConversations: p.included_agent_conversations ?? 0,
        campaigns: p.included_campaigns ?? 0,
        images: p.included_images ?? 0,
        maxBusinesses: p.max_businesses ?? 1,
        maxCollaborators: p.max_collaborators ?? null,
      };
    }
  }

  return {
    planName,
    planKey: data.plan_key ?? null,
    renewsAt: data.plan_renews_at ?? null,
    credits: {
      total: data.plan_balance + data.topup_balance,
      plan: data.plan_balance,
      topup: data.topup_balance,
    },
    entitlements,
  };
}

/** Costo en créditos de una acción. null si no está configurada o el módulo no está aplicado. */
export async function getCreditPrice(actionKey: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_prices")
    .select("credits")
    .eq("action_key", actionKey)
    .maybeSingle();

  if (error || !data) return null;
  return data.credits;
}

export interface CreditLedgerEntry {
  id: string;
  delta: number;
  bucket: "plan" | "topup";
  reason: string;
  refType: string | null;
  balanceAfter: number;
  createdAt: string;
}

export async function getCreditHistory(
  businessId: string,
  limit = 50
): Promise<CreditLedgerEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("id, delta, bucket, reason, ref_type, balance_after, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    delta: r.delta,
    bucket: r.bucket as "plan" | "topup",
    reason: r.reason,
    refType: r.ref_type ?? null,
    balanceAfter: r.balance_after,
    createdAt: r.created_at,
  }));
}

/**
 * Descuenta créditos vía la función SQL atómica.
 *   → number: nuevo saldo total
 *   → null: saldo insuficiente (no se descontó nada), O el módulo no está aplicado
 *   → throw: estado imposible (negocio sin wallet)
 */
export async function deductCredits(
  businessId: string,
  amount: number,
  reason: string,
  refType?: string,
  refId?: string
): Promise<number | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("deduct_credits", {
    p_business_id: businessId,
    p_amount: amount,
    p_reason: reason,
    p_ref_type: refType ?? null,
    p_ref_id: refId ?? null,
  });

  if (error) {
    // Módulo aún no aplicado (función inexistente) → tratamos como "sin
    // enforcement" en vez de romper. Cualquier otro error sí se propaga.
    if (error.code === "PGRST202" || /function .*deduct_credits.* does not exist/i.test(error.message)) {
      return null;
    }
    console.error("[deductCredits] error:", error);
    throw new Error(error.message);
  }

  return (data as number | null) ?? null;
}

/** Acredita créditos (compra de plan/pack, ajuste manual). Devuelve el saldo total. */
export async function grantCredits(
  businessId: string,
  amount: number,
  bucket: "plan" | "topup",
  reason: string,
  refType?: string,
  refId?: string
): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("grant_credits", {
    p_business_id: businessId,
    p_amount: amount,
    p_bucket: bucket,
    p_reason: reason,
    p_ref_type: refType ?? null,
    p_ref_id: refId ?? null,
  });

  if (error) {
    console.error("[grantCredits] error:", error);
    throw new Error(error.message);
  }
  return data as number;
}
