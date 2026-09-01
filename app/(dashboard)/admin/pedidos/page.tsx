// app/(dashboard)/admin/pedidos/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getOrders } from "@/lib/services/orderService";
import { getBusinessCountryIso2, getBusinessIndustryType } from "@/lib/services/businessBrandingService";
import { getBookingSettings } from "@/lib/services/bookingConfigService";
import { PedidosPanel } from "./pedidos-panel";

export default async function PedidosPage() {
  const profile = await getSessionProfile();
  const businessId = profile?.businessId ?? null;
  const [orders, countryIso2, industryType, bookingSettings] = businessId
    ? await Promise.all([
        getOrders(businessId),
        getBusinessCountryIso2(businessId),
        getBusinessIndustryType(businessId),
        getBookingSettings(businessId),
      ])
    : [[], null, null, null];

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Pedidos
      </h1>
      <PedidosPanel
        orders={orders}
        countryIso2={countryIso2}
        industryType={industryType}
        bookingMode={bookingSettings?.mode ?? "off"}
        isAdmin
      />
    </div>
  );
}
