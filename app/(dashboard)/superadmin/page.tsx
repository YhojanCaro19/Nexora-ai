// app/(dashboard)/superadmin/page.tsx
import { StatCard } from '@/components/dashboard/shared/StatCard';

export default function SuperAdminHomePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Inicio
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Negocios activos" value="0" />
        <StatCard label="Solicitudes pendientes" value="0" />
        <StatCard label="Ingresos de plataforma" value="$0" />
      </div>
    </div>
  );
}