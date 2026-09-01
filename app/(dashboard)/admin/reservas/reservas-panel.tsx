"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  CalendarDays,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  Users,
  UtensilsCrossed,
  Scissors,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/currency";
import {
  weekdayLabel,
  type BookingMode,
  type Reservation,
} from "@/lib/types/reservation";
import type { BookingConfig as BookingConfigType } from "@/lib/services/bookingConfigService";
import {
  saveBookingSettingsAction,
  saveBusinessHoursAction,
  createResourceAction,
  deleteResourceAction,
  createBookingServiceAction,
  deleteBookingServiceAction,
} from "./actions";
import { ReservasAgenda } from "./reservas-agenda";

// `BookingConfig` como tipo vive en dos lados (types/reservation.ts y el
// service) — son estructuralmente iguales; se usa el del service acá.
type Config = BookingConfigType;

const MODE_OPTIONS: { value: BookingMode; label: string }[] = [
  { value: "off", label: "No usa reservas ni turnos" },
  { value: "tables", label: "Reserva de mesas (restaurante)" },
  { value: "appointments", label: "Turnos y citas (con hora y empleado)" },
  { value: "both", label: "Mesas y turnos" },
];

const modeLabel = (m: BookingMode) => MODE_OPTIONS.find((o) => o.value === m)?.label ?? m;

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]; // lun→dom para la UI

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-center gap-2 border-b pb-2" style={{ borderColor: "var(--nexora-line)" }}>
        {icon}
        <h3 className="font-nexora text-sm font-semibold" style={{ color: "var(--nexora-ink)" }}>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function Feedback({ state }: { state: { kind: "ok" | "error"; text: string } | null }) {
  if (!state) return null;
  return (
    <p
      className="rounded-lg border p-2.5 text-center text-xs"
      style={
        state.kind === "error"
          ? { borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "var(--nexora-alert)" }
          : { borderColor: "rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.08)", color: "var(--nexora-signal)" }
      }
    >
      {state.text}
    </p>
  );
}

// ---------------- Configuración ----------------

function SettingsSection({ config }: { config: Config }) {
  const [mode, setMode] = useState<BookingMode>(config.settings.mode);
  // Un solo control: "¿cada cuánto un turno/reserva?" — escribe tanto la
  // franja como la duración por defecto (para el usuario son lo mismo).
  const [turnLength, setTurnLength] = useState(String(config.settings.slotMinutes));
  const [minNotice, setMinNotice] = useState(String(config.settings.minNoticeMinutes));
  const [maxAdvance, setMaxAdvance] = useState(String(config.settings.maxAdvanceDays));
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setFeedback(null);
    start(async () => {
      const len = Number(turnLength) || 30;
      const result = await saveBookingSettingsAction({
        mode,
        slotMinutes: len,
        defaultDurationMinutes: len,
        minNoticeMinutes: Number(minNotice) || 0,
        maxAdvanceDays: Number(maxAdvance) || 1,
      });
      setFeedback(result.error ? { kind: "error", text: result.error } : { kind: "ok", text: "Guardado." });
    });
  }

  return (
    <Section
      icon={<Settings2 size={15} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />}
      title="¿Qué usa este negocio?"
    >
      <div className="mx-auto max-w-sm space-y-6">
        <div className="space-y-1.5">
          <Select value={mode} onValueChange={(v) => v && setMode(v as BookingMode)}>
            <SelectTrigger className="w-full justify-between">
              {modeLabel(mode)}
            </SelectTrigger>
            <SelectContent>
              {MODE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {mode !== "off" && (
          <div className="space-y-6">
            <QuestionField
              question={mode === "tables" ? "¿Cuánto dura cada reserva de mesa?" : "¿Cada cuánto sale un turno?"}
              unit="minutos"
              value={turnLength}
              onChange={setTurnLength}
              hint={
                mode === "tables"
                  ? "Cuánto tiempo se retiene la mesa. Ej. 90 = cada reserva ocupa la mesa hora y media."
                  : "Cada 30, cada 60… Si el turno tiene un servicio asignado, se usa la duración de ese servicio."
              }
            />
            <QuestionField
              question="¿Con cuánto tiempo mínimo de anticipación?"
              unit="minutos"
              value={minNotice}
              onChange={setMinNotice}
              hint="Para que no reserven a última hora. Ej. 60 = no se puede reservar para dentro de la próxima hora."
            />
            <QuestionField
              question="¿Hasta con cuántos días de anticipación se puede reservar?"
              unit="días"
              value={maxAdvance}
              onChange={setMaxAdvance}
              hint="Ej. 60 = no se puede reservar para más de dos meses adelante."
            />
          </div>
        )}

        <Feedback state={feedback} />
        <div className="flex justify-center">
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </Section>
  );
}

