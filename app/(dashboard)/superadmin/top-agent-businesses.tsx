// Mismo componente que admin/pending-orders-preview.tsx (vista rápida en
// una tarjeta que crece con su vecina) pero con el ranking de negocios
// con más actividad del agente HOY, en vez de pedidos pendientes.
import { Bot } from "lucide-react";
import type { TopAgentBusiness } from "@/lib/services/platformStatsService";

const fmtUsd = (n: number) => (n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

export function TopAgentBusinesses({ businesses }: { businesses: TopAgentBusiness[] }) {
  return (
    <div
      className="rounded-2xl border p-4 sm:p-6 h-full flex flex-col"
      style={{ background: 'var(--nexora-panel)', borderColor: 'var(--nexora-line)' }}
    >
      <p className="text-xs uppercase tracking-wide text-center mb-4" style={{ color: 'var(--nexora-ink-dim)' }}>
        Más actividad del agente hoy
      </p>

      <div className="flex-1 flex flex-col justify-center">
        {businesses.length === 0 ? (
          <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
            Todavía no hay actividad del agente hoy.
          </p>
        ) : (
          <ul className="space-y-4">
            {businesses.map((b, i) => (
              <li key={b.businessId} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--nexora-ink-dim)' }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--nexora-ink)' }}>
                      {b.businessName}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                      {b.tokens.toLocaleString("en-US")} tokens
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold shrink-0 flex items-center gap-1" style={{ color: 'var(--nexora-ink)' }}>
                  <Bot size={12} strokeWidth={1.75} style={{ color: 'var(--nexora-nova)' }} />
                  {fmtUsd(b.costUsd)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
