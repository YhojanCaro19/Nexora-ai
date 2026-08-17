// Anillo de "Pedidos completados", grande y centrado — aparte de StatCard
// a propósito, para no arriesgar romper esa tarjeta compartida (la usa
// también Colaborador → Inicio) con un tamaño especial que solo necesita
// esta pantalla.
export function CompletionRingCard({
  finishedCount,
  totalCount,
  percent,
}: {
  finishedCount: number;
  totalCount: number;
  percent: number;
}) {
  return (
    <div
      className="rounded-2xl border p-6 flex flex-col items-center justify-center text-center gap-4"
      style={{ background: 'var(--nexora-panel)', borderColor: 'var(--nexora-line)' }}
    >
      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
        Pedidos del día completados
      </p>

      <div
        className="w-32 h-32 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `conic-gradient(var(--nexora-nova) ${percent * 3.6}deg, var(--nexora-line) 0deg)` }}
      >
        <div
          className="w-[104px] h-[104px] rounded-full flex items-center justify-center"
          style={{ background: 'var(--nexora-panel)' }}
        >
          <span className="font-mono-data text-2xl" style={{ color: 'var(--nexora-ink)' }}>
            {percent}%
          </span>
        </div>
      </div>

      <p className="text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>
        {finishedCount}/{totalCount} completados
      </p>
    </div>
  );
}
