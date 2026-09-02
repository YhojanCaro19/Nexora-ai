import type { LucideIcon } from 'lucide-react';

// Tarjeta compacta de KPI con ícono — la fila de arriba de Inicio, al
// estilo de los dashboards SaaS de referencia (ícono + cifra grande +
// etiqueta), pero con los tokens de color de AVENTHRA.
export function IconStatCard({
  icon: Icon,
  label,
  value,
  badge,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  // Pastilla accionable (ej. "2 nuevos") arriba a la derecha de la tarjeta.
  badge?: { text: string };
  // Cifra en el degradado iridiscente de la marca (para el KPI principal).
  accent?: boolean;
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
        {badge ? (
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ color: '#34D399', background: '#34D3991A' }}
          >
            {badge.text}
          </span>
        ) : null}
      </div>
      <p
        className={`text-2xl font-semibold${accent ? ' aventhra-iridescent' : ''}`}
        style={accent ? undefined : { color: 'var(--nexora-ink)' }}
      >
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--nexora-ink-dim)' }}>
        {label}
      </p>
    </div>
  );
}
