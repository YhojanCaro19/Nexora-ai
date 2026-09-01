// app/(dashboard)/admin/reservas/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getBookingConfig } from "@/lib/services/bookingConfigService";
import { getUpcomingReservations } from "@/lib/services/reservationService";
import { getBusinessCountryIso2 } from "@/lib/services/businessBrandingService";
import { getProducts } from "@/lib/services/productService";
import { ReservasPanel } from "./reservas-panel";

export default async function ReservasPage() {
  const profile = await getSessionProfile();
  const businessId = profile?.businessId ?? null;

  const [config, upcoming, countryIso2, products] = businessId
    ? await Promise.all([
        getBookingConfig(businessId),
        getUpcomingReservations(businessId, 100),
        getBusinessCountryIso2(businessId),
        getProducts(businessId),
      ])
    : [null, [], null, []];

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Reservas
      </h1>
      <ReservasPanel
        config={config}
        upcoming={upcoming}
        countryIso2={countryIso2}
        products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, active: p.active }))}
      />
    </div>
  );
}
