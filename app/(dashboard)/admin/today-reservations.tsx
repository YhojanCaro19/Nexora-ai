// app/(dashboard)/admin/today-reservations.tsx
//
// Bloque del Inicio: las reservas / turnos / citas de HOY, con hora,
// cliente, recurso y estado. Solo aparece si el negocio tiene el módulo
// de Reservas activo (booking_settings.mode != 'off').
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { formatTimeOnly } from "@/lib/utils/date";
import {
  RESERVATION_STATUS_LABELS,
  type BookingMode,
  type Reservation,
  type ReservationStatus,
} from "@/lib/types/reservation";

const STATUS_COLOR: Record<ReservationStatus, string> = {
  pending: "var(--nexora-nova)",
  confirmed: "var(--nexora-signal)",
  seated: "var(--accent-violet)",
  completed: "var(--nexora-ink-dim)",
  no_show: "var(--nexora-alert)",
  cancelled: "var(--nexora-ink-dim)",
};

function blockTitle(mode: BookingMode): string {
  if (mode === "tables") return "Reservas de hoy";
  if (mode === "appointments") return "Turnos de hoy";
  return "Reservas y turnos de hoy";
}

export function TodayReservations({
  mode,
  reservations,
}: {
  mode: BookingMode;
  reservations: Reservation[];
}) {
  if (mode === "off") return null;

  const active = reservations.filter((r) => r.status !== "cancelled" && r.status !== "no_show");

  return (
    <div
      className="rounded-2xl border p-4 sm:p-5"
      style={{ background: "var(--nexora-panel)", borderColor: "var(--nexora-line)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />
          <h2 className="font-nexora text-sm font-semibold" style={{ color: "var(--nexora-ink)" }}>
            {blockTitle(mode)}
          </h2>
          <span className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
            · {active.length}
          </span>
        </div>
        <Link
          href="/admin/reservas"
          className="inline-flex items-center gap-1 text-xs transition-colors hover:opacity-80"
          style={{ color: "var(--nexora-ink-dim)" }}
        >
          Ver agenda <ChevronRight size={14} strokeWidth={1.75} />
        </Link>
      </div>

      {reservations.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          Sin reservas para hoy.
        </p>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--nexora-line)" }}>
          {reservations.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>
                  <span className="tabular-nums">
                    {formatTimeOnly(r.startsAt)}–{formatTimeOnly(r.endsAt)}
                  </span>{" "}
                  · {r.customerName || "Sin nombre"}
                </p>
                <p className="truncate text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                  {r.kind === "table"
                    ? `${r.resourceName ?? "—"}${r.partySize ? ` · ${r.partySize} personas` : ""}`
                    : `${r.resourceName ?? "—"}${r.serviceName ? ` · ${r.serviceName}` : ""}`}
                </p>
              </div>
              <span
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                style={{ color: STATUS_COLOR[r.status], background: "rgba(255,255,255,0.06)" }}
              >
                {RESERVATION_STATUS_LABELS[r.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
