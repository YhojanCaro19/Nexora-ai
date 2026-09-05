// lib/services/metaMarketingClient.ts
//
// Wrapper fino sobre la Marketing API de Meta — crea la campaña real
// (campaign → adset → creative → ad) y trae las métricas (insights).
// Reusa graphGet/graphPost/GraphApiError de metaGraphClient.ts.
//
// DECISIÓN v1: toda campaña se publica como "Click-to-Messenger" —
// el anuncio lleva a `https://m.me/<page_id>`, donde responde el agente
// de AVENTHRA. Es el único flujo que coincide con lo que el agente sabe
// hacer hoy (conversar); no importa qué objetivo eligió el admin en el
// wizard (awareness/tráfico/leads/ventas) — esa elección hoy solo influye
// en el copy que genera la IA, no en el tipo de campaña real en Meta.
// Ampliar a tráfico a un sitio propio o formularios de leads es una fase
// futura, cuando cada negocio tenga su propia landing.
//
// Presupuesto: Meta pide el monto en la unidad MENOR de la moneda de la
// cuenta publicitaria (centavos), EXCEPTO monedas "zero-decimal" (COP
// incluida) donde va tal cual. Ver `toMinorUnits`.
//
// Solo código server. Ver docs/marketing-module-plan.md §8.
import { graphGet, graphPost, GraphApiError } from "@/lib/services/metaGraphClient";

// Monedas sin decimales según la documentación de Meta (lista no exhaustiva,
// cubre las relevantes para AVENTHRA: COP, y las más comunes de la región).
const ZERO_DECIMAL_CURRENCIES = new Set([
  "COP",
  "CLP",
  "PYG",
  "JPY",
  "KRW",
  "VND",
  "HUF",
  "TWD",
]);

export function toMinorUnits(amount: number, currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);
}

export class MetaAdsPublishError extends Error {
  readonly step: string;
  constructor(step: string, message: string) {
    super(message);
    this.name = "MetaAdsPublishError";
    this.step = step;
  }
}

async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof GraphApiError) {
      throw new MetaAdsPublishError(name, err.message);
    }
    throw new MetaAdsPublishError(name, err instanceof Error ? err.message : "Error desconocido");
  }
}

export interface CreateCampaignInput {
  adAccountId: string; // "act_1234567890"
  accessToken: string;
  name: string;
}

export async function createCampaign(input: CreateCampaignInput): Promise<{ id: string }> {
  return step("campaign", () =>
    graphPost<{ id: string }>(
      `${input.adAccountId}/campaigns`,
      {
        name: input.name,
        objective: "OUTCOME_ENGAGEMENT",
        status: "PAUSED",
        special_ad_categories: [],
      },
      input.accessToken
    )
  );
}

export interface CreateAdSetInput {
  adAccountId: string;
  accessToken: string;
  campaignId: string;
  name: string;
  /** Monto ya en la unidad menor de la moneda de la cuenta (ver toMinorUnits). */
  dailyBudgetMinorUnits: number;
  startTime: string; // ISO
  endTime: string | null; // ISO o null = sin fecha de fin
  /** Código de país ISO-3166 alpha-2, ej. "CO". */
  countryCode: string;
}

export async function createAdSet(input: CreateAdSetInput): Promise<{ id: string }> {
  return step("adset", () =>
    graphPost<{ id: string }>(
      `${input.adAccountId}/adsets`,
      {
        name: input.name,
        campaign_id: input.campaignId,
        daily_budget: input.dailyBudgetMinorUnits,
        billing_event: "IMPRESSIONS",
        optimization_goal: "CONVERSATIONS",
        destination_type: "MESSENGER",
        targeting: {
          geo_locations: { countries: [input.countryCode] },
          age_min: 18,
        },
        status: "PAUSED",
        start_time: input.startTime,
        ...(input.endTime ? { end_time: input.endTime } : {}),
      },
      input.accessToken
    )
  );
}

export interface CreateAdCreativeInput {
  adAccountId: string;
  accessToken: string;
  pageId: string;
  name: string;
  headline: string;
  body: string;
  /** URL pública de la imagen (bucket `marketing`, público). */
  imageUrl: string;
}

export async function createAdCreative(
  input: CreateAdCreativeInput
): Promise<{ id: string }> {
  return step("creative", () =>
    graphPost<{ id: string }>(
      `${input.adAccountId}/adcreatives`,
      {
        name: input.name,
        object_story_spec: {
          page_id: input.pageId,
          link_data: {
            message: input.body,
            name: input.headline,
            link: `https://m.me/${input.pageId}`,
            picture: input.imageUrl,
            call_to_action: { type: "MESSAGE_PAGE" },
          },
        },
      },
      input.accessToken
    )
  );
}

export interface CreateAdInput {
  adAccountId: string;
  accessToken: string;
  adsetId: string;
  creativeId: string;
  name: string;
}

export async function createAd(input: CreateAdInput): Promise<{ id: string }> {
  return step("ad", () =>
    graphPost<{ id: string }>(
      `${input.adAccountId}/ads`,
      {
        name: input.name,
        adset_id: input.adsetId,
        creative: { creative_id: input.creativeId },
        status: "PAUSED",
      },
      input.accessToken
    )
  );
}

/** Cambia el status de la campaña (PAUSED ↔ ACTIVE). Es el paso de
 *  "confirmar y activar" — el admin ya vio el resumen del gasto. */
export async function setCampaignStatus(
  campaignId: string,
  accessToken: string,
  status: "ACTIVE" | "PAUSED"
): Promise<void> {
  await step("status", () => graphPost<{ success: boolean }>(campaignId, { status }, accessToken));
}

export interface CampaignInsights {
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  /** Conteo de "mensajes iniciados" si Meta lo reporta en `actions`. */
  conversations: number;
}

/** Métricas acumuladas de la campaña a la fecha (sin rango = "lifetime"). */
export async function getCampaignInsights(
  campaignId: string,
  accessToken: string
): Promise<CampaignInsights | null> {
  interface InsightsRow {
    impressions?: string;
    reach?: string;
    clicks?: string;
    spend?: string;
    actions?: { action_type: string; value: string }[];
  }
  const res = await step("insights", () =>
    graphGet<{ data?: InsightsRow[] }>(`${campaignId}/insights`, {
      fields: "impressions,reach,clicks,spend,actions",
      access_token: accessToken,
    })
  );
  const row = res.data?.[0];
  if (!row) return null;

  const conversations =
    row.actions?.find((a) => a.action_type === "onsite_conversion.messaging_conversation_started_7d")
      ?.value ?? "0";

  return {
    impressions: Number(row.impressions ?? 0),
    reach: Number(row.reach ?? 0),
    clicks: Number(row.clicks ?? 0),
    spend: Number(row.spend ?? 0),
    conversations: Number(conversations),
  };
}
