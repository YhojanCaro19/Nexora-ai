"use client";

// Agenda de reservas — calendario mensual + detalle del día. Al tocar un
// día se ven sus reservas/turnos, se crea una manual y se mueve su estado
// (confirmar / sentar / completar / no llegó / cancelar).
import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { formatTimeOnly, formatShortDate } from "@/lib/utils/date";
import {
  ALLOWED_RESERVATION_TRANSITIONS,
  RESERVATION_STATUS_LABELS,
  type BookingMode,
  type Reservation,
  type ReservationKind,
  type ReservationStatus,
} from "@/lib/types/reservation";
import type { BookingConfig } from "@/lib/services/bookingConfigService";
import {
  listReservationsForRangeAction,
  createManualReservationAction,
  setReservationStatusAction,
} from "./actions";

const STATUS_COLOR: Record<ReservationStatus, string> = {
  pending: "var(--nexora-nova)",
  confirmed: "var(--nexora-signal)",
  seated: "var(--accent-violet)",
  completed: "var(--nexora-ink-dim)",
  no_show: "var(--nexora-alert)",
  cancelled: "var(--nexora-ink-dim)",
};

const STATUS_ACTION_LABEL: Record<ReservationStatus, string> = {
  pending: "Marcar pendiente",
  confirmed: "Confirmar",
  seated: "Sentar / iniciar",
  completed: "Completar",
  no_show: "No llegó",
  cancelled: "Cancelar",
};

const WEEKDAY_HEADERS = ["L", "M", "M", "J", "V", "S", "D"];

function toDateIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

function dayLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
}

function kindForMode(mode: BookingMode): ReservationKind {
  return mode === "appointments" ? "appointment" : "table";
}

function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}
function minToHhmm(t: number): string {
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function localHhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Franjas del día según el horario configurado para ese día de la semana y
// el tamaño de franja (ej. barbería con turnos cada 30 min → 09:00, 09:30,
// 10:00…). Solo dentro del horario de atención.
function buildDaySlots(config: BookingConfig, dateIso: string): { closed: boolean; slots: string[] } {
  const weekday = new Date(`${dateIso}T12:00:00`).getDay();
  const blocks = config.hours.filter((h) => h.weekday === weekday);
  if (blocks.length === 0) return { closed: true, slots: [] };
  const step = config.settings.slotMinutes || 30;
  const set = new Set<number>();
  for (const b of blocks) {
    for (let t = hhmmToMin(b.opensAt); t < hhmmToMin(b.closesAt); t += step) set.add(t);
  }
  return { closed: false, slots: [...set].sort((a, b) => a - b).map(minToHhmm) };
}

// Grilla del mes: siempre 6 filas de 7, empezando en lunes.
function buildGrid(viewMonth: Date): string[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // lunes = 0
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const cells: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(toDateIso(d));
  }
  return cells;
}

