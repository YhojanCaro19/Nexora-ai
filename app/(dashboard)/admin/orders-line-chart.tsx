// Línea de pedidos por día (como la curva "New Clients" del dashboard de
// referencia) — pero con el número real encima de cada punto, para que
// siga siendo clara sin tener que interpretar solo la forma de la curva.
// SVG a mano, sin librería de gráficas.
import type { DailyTrendPoint } from "@/lib/services/reportService";

export function OrdersLineChart({ points }: { points: DailyTrendPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.orderCount));
  const width = 100;
  const height = 32;
  const baseline = height - 6;
  // Cada punto va centrado en su propia columna (width / cantidad de
  // puntos, con un +0.5 de columna), no de canto a canto — así el punto
  // queda exactamente debajo del número y de la fecha de arriba/abajo, que
  // usan el mismo esquema de "7 columnas iguales, centrado en cada una".
  const stepX = width / points.length;
  // Ancho fijo y angosto del pico de cada día — independiente de sus
  // vecinos. Así, si dos días seguidos suben a la vez, se ven como dos
  // triángulos separados con una base plana entre ellos, no como una sola
  // rampa ancha que ocupa todo el tramo entre los dos puntos.
  const halfSpike = Math.min(stepX * 0.2, 3.2);

  const coords = points.map((p, i) => {
    const x = (i + 0.5) * stepX;
    const y = baseline - (p.orderCount / max) * (baseline - 6);
    return { x, y };
  });

  // Zigzag: línea plana en la base, con un pico angosto que sube y baja en
  // cada punto (los días en cero quedan planos, porque su pico coincide
  // con la base).
  const segments = [`M0,${baseline}`];
  for (const c of coords) {
    const left = Math.max(0, c.x - halfSpike);
    const right = Math.min(width, c.x + halfSpike);
    segments.push(`L${left},${baseline}`, `L${c.x},${c.y}`, `L${right},${baseline}`);
  }
  segments.push(`L${width},${baseline}`);
  const linePath = segments.join(" ");
  const areaPath = `${linePath} Z`;

  return (
    <div className="rounded-2xl border p-4 sm:p-6" style={{ background: 'var(--nexora-panel)', borderColor: 'var(--nexora-line)' }}>
      <p className="text-xs uppercase tracking-wide mb-5" style={{ color: 'var(--nexora-ink-dim)' }}>
        Pedidos de la semana
      </p>

      {/* Números arriba de cada punto, en las mismas columnas que la curva. */}
      <div className="flex justify-between">
        {points.map((p, i) => (
          <span
            key={p.date}
            className="flex-1 text-center text-[11px] font-semibold"
            style={{ color: i === points.length - 1 ? 'var(--nexora-ink)' : 'var(--nexora-ink-dim)' }}
          >
            {p.orderCount > 0 ? p.orderCount : "—"}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-32 mt-1">
        <path d={areaPath} fill="var(--nexora-nova)" opacity={0.1} stroke="none" />
        <path  
          d={linePath}
          fill="none"
          stroke="var(--nexora-nova)"
          strokeWidth={1}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={1.1}
            fill={i === coords.length - 1 ? '#FFFFFF' : 'var(--nexora-panel)'}
            stroke="var(--nexora-nova)"
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="flex justify-between mt-2">
        {points.map((p, i) => (
          <span
            key={p.date}
            className="text-[10px] uppercase tracking-wide flex-1 text-center font-medium"
            style={{ color: i === points.length - 1 ? 'var(--nexora-ink)' : 'var(--nexora-ink-dim)' }}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
