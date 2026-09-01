// app/(dashboard)/admin/reservas/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getBookingConfig } from "@/lib/services/bookingConfigService";
import { getUpcomingReservations } from "@/lib/services/reservationService";
import { getBusinessCountryIso2 } from "@/lib/services/businessBrandingService";
import { ReservasPanel } from "./reservas-panel";

export default async function ReservasPage() {
  const profile = await getSessionProfile();
  const businessId = profile?.businessId ?? null;

  const [config, upcoming, countryIso2] = businessId
    ? await Promise.all([
        getBookingConfig(businessId),
        getUpcomingReservations(businessId, 100),
        getBusinessCountryIso2(businessId),
      ])
    : [null, [], null];

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Reservas
      </h1>
      <ReservasPanel config={config} upcoming={upcoming} countryIso2={countryIso2} />
    </div>
  );
}
