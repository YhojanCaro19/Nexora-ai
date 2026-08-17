// app/(dashboard)/admin/pedidos/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getOrders } from "@/lib/services/orderService";
import { getBusinessCountryIso2 } from "@/lib/services/businessBrandingService";
import { PedidosPanel } from "./pedidos-panel";

export default async function PedidosPage() {
  const profile = await getSessionProfile();
  const businessId = profile?.businessId ?? null;
  const orders = businessId ? await getOrders(businessId) : [];
  const countryIso2 = businessId ? await getBusinessCountryIso2(businessId) : null;

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Pedidos
      </h1>
      <PedidosPanel orders={orders} countryIso2={countryIso2} isAdmin />
    </div>
  );
}
