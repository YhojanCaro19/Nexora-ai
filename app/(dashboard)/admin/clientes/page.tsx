// app/(dashboard)/admin/clientes/page.tsx
//
// El rol y el mustChangePassword ya se validan en el layout compartido de
// admin/ (app/(dashboard)/admin/layout.tsx) — no hace falta un layout
// nuevo acá. businessId sale de la sesión, nunca de la URL o de un input.
import { getSessionProfile } from "@/lib/auth/get-session";
import { getCustomersForBusiness } from "@/lib/services/customerService";
import { getBusinessCountryIso2 } from "@/lib/services/businessBrandingService";
import { getTagsForCustomers } from "@/lib/services/tagService";
import { ClientesPanel } from "./clientes-panel";

export default async function ClientesPage() {
  const profile = await getSessionProfile();
  const businessId = profile?.businessId ?? null;
  const [customers, countryIso2] = await Promise.all([
    businessId ? getCustomersForBusiness(businessId) : Promise.resolve([]),
    businessId ? getBusinessCountryIso2(businessId) : Promise.resolve(null),
  ]);
  // getTagsForCustomers() devuelve un Map, pero un Map no serializa limpio
  // cruzando de Server a Client Component (Next.js lo intenta pasar como
  // objeto plano vía la serialización de Server Actions/props y se pierde
  // — el cliente recibiría {} en vez del Map real). Se convierte acá a
  // pares [customerId, Tag[]] para que ClientesPanel lo reconstruya con
  // `new Map(...)` del lado del cliente.
  const tagsByCustomer = businessId
    ? [...(await getTagsForCustomers(businessId, customers.map((c) => c.id)))]
    : [];

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Clientes
      </h1>
      <ClientesPanel customers={customers} countryIso2={countryIso2} tagsByCustomer={tagsByCustomer} />
    </div>
  );
}
