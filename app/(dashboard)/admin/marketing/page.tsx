// app/(dashboard)/admin/marketing/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getMarketingImages } from "@/lib/services/marketingImageService";
import { MarketingPanel } from "./marketing-panel";

export default async function MarketingPage() {
  const profile = await getSessionProfile();
  if (!profile || !profile.businessId) return null;

  const images = await getMarketingImages(profile.businessId);

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Marketing
      </h1>
      <MarketingPanel images={images} />
    </div>
  );
}
