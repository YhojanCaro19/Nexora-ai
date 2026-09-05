// lib/types/adAccount.ts
//
// Tipos compartidos del módulo de Marketing — las conexiones OAuth a
// cuentas publicitarias (Meta Ads hoy; Google/TikTok Ads después, mismo
// esquema). Ver docs/marketing-module-plan.md §8.

export const AD_PROVIDERS = ["meta", "google", "tiktok"] as const;
export type AdProvider = (typeof AD_PROVIDERS)[number];

export function isAdProvider(value: string): value is AdProvider {
  return (AD_PROVIDERS as readonly string[]).includes(value);
}

export const AD_PROVIDER_LABELS: Record<AdProvider, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  tiktok: "TikTok Ads",
};

export type AdAccountStatus = "active" | "expired" | "revoked" | "error";

/**
 * Fila de `ad_accounts` SIN el token — es lo único que puede viajar al
 * cliente. El token se descifra aparte, solo en código server.
 */
export interface AdAccountPublic {
  id: string;
  businessId: string;
  provider: AdProvider;
  externalAccountId: string;
  externalName: string | null;
  currency: string | null;
  tokenExpiresAt: string | null;
  status: AdAccountStatus;
  lastError: string | null;
  connectedAt: string;
}
