// app/(dashboard)/colaborador/pedidos/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getOrders } from "@/lib/services/orderService";
// Se reutiliza el mismo componente y las mismas server actions que usa
// admin/pedidos — es exactamente la misma funcionalidad, solo que aquí se
// llega con permiso de colaborador en vez de rol admin.
import { OrdersTable } from "@/app/(dashboard)/admin/pedidos/orders-table";

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

  const orders = profile.businessId ? await getOrders(profile.businessId) : [];

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Pedidos
      </h1>
      <OrdersTable orders={orders} />
    </div>
  );
}
