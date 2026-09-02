// app/(dashboard)/admin/reportes/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getBusinessBranding } from "@/lib/services/businessBrandingService";
import { getReportDownloadHistory } from "@/lib/services/reportHistoryService";
import { ReportesPanel } from "./reportes-panel";

export default async function ReportesPage() {
  const profile = await getSessionProfile();
  const branding = profile?.businessId
    ? await getBusinessBranding(profile.businessId)
    : {
        logoUrl: null,
        contactEmail: null,
        contactPhone: null,
        taxId: null,
        address: null,
        instagram: null,
        facebook: null,
        tiktok: null,
        twitter: null,
      };
  const history = profile?.businessId ? await getReportDownloadHistory(profile.businessId) : [];

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Reportes
      </h1>
      <ReportesPanel branding={branding} history={history} />
    </div>
  );
}