function QuestionField({
  question,
  unit,
  value,
  onChange,
  hint,
}: {
  question: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  return (
    <div className="space-y-1.5 text-center">
      <Label className="block text-sm font-medium">{question}</Label>
      <div className="flex items-center justify-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded-lg border bg-transparent py-2 text-center text-base font-semibold outline-none [appearance:textfield] focus-visible:border-[var(--nexora-nova)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
        />
        <span className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          {unit}
        </span>
      </div>
      <p className="mx-auto max-w-xs text-xs leading-snug" style={{ color: "var(--nexora-ink-dim)" }}>
        {hint}
      </p>
    </div>
  );
}

type DayRow = { weekday: number; open: boolean; opensAt: string; closesAt: string };

function HoursSection({ config }: { config: Config }) {
  const initial: DayRow[] = useMemo(
    () =>
      WEEKDAYS.map((wd) => {
        const block = config.hours.find((h) => h.weekday === wd);
        return {
          weekday: wd,
          open: !!block,
          opensAt: block?.opensAt ?? "09:00",
          closesAt: block?.closesAt ?? "18:00",
        };
      }),
    [config.hours]
  );
  const [rows, setRows] = useState<DayRow[]>(initial);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function patch(weekday: number, next: Partial<DayRow>) {
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...next } : r)));
  }

  function save() {
    setFeedback(null);
    start(async () => {
      const hours = rows
        .filter((r) => r.open)
        .map((r) => ({ weekday: r.weekday, opensAt: r.opensAt, closesAt: r.closesAt }));
      const result = await saveBusinessHoursAction({ hours });
      setFeedback(result.error ? { kind: "error", text: result.error } : { kind: "ok", text: "Horario guardado." });
    });
  }

  return (
    <Section icon={<Clock size={15} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />} title="Horario de atención">
      <div className="mx-auto max-w-md space-y-2">
        {rows.map((r) => (
          <div key={r.weekday} className="flex items-center gap-3">
            <label className="flex w-28 shrink-0 items-center gap-2 text-sm" style={{ color: "var(--nexora-ink)" }}>
              <input
                type="checkbox"
                checked={r.open}
                onChange={(e) => patch(r.weekday, { open: e.target.checked })}
              />
              {weekdayLabel(r.weekday)}
            </label>
            {r.open ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={r.opensAt}
                  onChange={(e) => patch(r.weekday, { opensAt: e.target.value })}
                  className="w-28"
                />
                <span style={{ color: "var(--nexora-ink-dim)" }}>—</span>
                <Input
                  type="time"
                  value={r.closesAt}
                  onChange={(e) => patch(r.weekday, { closesAt: e.target.value })}
                  className="w-28"
                />
              </div>
            ) : (
              <span className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
                Cerrado
              </span>
            )}
          </div>
        ))}
        <Feedback state={feedback} />
        <div className="flex justify-center pt-1">
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? "Guardando..." : "Guardar horario"}
          </Button>
        </div>
      </div>
    </Section>
  );
}

