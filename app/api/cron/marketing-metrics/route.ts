// app/api/cron/marketing-metrics/route.ts
//
// Sincroniza las métricas de Meta Ads (gasto, alcance, impresiones, clics)
// de todas las estrategias activas, una vez al día. Vercel Cron llama esta
// ruta cada hora (ver vercel.json); acá se decide, por estrategia, si ya se
// sincronizó hoy — si ya se hizo, se salta (no tiene sentido pegarle a la
// API de Meta cada hora por lo mismo).
//
// Mismo esquema de protección que los demás crons: exige
// `Authorization: Bearer $CRON_SECRET` (lo agrega Vercel automáticamente).
// Sin CRON_SECRET configurada, rechaza cualquier llamada.
//
// El botón "Actualizar métricas" del panel (syncStrategyMetricsAction) hace
// exactamente lo mismo bajo demanda — este cron es la versión automática
// para producción (los crons no corren en local, ver CLAUDE.md).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCampaignInsights } from "@/lib/services/metaMarketingClient";
import { decryptToken } from "@/lib/utils/tokenCrypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

interface StrategyRow {
  id: string;
  business_id: string;
  external_id: string;
}

interface AdAccountRow {
  business_id: string;
  access_token: string;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: strategies, error: strategiesError } = await admin
    .from("marketing_strategies")
    .select("id, business_id, external_id")
    .eq("status", "active")
    .not("external_id", "is", null);

  if (strategiesError) {
    console.error("[GET /api/cron/marketing-metrics] error leyendo estrategias:", strategiesError);
    return NextResponse.json({ error: "No se pudo leer la lista de estrategias" }, { status: 500 });
  }

  let due = 0;
  let synced = 0;
  let skippedAlreadySynced = 0;
  let failed = 0;

  for (const strategy of (strategies as StrategyRow[]) ?? []) {
    due++;

    // Ya se sincronizó hoy — no repetir en cada pasada de la hora.
    const { data: existing } = await admin
      .from("strategy_metrics")
      .select("id")
      .eq("strategy_id", strategy.id)
      .eq("metric_date", today)
      .eq("source", "meta")
      .maybeSingle();
    if (existing) {
      skippedAlreadySynced++;
      continue;
    }

    try {
      const { data: adAccount } = await admin
        .from("ad_accounts")
        .select("business_id, access_token")
        .eq("business_id", strategy.business_id)
        .eq("provider", "meta")
        .eq("status", "active")
        .maybeSingle();

      const row = adAccount as AdAccountRow | null;
      if (!row) {
        failed++;
        continue;
      }

      const accessToken = decryptToken(row.access_token);
      const insights = await getCampaignInsights(strategy.external_id, accessToken);
      if (!insights) continue; // sin actividad todavía, no es un fallo

      const { error: upsertError } = await admin.from("strategy_metrics").upsert(
        {
          strategy_id: strategy.id,
          business_id: strategy.business_id,
          metric_date: today,
          spend_cop: insights.spend,
          reach: insights.reach,
          impressions: insights.impressions,
          clicks: insights.clicks,
          source: "meta",
          synced_at: new Date().toISOString(),
        },
        { onConflict: "strategy_id,metric_date,source" }
      );
      if (upsertError) {
        failed++;
        continue;
      }

      synced++;
    } catch (err) {
      failed++;
      console.error(`[GET /api/cron/marketing-metrics] error en estrategia ${strategy.id}:`, err);
    }
  }

  return NextResponse.json({ due, synced, skippedAlreadySynced, failed });
}
