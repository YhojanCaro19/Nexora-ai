// app/(dashboard)/admin/catalogo/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getProducts } from "@/lib/services/productService";
import { ProductForm } from "./product-form";
import { ProductsTable } from "./products-table";

export default async function CatalogoPage() {
  const profile = await getSessionProfile();
  const products = profile?.businessId ? await getProducts(profile.businessId) : [];

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Catálogo
      </h1>
      <ProductForm />
      <ProductsTable products={products} />
    </div>
  );
}
