// app/(dashboard)/admin/marketing/[id]/page.tsx
import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/get-session";
import { getStrategy, listPieces, getStrategyMetricsSummary } from "@/lib/services/marketingService";
import { getActiveAdAccount } from "@/lib/services/adAccountService";
import { piecePublicUrl } from "@/lib/services/creativeService";
import { StrategyDetail } from "./strategy-detail";

export default async function StrategyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getSessionProfile();
  if (!profile?.businessId) return null;

  const strategy = await getStrategy(profile.businessId, id);
  if (!strategy) notFound();

  const [rawPieces, adAccount, metrics] = await Promise.all([
    listPieces(profile.businessId, id),
    getActiveAdAccount(profile.businessId, "meta"),
    getStrategyMetricsSummary(profile.businessId, id),
  ]);
  const pieces = rawPieces.map((p) => ({
    ...p,
    imageUrl: p.imagePath ? piecePublicUrl(p.imagePath) : null,
  }));

  return (
    <StrategyDetail
      strategy={strategy}
      pieces={pieces}
      hasAdAccount={Boolean(adAccount)}
      adAccountCurrency={adAccount?.currency ?? null}
      metrics={metrics}
    />
  );
}
