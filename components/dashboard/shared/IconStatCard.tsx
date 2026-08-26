import type { LucideIcon } from 'lucide-react';
import type { TrendIndicator } from '@/lib/services/dashboardService';

const TREND_COLOR: Record<TrendIndicator['direction'], string> = {
  up: '#34D399',
  down: '#F87171',
  neutral: 'var(--nexora-ink-dim)',
};

// Tarjeta compacta de KPI con ícono — la fila de arriba de Inicio, al
// estilo de los dashboards SaaS de referencia (ícono + cifra grande +
// etiqueta + tendencia), pero con los tokens de color de AVENTHRA.
export function IconStatCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: TrendIndicator;
}) {
  return (
    <div
      className="rounded-2xl border p-4 sm:p-5 transition-colors duration-200 hover:border-white/20"
      style={{ background: 'var(--nexora-panel)', borderColor: 'var(--nexora-line)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(238,240,247,0.08)' }}
        >
          <Icon size={16} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
        </div>
        {trend && (
          <span
            className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
            style={{ color: TREND_COLOR[trend.direction], background: `${TREND_COLOR[trend.direction]}1A` }}
          >
            {trend.direction === "down" ? "↓" : trend.direction === "up" ? "↑" : ""} {trend.value}
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold" style={{ color: 'var(--nexora-ink)' }}>
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--nexora-ink-dim)' }}>
        {label}
      </p>
    </div>
  );
}
