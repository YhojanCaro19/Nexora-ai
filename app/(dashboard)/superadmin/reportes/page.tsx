// app/(dashboard)/superadmin/reportes/page.tsx
import { getAutoReportSendLog } from "@/lib/services/reportHistoryService";
import { ReportLogPanel } from "./report-log-panel";

export default async function SuperadminReportesPage() {
  const entries = await getAutoReportSendLog();

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Envíos automáticos de reportes
      </h1>

      {entries.length === 0 ? (
        // Server Component: mismo motivo que negocios/page.tsx — no se le
        // puede pasar un ícono de lucide a un Client Component como prop.
        <p className="text-sm text-center py-16" style={{ color: 'var(--nexora-ink-dim)' }}>
          Acá vas a ver cada vez que un negocio recibe (o falla en recibir) su reporte diario
          automático, apenas empiece a correr el cron en producción.
        </p>
      ) : (
        <ReportLogPanel entries={entries} />
      )}
    </div>
  );
}
