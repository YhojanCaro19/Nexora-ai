// app/(dashboard)/superadmin/logs/page.tsx
//
// Reemplaza "Auditoría" — mismo dato de fondo (platform_admin_actions),
// ámbito ampliado: un solo feed con acciones del superadmin, inicios de
// sesión de TODOS los negocios, y altas de cuenta completadas. Ver
// lib/services/platformLogService.ts.
import { getPlatformLogs } from "@/lib/services/platformLogService";
import { LogsPanel } from "./logs-panel";

export default async function LogsPage() {
  const entries = await getPlatformLogs();

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Logs
      </h1>

      {entries.length === 0 ? (
        // Server Component: mismo motivo que en negocios/reportes/consumo —
        // no se le puede pasar un ícono de lucide a un Client Component.
        <p className="text-sm text-center py-16" style={{ color: "var(--nexora-ink-dim)" }}>
          Acá vas a ver todo lo que pasa en la plataforma — inicios de sesión, negocios
          inhabilitados o habilitados, altas de cuenta, solicitudes resueltas — apenas
          ocurra el primer evento.
        </p>
      ) : (
        <LogsPanel entries={entries} />
      )}
    </div>
  );
}
