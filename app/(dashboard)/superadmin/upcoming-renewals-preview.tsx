// Mismo componente que admin/today-reservations.tsx (tarjeta ancha con
// título + contador + link "Ver más", lista con divisores) pero con los
// negocios cuya mensualidad vence pronto (o ya venció), en vez de las
// reservas de hoy.
import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { formatShortDateTime } from "@/lib/utils/date";
import type { UpcomingRenewal } from "@/lib/services/platformStatsService";

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export function UpcomingRenewalsPreview({ renewals }: { renewals: UpcomingRenewal[] }) {
  return (
    <div
      className="rounded-2xl border p-4 sm:p-5"
      style={{ background: "var(--nexora-panel)", borderColor: "var(--nexora-line)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />
          <h2 className="font-nexora text-sm font-semibold" style={{ color: "var(--nexora-ink)" }}>
            Mensualidades por vencer
          </h2>
          <span className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
            · {renewals.length}
          </span>
        </div>
        <Link
          href="/superadmin/negocios"
          className="inline-flex items-center gap-1 text-xs transition-colors hover:opacity-80"
          style={{ color: "var(--nexora-ink-dim)" }}
        >
          Ver negocios <ChevronRight size={14} strokeWidth={1.75} />
        </Link>
      </div>

      {renewals.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          Ningún negocio vence en los próximos días.
        </p>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--nexora-line)" }}>
          {renewals.map((r) => {
            const days = daysUntil(r.planRenewsAt);
            const overdue = days < 0;
            return (
              <div key={r.businessId} className="flex items-center justify-between gap-3 py-2.5">
                <p className="min-w-0 truncate text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>
                  {r.businessName}
                </p>
                <span
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    color: overdue ? "var(--nexora-alert)" : "#F5A623",
                    background: overdue ? "rgba(248,113,113,0.12)" : "rgba(245,166,35,0.12)",
                  }}
                >
                  {overdue ? `Vencido · ${formatShortDateTime(r.planRenewsAt)}` : `En ${days} ${days === 1 ? "día" : "días"}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
