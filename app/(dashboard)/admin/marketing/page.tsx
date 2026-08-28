// app/(dashboard)/admin/marketing/page.tsx
//
// "Mis estrategias" — la lista. El rol ya lo validó el layout de /admin.
import { getSessionProfile } from "@/lib/auth/get-session";
import { listStrategies, getMarketingKpis } from "@/lib/services/marketingService";
import { EstrategiasView } from "./estrategias-view";

export default async function MarketingPage() {
  const profile = await getSessionProfile();
  if (!profile?.businessId) return null;

  const [strategies, kpis] = await Promise.all([
    listStrategies(profile.businessId),
    getMarketingKpis(profile.businessId),
  ]);

  return <EstrategiasView strategies={strategies} kpis={kpis} />;
}
