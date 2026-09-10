// app/(dashboard)/superadmin/registros/page.tsx
//
// Reemplaza "Solicitudes". Ya no se aprueban negocios a mano: el alta la
// dispara el pago en Wompi (ver app/api/webhooks/wompi). Acá el superadmin
// solo VE los registros pendientes/completados y, para soporte, puede
// crear un registro manual (mismo flujo, sin pago) o reenviar el correo.
import { listPendingRegistrations, getPublicPlans } from "@/lib/services/registrationService";
import { RegistrosPanel } from "./registros-panel";

export default async function RegistrosPage() {
  const [registros, plans] = await Promise.all([listPendingRegistrations(), getPublicPlans()]);

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Registros
      </h1>

      <RegistrosPanel
        registros={registros}
        plans={plans.map((p) => ({ key: p.key, name: p.name }))}
      />
    </div>
  );
}
