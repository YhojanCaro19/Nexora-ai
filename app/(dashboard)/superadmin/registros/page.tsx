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

  const pendientes = registros.filter((r) => r.status === "pending").length;
  const completados = registros.filter((r) => r.status === "completed").length;

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Registros
      </h1>

      {registros.length > 0 && (
        <div className="mx-auto grid max-w-xl grid-cols-3 gap-4">
          {[
            { label: "Total", value: registros.length },
            { label: "Pendientes", value: pendientes },
            { label: "Completados", value: completados },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border p-5 text-center"
              style={{ borderColor: "var(--nexora-line)" }}
            >
              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--nexora-ink-dim)" }}>
                {kpi.label}
              </p>
              <p
                className="mt-1 font-nexora text-2xl font-semibold"
                style={{ color: "var(--nexora-ink)" }}
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <RegistrosPanel
        registros={registros}
        plans={plans.map((p) => ({ key: p.key, name: p.name }))}
      />
    </div>
  );
}
