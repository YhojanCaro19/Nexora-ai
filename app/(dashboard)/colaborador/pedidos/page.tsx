// app/(dashboard)/colaborador/pedidos/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getOrders } from "@/lib/services/orderService";
import { getBusinessCountryIso2, getBusinessIndustryType } from "@/lib/services/businessBrandingService";
// Se reutiliza el mismo componente y las mismas server actions que usa
// admin/pedidos — es exactamente la misma funcionalidad, solo que aquí se
// llega con permiso de colaborador en vez de rol admin. isAdmin=false
// hace que PedidosPanel nunca muestre "Pedidos rechazados" acá.
import { PedidosPanel } from "@/app/(dashboard)/admin/pedidos/pedidos-panel";

export default async function ColaboradorPedidosPage() {
  const profile = await getSessionProfile();

  if (!profile?.permissions.includes("pedidos")) {
    return (
      <div className="space-y-6">
        <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
          Pedidos
        </h1>
        <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          No tienes acceso a este módulo. Pídele a tu administrador que te lo asigne.
        </p>
      </div>
    );
  }

  const [orders, countryIso2, industryType] = profile.businessId
    ? await Promise.all([
        getOrders(profile.businessId),
        getBusinessCountryIso2(profile.businessId),
        getBusinessIndustryType(profile.businessId),
      ])
    : [[], null, null];

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Pedidos
      </h1>
      <PedidosPanel orders={orders} countryIso2={countryIso2} industryType={industryType} isAdmin={false} />
    </div>
  );
}
