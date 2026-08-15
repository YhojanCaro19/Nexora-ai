// app/(dashboard)/admin/reportes/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getBusinessBranding } from "@/lib/services/businessBrandingService";
import { ReportesPanel } from "./reportes-panel";

export default async function ReportesPage() {
  const profile = await getSessionProfile();
  const branding = profile?.businessId
    ? await getBusinessBranding(profile.businessId)
    : { logoUrl: null, contactEmail: null, contactPhone: null };

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Reportes
      </h1>
      <ReportesPanel branding={branding} />
    </div>
  );
}