function ResourcesSection({
  config,
  kind,
}: {
  config: Config;
  kind: "table" | "staff";
}) {
  const list = config.resources.filter((r) => r.kind === kind);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const isTable = kind === "table";

  function add() {
    if (!name.trim()) return;
    setFeedback(null);
    start(async () => {
      const result = await createResourceAction({
        kind,
        name: name.trim(),
        capacity: isTable ? Number(capacity) || 1 : null,
      });
      if (result.error) {
        setFeedback({ kind: "error", text: result.error });
        return;
      }
      setName("");
    });
  }

  function remove(id: string) {
    setFeedback(null);
    start(async () => {
      const result = await deleteResourceAction(id);
      if (result.error) setFeedback({ kind: "error", text: result.error });
    });
  }

  return (
    <Section
      icon={
        isTable ? (
          <UtensilsCrossed size={15} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />
        ) : (
          <Users size={15} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />
        )
      }
      title={isTable ? "Mesas" : "Empleados"}
    >
      <div className="mx-auto max-w-md space-y-3">
        <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          {isTable
            ? "Agrega cada mesa y cuántas personas caben. El agente reserva la mesa que alcance para el grupo."
            : "Agrega cada empleado. El agente usa estos nombres para agendar con la persona que el cliente pida."}
        </p>
        {list.length === 0 ? (
          <p className="text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
            {isTable ? "Todavía no hay mesas." : "Todavía no hay empleados."}
          </p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {list.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm" style={{ color: "var(--nexora-ink)" }}>
                  {r.name}
                  {isTable && r.capacity != null && (
                    <span style={{ color: "var(--nexora-ink-dim)" }}> · {r.capacity} personas</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  disabled={pending}
                  className="rounded-md p-1 transition-colors hover:bg-white/[0.06]"
                  style={{ color: "var(--nexora-alert)" }}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end justify-center gap-2">
          <div className="space-y-1">
            <Label className="block text-center text-xs">{isTable ? "Nombre de la mesa" : "Nombre del empleado"}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isTable ? "Mesa 1" : "Angie"}
              className="w-40 text-center"
            />
          </div>
          {isTable && (
            <div className="space-y-1">
              <Label className="block text-center text-xs">Sillas</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-20 text-center"
              />
            </div>
          )}
          <Button type="button" size="sm" onClick={add} disabled={pending || !name.trim()}>
            <Plus size={14} strokeWidth={2} /> Agregar
          </Button>
        </div>

        <Feedback state={feedback} />
      </div>
    </Section>
  );
}

function ServicesSection({ config, countryIso2 }: { config: Config; countryIso2: string | null }) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function add() {
    if (!name.trim()) return;
    setFeedback(null);
    start(async () => {
      const result = await createBookingServiceAction({
        name: name.trim(),
        durationMinutes: Number(duration) || 30,
        price: price.trim() ? Number(price) : null,
      });
      if (result.error) {
        setFeedback({ kind: "error", text: result.error });
        return;
      }
      setName("");
      setPrice("");
    });
  }

  function remove(id: string) {
    setFeedback(null);
    start(async () => {
      const result = await deleteBookingServiceAction(id);
      if (result.error) setFeedback({ kind: "error", text: result.error });
    });
  }

  return (
    <Section icon={<Scissors size={15} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />} title="Servicios">
      <div className="mx-auto max-w-md space-y-3">
        {config.services.length === 0 ? (
          <p className="text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
            Registra tus servicios con su duración — el agente los usa para agendar.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {config.services.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm" style={{ color: "var(--nexora-ink)" }}>
                  {s.name}
                  <span style={{ color: "var(--nexora-ink-dim)" }}>
                    {" · "}
                    {s.durationMinutes} min
                    {s.price != null ? ` · ${formatCurrency(s.price, countryIso2)}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  disabled={pending}
                  className="rounded-md p-1 transition-colors hover:bg-white/[0.06]"
                  style={{ color: "var(--nexora-alert)" }}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end justify-center gap-2">
          <div className="space-y-1">
            <Label className="block text-center text-xs">Servicio</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Corte" className="w-36 text-center" />
          </div>
          <div className="space-y-1">
            <Label className="block text-center text-xs">Minutos</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-20 text-center"
            />
          </div>
          <div className="space-y-1">
            <Label className="block text-center text-xs">Precio (opcional)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-28 text-center"
            />
          </div>
          <Button type="button" size="sm" onClick={add} disabled={pending || !name.trim()}>
            <Plus size={14} strokeWidth={2} /> Agregar
          </Button>
        </div>

        <Feedback state={feedback} />
      </div>
    </Section>
  );
}

function ConfigView({ config, countryIso2 }: { config: Config; countryIso2: string | null }) {
  const mode = config.settings.mode;
  const showTables = mode === "tables" || mode === "both";
  const showAppointments = mode === "appointments" || mode === "both";

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <SettingsSection config={config} />
      {mode !== "off" && (
        <>
          <HoursSection config={config} />
          {showTables && <ResourcesSection config={config} kind="table" />}
          {showAppointments && <ResourcesSection config={config} kind="staff" />}
          {showAppointments && <ServicesSection config={config} countryIso2={countryIso2} />}
        </>
      )}
    </div>
  );
}

// ---------------- Panel ----------------

export function ReservasPanel({
  config,
  upcoming,
  countryIso2,
}: {
  config: Config | null;
  upcoming: Reservation[];
  countryIso2: string | null;
}) {
  const [view, setView] = useState<"chooser" | "agenda" | "config">("chooser");

  if (!config) {
    return (
      <p className="py-16 text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
        No se pudo cargar la configuración de reservas.
      </p>
    );
  }

  if (view === "chooser") {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <p className="text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          Modo actual: <span style={{ color: "var(--nexora-ink)" }}>{modeLabel(config.settings.mode)}</span>
        </p>
        <ChooserRow
          icon={<CalendarDays size={18} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />}
          label="Agenda"
          sub={`${upcoming.length} reserva${upcoming.length === 1 ? "" : "s"} próxima${upcoming.length === 1 ? "" : "s"}`}
          onClick={() => setView("agenda")}
        />
        <ChooserRow
          icon={<Settings2 size={18} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />}
          label="Configuración"
          sub="Modo, horario, mesas, empleados y servicios"
          onClick={() => setView("config")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => setView("chooser")}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        <ChevronLeft size={16} />
        Volver
      </button>
      {view === "agenda" ? (
        <ReservasAgenda config={config} countryIso2={countryIso2} onConfigure={() => setView("config")} />
      ) : (
        <ConfigView config={config} countryIso2={countryIso2} />
      )}
    </div>
  );
}

function ChooserRow({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors hover:bg-white/[0.04]"
      style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nexora-muted)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>
          {label}
        </span>
        <span className="block text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          {sub}
        </span>
      </span>
      <ChevronRight size={16} strokeWidth={1.75} className="shrink-0" style={{ color: "var(--nexora-ink-dim)" }} />
    </button>
  );
}
