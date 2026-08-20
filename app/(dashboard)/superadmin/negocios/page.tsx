// app/(dashboard)/superadmin/negocios/page.tsx
import { getBusinesses } from "@/lib/services/adminService";
import { BusinessesPanel } from "./businesses-panel";

export default async function NegociosPage() {
  const businesses = await getBusinesses();

  const activeCount = businesses.filter((b) => b.is_active).length;
  const inactiveCount = businesses.length - activeCount;
  const totalOrders = businesses.reduce((sum, b) => sum + b.orderCount, 0);

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Negocios
      </h1>

      {businesses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { label: "Negocios totales", value: businesses.length },
            { label: "Activos", value: activeCount },
            { label: "Inhabilitados", value: inactiveCount },
            { label: "Pedidos de la plataforma", value: totalOrders },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border p-5 text-center" style={{ borderColor: 'var(--nexora-line)' }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
                {kpi.label}
              </p>
              <p className="mt-1 text-2xl font-semibold font-nexora" style={{ color: 'var(--nexora-ink)' }}>
                {kpi.value.toLocaleString("en-US")}
              </p>
            </div>
          ))}
        </div>
      )}

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
