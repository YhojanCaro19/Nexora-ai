interface TrendProps {
  value: string;
  direction?: 'up' | 'down' | 'neutral';
}

interface StatCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'ring';
  ringPercent?: number;
  trend?: TrendProps;
}

const TREND_COLOR: Record<NonNullable<TrendProps['direction']>, string> = {
  up: '#34D399',
  down: '#F87171',
  neutral: 'var(--nexora-ink-dim)',
};

const TrendBadge = ({ trend }: { trend: TrendProps }) => {
  const direction = trend.direction ?? 'up';
  const arrow = direction === 'down' ? '↓' : direction === 'neutral' ? '' : '↑';

  return (
    <span
      className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
      style={{
        color: TREND_COLOR[direction],
        background: `${TREND_COLOR[direction]}1A`,
      }}
    >
      {arrow} {trend.value}
    </span>
  );
};

export const StatCard = ({
  label,
  value,
  variant = 'default',
  ringPercent = 0,
  trend,
}: StatCardProps) => {
  return (
    <div
      className="rounded-2xl p-5 border transition-colors duration-200 hover:border-white/20"
      style={{ background: 'var(--nexora-panel)', borderColor: 'var(--nexora-line)' }}
    >
      <p className="text-[12px] mb-3" style={{ color: 'var(--nexora-ink-dim)' }}>
        {label}
      </p>

      {variant === 'ring' ? (
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `conic-gradient(var(--nexora-nova) ${ringPercent * 3.6}deg, var(--nexora-line) 0deg)` }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--nexora-panel)' }}>
              <span className="font-mono-data text-[11px]" style={{ color: 'var(--nexora-ink)' }}>
                {ringPercent}%
              </span>
            </div>
          </div>
          <span className="font-mono-data text-2xl" style={{ color: 'var(--nexora-ink)' }}>
            {value}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <span className="font-mono-data text-2xl" style={{ color: 'var(--nexora-ink)' }}>
            {value}
          </span>
          {trend && <TrendBadge trend={trend} />}
        </div>
      )}
    </div>
  );
};
