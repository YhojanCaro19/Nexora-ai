// app/(dashboard)/admin/catalogo/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getProducts } from "@/lib/services/productService";
import { getBusinessCountryIso2, getBusinessIndustryType } from "@/lib/services/businessBrandingService";
import { CatalogoPanel } from "./catalogo-panel";

export default async function CatalogoPage() {
  const profile = await getSessionProfile();
  const businessId = profile?.businessId ?? null;
  const products = businessId ? await getProducts(businessId) : [];
  const countryIso2 = businessId ? await getBusinessCountryIso2(businessId) : null;
  const industryType = businessId ? await getBusinessIndustryType(businessId) : null;

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Catálogo
      </h1>
      <CatalogoPanel products={products} countryIso2={countryIso2} industryType={industryType} />
    </div>
  );
}
