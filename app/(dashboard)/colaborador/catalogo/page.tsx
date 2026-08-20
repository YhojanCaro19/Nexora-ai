// app/(dashboard)/colaborador/catalogo/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getProducts } from "@/lib/services/productService";
import { getBusinessCountryIso2, getBusinessIndustryType } from "@/lib/services/businessBrandingService";
// Se reutiliza el mismo componente y las mismas server actions que usa
// admin/catalogo — es exactamente la misma funcionalidad, solo que aquí se
// llega con permiso de colaborador en vez de rol admin.
import { CatalogoPanel } from "@/app/(dashboard)/admin/catalogo/catalogo-panel";

export default async function ColaboradorCatalogoPage() {
  const profile = await getSessionProfile();

  if (!profile?.permissions.includes("catalogo")) {
    return (
      <div className="space-y-6">
        <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
          Catálogo
        </h1>
        <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          No tienes acceso a este módulo. Pídele a tu administrador que te lo asigne.
        </p>
      </div>
    );
  }

  const products = profile.businessId ? await getProducts(profile.businessId) : [];
  const countryIso2 = profile.businessId ? await getBusinessCountryIso2(profile.businessId) : null;
  const industryType = profile.businessId ? await getBusinessIndustryType(profile.businessId) : null;

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Catálogo
      </h1>
      <CatalogoPanel products={products} countryIso2={countryIso2} industryType={industryType} />
    </div>
  );
}
