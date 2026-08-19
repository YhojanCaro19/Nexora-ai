// app/(dashboard)/admin/clientes/page.tsx
//
// El rol y el mustChangePassword ya se validan en el layout compartido de
// admin/ (app/(dashboard)/admin/layout.tsx) — no hace falta un layout
// nuevo acá. businessId sale de la sesión, nunca de la URL o de un input.
import { getSessionProfile } from "@/lib/auth/get-session";
import { getCustomersForBusiness } from "@/lib/services/customerService";
import { getBusinessCountryIso2 } from "@/lib/services/businessBrandingService";
import { ClientesPanel } from "./clientes-panel";

export default async function ClientesPage() {
  const profile = await getSessionProfile();
  const businessId = profile?.businessId ?? null;
  const [customers, countryIso2] = await Promise.all([
    businessId ? getCustomersForBusiness(businessId) : Promise.resolve([]),
    businessId ? getBusinessCountryIso2(businessId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Clientes
      </h1>
      <ClientesPanel customers={customers} countryIso2={countryIso2} />
    </div>
  );
}
