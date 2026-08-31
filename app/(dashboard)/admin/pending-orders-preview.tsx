import { Clock } from "lucide-react";
import type { PendingOrderPreview } from "@/lib/services/dashboardService";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDateTime } from "@/lib/utils/date";

// Vista rápida de lo que necesita atención ya — misma numeración de
// "Pedido #N" que el módulo de Pedidos, para que sea el mismo pedido si
// el admin va a buscarlo allá. El título queda arriba y la lista (o el
// mensaje vacío) centrada en el espacio restante — la fila en page.tsx usa
// items-stretch, así que esta tarjeta crece para igualar a su vecina y el
// centrado evita que el estiramiento se vea como relleno vacío.
export function PendingOrdersPreview({
  orders,
  countryIso2,
  totalCount,
}: {
  orders: PendingOrderPreview[];
  countryIso2: string | null;
  // Total real de pendientes — `orders` viene recortado a 4 para la vista.
  totalCount: number;
}) {
  return (
    <div
      className="rounded-2xl border p-4 sm:p-6 h-full flex flex-col"
      style={{ background: 'var(--nexora-panel)', borderColor: 'var(--nexora-line)' }}
    >
      <p className="text-xs uppercase tracking-wide text-center mb-4" style={{ color: 'var(--nexora-ink-dim)' }}>
        Pedidos pendientes{totalCount > 0 ? ` · ${totalCount}` : ""}
      </p>

      <div className="flex-1 flex flex-col justify-center">
        {orders.length === 0 ? (
          <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
            No hay pedidos esperando revisión.
          </p>
        ) : (
          <ul className="space-y-4">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Clock size={14} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--nexora-ink)' }}>
                      Pedido #{o.number}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                      {formatShortDateTime(o.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--nexora-ink)' }}>
                  {formatCurrency(o.total, countryIso2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
