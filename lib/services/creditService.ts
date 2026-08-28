// lib/services/creditService.ts
//
// Lectura del saldo de créditos de un negocio. El saldo real vive en
// `credit_wallets` (plan_balance + topup_balance); el ledger append-only
// `credit_ledger` es la fuente de verdad para auditar.
//
// El descuento y la acreditación NO pasan por acá — van por las funciones
// SQL `deduct_credits` / `grant_credits` (SECURITY DEFINER, solo service
// role), llamadas desde el motor del agente y el webhook de Wompi.
//
// Degrada suave: si el módulo de créditos todavía no está aplicado en la
// DB (o el negocio no tiene wallet), devuelve null en vez de tirar error.
import { createClient } from "@/lib/supabase/server";

export interface CreditBalance {
  /** Saldo total = plan + packs. */
  total: number;
  /** Créditos del plan (vencen cada ciclo). */
  plan: number;
  /** Créditos de packs comprados aparte (no vencen). */
  topup: number;
  /** Cuándo se renuevan los créditos del plan. */
  renewsAt: string | null;
}

export async function getCreditBalance(businessId: string): Promise<CreditBalance | null> {
  const supabase = await createClient();

  // RLS: la policy `wallet_read` permite SELECT a is_business_member().
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
