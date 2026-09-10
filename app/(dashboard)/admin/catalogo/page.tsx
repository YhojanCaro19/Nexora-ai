// app/(dashboard)/admin/catalogo/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getProducts } from "@/lib/services/productService";
import { getProductCategories } from "@/lib/services/productCategoryService";
import {
  getBusinessCountryIso2,
  getBusinessCatalogKind,
} from "@/lib/services/businessBrandingService";
import { CatalogoPanel } from "./catalogo-panel";

export default async function CatalogoPage() {
  const profile = await getSessionProfile();
  const businessId = profile?.businessId ?? null;
  const [products, countryIso2, catalogKind, categories] = await Promise.all([
    businessId ? getProducts(businessId) : Promise.resolve([]),
    businessId ? getBusinessCountryIso2(businessId) : Promise.resolve(null),
    businessId ? getBusinessCatalogKind(businessId) : Promise.resolve("ambos" as const),
    businessId ? getProductCategories(businessId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Catálogo
      </h1>
      <CatalogoPanel
        products={products}
        countryIso2={countryIso2}
        catalogKind={catalogKind}
        categories={categories}
      />
    </div>
  );
}
