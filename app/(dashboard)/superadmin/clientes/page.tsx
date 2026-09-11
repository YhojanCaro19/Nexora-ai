// app/(dashboard)/superadmin/clientes/page.tsx
//
// Trazabilidad de "clientes de AVENTHRA" (los negocios que pagan la
// plataforma, no los clientes finales de cada negocio — ese es
// admin/clientes). Número grande arriba (usuarios activos) + desglose por
// plan y estados que hacen falta bajando la página.
import { Building2, AlertTriangle, FlaskConical, PowerOff, History, type LucideIcon } from "lucide-react";
import { getClientsOverview } from "@/lib/services/adminService";
import { AventhraIconGradientDef } from "@/components/dashboard/shared/ModuleChooser";

const fmt = (n: number) => n.toLocaleString("en-US");
const fmtCop = (cents: number) => `$${Math.round(cents / 100).toLocaleString("es-CO")} COP/mes`;

// Sin card de fondo ni círculo detrás del ícono — el ícono va trazado con
// el mismo degradado de marca que Agentes (aventhra-grad-icon, requiere
// <AventhraIconGradientDef /> montado una vez en la página).
function TraceStat({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="aventhra-grad-icon">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--nexora-ink)" }}>
        {value}
      </p>
      <p className="text-xs leading-snug" style={{ color: "var(--nexora-ink-dim)" }}>
        {label}
      </p>
    </div>
  );
}

export default async function ClientesPage() {
  const overview = await getClientsOverview();

  return (
    <div className="space-y-10">
      <AventhraIconGradientDef />
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Clientes
      </h1>

      {/* ---- Número grande: usuarios activos, color de marca (mismo degradado que el wordmark de la landing) ---- */}
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="aventhra-iridescent font-nexora text-6xl font-semibold tabular-nums">
          {fmt(overview.activeCount)}
        </p>
        <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          usuarios activos
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-12">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-center" style={{ color: "var(--nexora-ink-dim)" }}>
            Por plan
          </h2>
          {overview.byPlan.length === 0 ? (
            <p className="text-sm text-center" style={{ color: "var(--nexora-ink-dim)" }}>
              No hay planes activos configurados.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {overview.byPlan.map((p) => (
                <TraceStat
                  key={p.key}
                  icon={Building2}
                  value={fmt(p.count)}
                  label={`${p.name} · ${fmtCop(p.priceMonthlyCop)}`}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 mt-6">
          <h2 className="text-sm font-semibold text-center" style={{ color: "var(--nexora-ink-dim)" }}>
            Trazabilidad
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <TraceStat icon={AlertTriangle} value={fmt(overview.overdueCount)} label="Mensualidad vencida" />
            <TraceStat icon={FlaskConical} value={fmt(overview.noPlanCount)} label="Sin plan asignado (pruebas)" />
            <TraceStat icon={PowerOff} value={fmt(overview.disabledCount)} label="Inhabilitados" />
            <TraceStat icon={History} value={fmt(overview.totalRegistered)} label="Total histórico registrado" />
          </div>
        </section>
      </div>
    </div>
  );
}
