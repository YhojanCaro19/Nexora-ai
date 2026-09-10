// app/(dashboard)/colaborador/clientes/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getCustomersForBusiness } from "@/lib/services/customerService";
import { getBusinessCountryIso2 } from "@/lib/services/businessBrandingService";
// Se reutiliza el mismo componente y las mismas server actions que usa
// admin/clientes — es exactamente la misma funcionalidad, solo que aquí se
// llega con permiso de colaborador en vez de rol admin.
import { ClientesPanel } from "@/app/(dashboard)/admin/clientes/clientes-panel";

export default async function ColaboradorClientesPage() {
  const profile = await getSessionProfile();

  if (!profile?.permissions.includes("clientes")) {
    return (
      <div className="space-y-6">
        <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
          Clientes
        </h1>
        <p className="text-sm text-center" style={{ color: "var(--nexora-ink-dim)" }}>
          No tienes acceso a este módulo. Pídele a tu administrador que te lo asigne.
        </p>
      </div>
    );
  }

  const businessId = profile.businessId ?? null;
  const [customers, countryIso2] = await Promise.all([
    businessId ? getCustomersForBusiness(businessId) : Promise.resolve([]),
    businessId ? getBusinessCountryIso2(businessId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Clientes
      </h1>
      <ClientesPanel customers={customers} countryIso2={countryIso2} />
    </div>
  );
}
