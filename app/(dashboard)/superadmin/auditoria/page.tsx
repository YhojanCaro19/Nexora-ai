// app/(dashboard)/superadmin/auditoria/page.tsx
import { getPlatformAdminActions } from "@/lib/services/auditLogService";
import { AuditLogPanel } from "./audit-log-panel";

export default async function AuditoriaPage() {
  const entries = await getPlatformAdminActions();

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Auditoría
      </h1>

      {entries.length === 0 ? (
        // Server Component: mismo motivo que en negocios/reportes/consumo —
        // no se le puede pasar un ícono de lucide a un Client Component.
        <p className="text-sm text-center py-16" style={{ color: 'var(--nexora-ink-dim)' }}>
          Acá vas a ver quién inhabilitó o habilitó un negocio, y quién aprobó o rechazó una
          solicitud — apenas ocurra la primera acción.
        </p>
      ) : (
        <AuditLogPanel entries={entries} />
      )}
    </div>
  );
}
