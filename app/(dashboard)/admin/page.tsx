// app/(dashboard)/admin/page.tsx
import { StatCard } from '@/components/dashboard/shared/StatCard';

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Inicio
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Ventas del día" value="$0" />
        <StatCard label="Ventas del mes" value="$0" />
        <StatCard label="Avance de mensualidad" value="—" variant="ring" ringPercent={0} />
      </div>
    </div>
  );
}