// app/(dashboard)/admin/pedidos/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getOrders } from "@/lib/services/orderService";
import { getProducts } from "@/lib/services/productService";
import { OrderForm } from "./order-form";
import { OrdersTable } from "./orders-table";

export default async function PedidosPage() {
  const profile = await getSessionProfile();
  const [orders, products] = profile?.businessId
    ? await Promise.all([getOrders(profile.businessId), getProducts(profile.businessId)])
    : [[], []];

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Pedidos
      </h1>
      <OrderForm products={products} />
      <OrdersTable orders={orders} />
    </div>
  );
}