export function ReservasAgenda({
  config,
  countryIso2,
  onConfigure,
}: {
  config: BookingConfig;
  countryIso2: string | null;
  onConfigure?: () => void;
}) {
  void countryIso2;
  const todayIso = toDateIso(new Date());
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(todayIso);
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();

  const grid = useMemo(() => buildGrid(viewMonth), [viewMonth]);
  const rangeFrom = useMemo(() => new Date(`${grid[0]}T00:00:00`).toISOString(), [grid]);
  const rangeTo = useMemo(() => new Date(`${grid[grid.length - 1]}T23:59:59`).toISOString(), [grid]);

  useEffect(() => {
    listReservationsForRangeAction(rangeFrom, rangeTo).then((res) => setReservations(res.data ?? []));
  }, [rangeFrom, rangeTo, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);
  const loading = reservations === null;

  // Reservas por día (para los contadores del calendario).
  const byDay = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations ?? []) {
      if (r.status === "cancelled") continue;
      const key = toDateIso(new Date(r.startsAt));
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return map;
  }, [reservations]);

  function shiftMonth(delta: number) {
    setReservations(null);
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function changeStatus(id: string, status: ReservationStatus) {
    start(async () => {
      const result = await setReservationStatusAction(id, status);
      if (result.error) {
        alert(result.error);
        return;
      }
      reload();
    });
  }

  const [formTime, setFormTime] = useState<string | null>(null);
  function openForm(time: string | null) {
    setFormTime(time);
    setShowForm(true);
  }

  const dayReservations = selectedDay
    ? (byDay.get(selectedDay) ?? [])
        .slice()
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    : [];

  const daySlots = selectedDay ? buildDaySlots(config, selectedDay) : { closed: true, slots: [] };
  const step = config.settings.slotMinutes || 30;
  const slotMap = new Map<string, Reservation[]>();
  const offGrid: Reservation[] = [];
  for (const r of dayReservations) {
    const startMin = hhmmToMin(localHhmm(r.startsAt));
    const slot = daySlots.slots.find((s) => {
      const sm = hhmmToMin(s);
      return startMin >= sm && startMin < sm + step;
    });
    if (slot) slotMap.set(slot, [...(slotMap.get(slot) ?? []), r]);
    else offGrid.push(r);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="grid gap-6 md:grid-cols-[minmax(0,19rem)_1fr]">
        {/* Calendario */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-full p-1.5 transition-colors hover:bg-white/[0.06]"
              style={{ color: "var(--nexora-ink-dim)" }}
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-semibold capitalize" style={{ color: "var(--nexora-ink)" }}>
              {monthLabel(viewMonth)}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-full p-1.5 transition-colors hover:bg-white/[0.06]"
              style={{ color: "var(--nexora-ink-dim)" }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAY_HEADERS.map((w, i) => (
              <span key={i} className="pb-2 text-[10px] font-medium uppercase" style={{ color: "var(--nexora-ink-dim)" }}>
                {w}
              </span>
            ))}
            {grid.map((iso) => {
              const inMonth = new Date(`${iso}T12:00:00`).getMonth() === viewMonth.getMonth();
              const count = byDay.get(iso)?.length ?? 0;
              const isToday = iso === todayIso;
              const isSelected = iso === selectedDay;
              return (
                <div key={iso} className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDay(iso);
                      setShowForm(false);
                    }}
                    className="relative flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors hover:bg-white/[0.06]"
                    style={{
                      color: isSelected
                        ? "var(--nexora-nova-ink)"
                        : inMonth
                          ? "var(--nexora-ink)"
                          : "var(--nexora-ink-dim)",
                      background: isSelected
                        ? "var(--nexora-nova)"
                        : count > 0
                          ? "rgba(129,140,248,0.14)"
                          : "transparent",
                      border: isToday && !isSelected ? "1px solid var(--nexora-nova)" : "1px solid transparent",
                      opacity: inMonth ? 1 : 0.35,
                    }}
                  >
                    {Number(iso.slice(8, 10))}
                    {count > 0 && !isSelected && (
                      <span
                        className="absolute bottom-1 h-1 w-1 rounded-full"
                        style={{ background: "var(--nexora-nova)" }}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel del día — franjas según el horario y el tamaño de franja */}
        <div className="space-y-3">
          {!selectedDay ? (
            <p className="py-10 text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
              Elige un día en el calendario.
            </p>
          ) : (
            <>
              <div
                className="flex items-center justify-between gap-2 border-b pb-2"
                style={{ borderColor: "var(--nexora-line)" }}
              >
                <p className="text-sm font-semibold capitalize" style={{ color: "var(--nexora-ink)" }}>
                  {dayLabel(selectedDay)}
                </p>
                <Button type="button" size="sm" variant="outline" onClick={() => openForm(null)}>
                  <Plus size={14} strokeWidth={2} /> Nueva
                </Button>
              </div>

              {showForm && (
                <NewReservationForm
                  config={config}
                  dateIso={selectedDay}
                  initialTime={formTime ?? undefined}
                  onDone={() => {
                    setShowForm(false);
                    reload();
                  }}
                />
              )}

              {loading ? (
                <p className="py-6 text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
                  Cargando...
                </p>
              ) : config.hours.length === 0 ? (
                <div className="space-y-3 py-6 text-center">
                  <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
                    Todavía no configuraste tu horario de atención, así que no se pueden mostrar las franjas.
                  </p>
                  {onConfigure && (
                    <Button type="button" size="sm" variant="outline" onClick={onConfigure}>
                      Configurar horario
                    </Button>
                  )}
                </div>
              ) : daySlots.closed ? (
                <div className="space-y-2">
                  <p className="py-4 text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
                    Cerrado este día según tu horario de atención.
                  </p>
                  {dayReservations.map((r) => (
                    <ReservationCard key={r.id} r={r} pending={pending} onStatus={changeStatus} />
                  ))}
                </div>
              ) : (
                <div className="max-h-[28rem] space-y-1.5 overflow-y-auto pr-1">
                  {daySlots.slots.map((slot) => {
                    const rs = slotMap.get(slot) ?? [];
                    if (rs.length === 0) {
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => openForm(slot)}
                          className="flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.04]"
                          style={{ borderColor: "var(--nexora-line)" }}
                        >
                          <span className="tabular-nums font-medium" style={{ color: "var(--nexora-ink)" }}>
                            {slot}
                          </span>
                          <span className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                            Libre
                          </span>
                        </button>
                      );
                    }
                    return rs.map((r) => (
                      <ReservationCard key={r.id} r={r} slot={slot} pending={pending} onStatus={changeStatus} />
                    ));
                  })}

                  {offGrid.length > 0 && (
                    <div className="space-y-1.5 pt-3">
                      <p className="text-[10px] uppercase" style={{ color: "var(--nexora-ink-dim)" }}>
                        Fuera del horario
                      </p>
                      {offGrid.map((r) => (
                        <ReservationCard key={r.id} r={r} pending={pending} onStatus={changeStatus} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-[10px]" style={{ color: "var(--nexora-ink-dim)" }}>
        Las horas se muestran en la zona horaria de este dispositivo.
      </p>
    </div>
  );
}

function ReservationCard({
  r,
  slot,
  pending,
  onStatus,
}: {
  r: Reservation;
  slot?: string;
  pending: boolean;
  onStatus: (id: string, status: ReservationStatus) => void;
}) {
  const next = ALLOWED_RESERVATION_TRANSITIONS[r.status] ?? [];
  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>
            <span className="tabular-nums">
              {slot ?? formatTimeOnly(r.startsAt)}
            </span>
            {"–"}
            {formatTimeOnly(r.endsAt)} · {r.customerName || "Sin nombre"}
          </p>
          <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            {r.resourceName ?? "—"}
            {r.partySize ? ` · ${r.partySize} personas` : ""}
            {r.serviceName ? ` · ${r.serviceName}` : ""}
            {r.customerPhone ? ` · ${r.customerPhone}` : ""}
          </p>
          <p className="text-[11px]" style={{ color: "var(--nexora-ink-dim)" }}>
            {r.source === "agent" ? "Pedido por el agente" : "Cargado a mano"} · {formatShortDate(r.createdAt)}
          </p>
          {r.notes && (
            <p className="mt-1 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
              {r.notes}
            </p>
          )}
        </div>
        <span
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ color: STATUS_COLOR[r.status], background: "rgba(255,255,255,0.06)" }}
        >
          {RESERVATION_STATUS_LABELS[r.status]}
        </span>
      </div>

      {next.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {next.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => onStatus(r.id, s)}
              className="rounded-lg border px-2.5 py-1 text-xs transition-colors hover:bg-white/[0.04] disabled:opacity-50"
              style={{
                borderColor: s === "cancelled" || s === "no_show" ? "rgba(248,113,113,0.4)" : "var(--nexora-line)",
                color: s === "cancelled" || s === "no_show" ? "var(--nexora-alert)" : "var(--nexora-ink)",
              }}
            >
              {STATUS_ACTION_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewReservationForm({
  config,
  dateIso,
  initialTime,
  onDone,
}: {
  config: BookingConfig;
  dateIso: string;
  initialTime?: string;
  onDone: () => void;
}) {
  const mode = config.settings.mode;
  const canBoth = mode === "both";
  const [kind, setKind] = useState<ReservationKind>(kindForMode(mode));
  const [time, setTime] = useState(initialTime ?? "19:00");
  const [partySize, setPartySize] = useState("2");
  const [serviceId, setServiceId] = useState<string>("");
  const [resourceId, setResourceId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const resourceKind = kind === "table" ? "table" : "staff";
  const resources = config.resources.filter((r) => r.active && r.kind === resourceKind);
  const services = config.services.filter((s) => s.active);

  function submit() {
    setError(null);
    const startsAt = new Date(`${dateIso}T${time}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      setError("Hora inválida");
      return;
    }
    start(async () => {
      const result = await createManualReservationAction({
        kind,
        startsAt: startsAt.toISOString(),
        resourceId: resourceId || undefined,
        partySize: kind === "table" ? Number(partySize) || 1 : undefined,
        serviceId: kind === "appointment" && serviceId ? serviceId : undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <div
      className="mx-auto max-w-md space-y-3 rounded-xl border p-4"
      style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}
    >
      {canBoth && (
        <div className="flex justify-center gap-2">
          {(["table", "appointment"] as ReservationKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
              style={
                k === kind
                  ? { borderColor: "var(--nexora-nova)", color: "var(--nexora-ink)", background: "rgba(255,255,255,0.04)" }
                  : { borderColor: "var(--nexora-line)", color: "var(--nexora-ink-dim)" }
              }
            >
              {k === "table" ? "Mesa" : "Cita"}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="block text-xs">Hora</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        {kind === "table" ? (
          <div className="space-y-1">
            <Label className="block text-xs">Personas</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-1">
            <Label className="block text-xs">Servicio</Label>
            <Select value={serviceId} onValueChange={(v) => setServiceId(v ?? "")}>
              <SelectTrigger className="w-full justify-between">
                {services.find((s) => s.id === serviceId)?.name ?? "Sin servicio"}
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.durationMinutes} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label className="block text-xs">{kind === "table" ? "Mesa" : "Empleado"} (opcional)</Label>
        <Select value={resourceId} onValueChange={(v) => setResourceId(v ?? "")}>
          <SelectTrigger className="w-full justify-between">
            {resources.find((r) => r.id === resourceId)?.name ?? "Cualquiera disponible"}
          </SelectTrigger>
          <SelectContent>
            {resources.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
                {r.capacity != null ? ` · ${r.capacity} p.` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="block text-xs">Cliente</Label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre" />
        </div>
        <div className="space-y-1">
          <Label className="block text-xs">Teléfono</Label>
          <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Opcional" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="block text-xs">Nota (opcional)</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ventana, silla de bebé…" />
      </div>

      {error && (
        <p
          className="rounded-lg border p-2.5 text-center text-xs"
          style={{ borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "var(--nexora-alert)" }}
        >
          {error}
        </p>
      )}

      <div className="flex justify-center gap-2 pt-1">
        <Button type="button" size="sm" onClick={submit} disabled={pending}>
          {pending ? "Creando..." : "Crear reserva"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
