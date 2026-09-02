// Tarjeta grande de ventas: cifra de hoy + barras de los últimos N días —
// hecha a mano con divs (sin librería de gráficas). Cada barra muestra su
// valor en texto arriba (no hay que adivinar por la altura ni pasar el
// mouse) y siempre tiene un "carril" de fondo visible, para que un día sin
// ventas se vea como "cero", no como si faltara la barra. No necesita
// interactividad de cliente, se renderiza directo desde un Server
// Component.
import type { DailyTrendPoint } from "@/lib/services/reportService";
import { formatCurrency } from "@/lib/utils/currency";

export function SalesTrendChart({
  points,
  todayRevenue,
  countryIso2,
}: {
  points: DailyTrendPoint[];
  todayRevenue: number;
  countryIso2: string | null;
}) {
  const max = Math.max(1, ...points.map((p) => p.revenue));

  return (
    <div className="rounded-2xl border p-4 sm:p-6" style={{ background: 'var(--nexora-panel)', borderColor: 'var(--nexora-line)' }}>
      <div className="mb-1">
        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
          Ventas de la semana
        </p>
        <p className="aventhra-iridescent font-nexora text-2xl sm:text-3xl font-semibold mt-1">
          {formatCurrency(todayRevenue, countryIso2)}
        </p>
      </div>
      <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-32 sm:h-40 mt-6">
        {points.map((p, i) => {
          const isToday = i === points.length - 1;
          const heightPct = (p.revenue / max) * 100;
          return (
            <div key={p.date} className="flex-1 flex flex-col items-center gap-1.5 h-full">
              {/* Sin whitespace-nowrap acá a propósito: en columnas
                  angostas de móvil (7 barras en el ancho de un teléfono)
                  una cifra larga como "$45.000" no cabe en una sola línea
                  sin invadir la columna vecina — dejar que envuelva a 2
                  líneas la mantiene legible sin desbordar. */}
              <span
                className="text-[9px] sm:text-[10px] font-medium text-center leading-tight"
                style={{ color: isToday ? 'var(--nexora-ink)' : 'var(--nexora-ink-dim)' }}
              >
                {p.revenue > 0 ? formatCurrency(p.revenue, countryIso2) : "—"}
              </span>
              {/* El "carril" (fondo) siempre se ve completo — la barra de
                  valor se dibuja encima, así un día en $0 se lee como
                  "cero" y no como una barra rota o que falta. */}
              <div
                title={`${p.label}: ${formatCurrency(p.revenue, countryIso2)}`}
                className="w-full max-w-[36px] flex-1 rounded-md relative overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-md transition-all duration-300"
                  style={{
                    height: `${heightPct}%`,
                    background: isToday
                      ? 'linear-gradient(180deg, #A78BFA, #818CF8 55%, #4CC2E8)'
                      : 'rgba(255,255,255,0.28)',
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
