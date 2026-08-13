// app/(dashboard)/superadmin/negocios/page.tsx
import { getBusinesses } from "@/lib/services/adminService";
import { BusinessesPanel } from "./businesses-panel";

export default async function NegociosPage() {
  const businesses = await getBusinesses();

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Negocios
      </h1>

      {businesses.length === 0 ? (
        // Server Component: no se le puede pasar un ícono de lucide (una
        // referencia a función/objeto) a EmptyStateSection porque es un
        // Client Component — React solo permite cruzar esa frontera con
        // datos planos o elementos ya renderizados. Estado vacío simple,
        // sin ese componente compartido, para no toparse con eso.
        <p className="text-sm text-center py-16" style={{ color: 'var(--nexora-ink-dim)' }}>
          Aquí verás todos los negocios registrados en la plataforma...
        </p>
      ) : (
        <BusinessesPanel businesses={businesses} />
      )}
    </div>
  );
}
