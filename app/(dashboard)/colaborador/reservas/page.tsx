// app/(dashboard)/colaborador/reservas/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getBookingConfig } from "@/lib/services/bookingConfigService";
import { getUpcomingReservations } from "@/lib/services/reservationService";
import { getBusinessCountryIso2 } from "@/lib/services/businessBrandingService";
import { getProducts } from "@/lib/services/productService";
// Se reutiliza el mismo componente y las mismas server actions que usa
// admin/reservas — es exactamente la misma funcionalidad, solo que aquí se
// llega con permiso de colaborador en vez de rol admin. Si el negocio no
// agenda (booking_settings.mode === 'off'), ReservasPanel ya trae su propio
// empty-state, igual que en admin.
import { ReservasPanel } from "@/app/(dashboard)/admin/reservas/reservas-panel";

export default async function ColaboradorReservasPage() {
  const profile = await getSessionProfile();

  if (!profile?.permissions.includes("reservas")) {
    return (
      <div className="space-y-6">
        <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
          Reservas
        </h1>
        <p className="text-sm text-center" style={{ color: "var(--nexora-ink-dim)" }}>
          No tienes acceso a este módulo. Pídele a tu administrador que te lo asigne.
        </p>
      </div>
    );
  }

  const businessId = profile.businessId ?? null;

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
