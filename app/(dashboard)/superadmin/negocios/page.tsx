// app/(dashboard)/superadmin/negocios/page.tsx
import { Building2 } from "lucide-react";
import { EmptyStateSection } from "@/components/dashboard/shared/EmptyStateSection";
import { getBusinesses } from "@/lib/services/adminService";
import { BusinessesPanel } from "./businesses-panel";

export default async function NegociosPage() {
  const businesses = await getBusinesses();

  if (businesses.length === 0) {
    return (
      <EmptyStateSection
        icon={Building2}
        title="Negocios"
        description="Aquí verás todos los negocios registrados en la plataforma..."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Negocios
      </h1>

      <BusinessesPanel businesses={businesses} />
    </div>
  );
}
