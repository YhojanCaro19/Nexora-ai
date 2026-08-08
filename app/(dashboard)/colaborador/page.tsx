// app/(dashboard)/colaborador/page.tsx
import { StatCard } from '@/components/dashboard/shared/StatCard';

export default function ColaboradorHomePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Inicio
      </h1>
      <StatCard label="Mis ventas de hoy" value="$0" />
    </div>
  );
}