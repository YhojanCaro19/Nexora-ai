// Mismo componente que admin/sales-trend-chart.tsx (barras hechas a mano,
// sin librería) pero con tokens de TODA la plataforma en vez de ventas de
// un negocio. Server Component, sin interactividad de cliente.
import type { DailyTokenPoint } from "@/lib/services/platformStatsService";

export function AgentTokenTrendChart({ points }: { points: DailyTokenPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.tokens));
  const total = points.reduce((sum, p) => sum + p.tokens, 0);

  return (
    <div className="rounded-2xl border p-4 sm:p-6" style={{ background: 'var(--nexora-panel)', borderColor: 'var(--nexora-line)' }}>
      <div className="mb-1">
        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
          Tokens del agente · últimos {points.length} días
        </p>
        <p className="text-2xl sm:text-3xl font-semibold mt-1" style={{ color: 'var(--nexora-ink)' }}>
          {total.toLocaleString("en-US")}
        </p>
      </div>
      <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-32 sm:h-40 mt-6">
        {points.map((p, i) => {
          const isToday = i === points.length - 1;
          const heightPct = (p.tokens / max) * 100;
          return (
            <div key={p.date} className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full">
              <span
                className="inline-block max-w-full truncate text-[9px] sm:text-[10px] font-medium text-center leading-tight"
                style={{ color: isToday ? 'var(--nexora-ink)' : 'var(--nexora-ink-dim)' }}
              >
                {p.tokens > 0 ? p.tokens.toLocaleString("en-US") : "—"}
              </span>
              <div
                title={`${p.label}: ${p.tokens.toLocaleString("en-US")} tokens`}
                className="w-full max-w-[36px] flex-1 rounded-md relative overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-md transition-all duration-300"
                  style={{
                    height: `${heightPct}%`,
                    background: isToday ? 'var(--nexora-nova)' : 'rgba(255,255,255,0.28)',
                  }}
                />
              </div>
              <span
                className="text-[10px] uppercase tracking-wide font-medium"
                style={{ color: isToday ? 'var(--nexora-ink)' : 'var(--nexora-ink-dim)' }}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
