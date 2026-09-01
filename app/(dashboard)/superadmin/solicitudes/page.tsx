// app/(dashboard)/superadmin/solicitudes/page.tsx
//
// Solicitudes de cambio de cuenta de acceso (Google). El login es 100%
// "Continuar con Google", así que cambiar el correo = cambiar la llave de
// acceso — lo hace el superadmin a mano, después de verificar identidad
// por fuera (llamar al teléfono del registro). Máx. 1 vez al año por
// persona. Ver lib/services/accountChangeService.ts y docs/decisions.md.
import { listAccountChangeRequests } from "@/lib/services/accountChangeService";
import { SolicitudesPanel } from "./solicitudes-panel";

export default async function SolicitudesPage() {
  const requests = await listAccountChangeRequests();
  const pendientes = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Solicitudes
      </h1>
      <p className="text-sm text-center" style={{ color: "var(--nexora-ink-dim)" }}>
        Cambios de cuenta de acceso. Verifica identidad llamando al teléfono del registro antes de aprobar.
      </p>

      {requests.length > 0 && (
        <div className="mx-auto grid max-w-md grid-cols-2 gap-4">
          {[
            { label: "Pendientes", value: pendientes },
            { label: "Total", value: requests.length },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border p-5 text-center"
              style={{ borderColor: "var(--nexora-line)" }}
            >
              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--nexora-ink-dim)" }}>
                {kpi.label}
              </p>
              <p className="mt-1 font-nexora text-2xl font-semibold" style={{ color: "var(--nexora-ink)" }}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <SolicitudesPanel requests={requests} />
    </div>
  );
}
