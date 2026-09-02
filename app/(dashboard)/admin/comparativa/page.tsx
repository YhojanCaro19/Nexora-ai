// app/(dashboard)/admin/comparativa/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getBusinessCountryIso2 } from "@/lib/services/businessBrandingService";
import { SalesComparison } from "./sales-comparison";

export default async function ComparativaPage() {
  const profile = await getSessionProfile();
  const countryIso2 = profile?.businessId
    ? await getBusinessCountryIso2(profile.businessId)
    : null;

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Comparativa por período
      </h1>
      <SalesComparison countryIso2={countryIso2} />
    </div>
  );
}
