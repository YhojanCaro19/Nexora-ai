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
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/currency";
import { weekdayLabel, type BookingMode, type Reservation } from "@/lib/types/reservation";
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

type Config = BookingConfigType;
type CatalogProduct = { id: string; name: string; price: number; active: boolean };

const MODE_OPTIONS: { value: BookingMode; label: string }[] = [
  { value: "off", label: "No usa reservas ni turnos" },
  { value: "tables", label: "Reserva de mesas (restaurante)" },
  { value: "appointments", label: "Turnos y citas (con hora y empleado)" },
  { value: "both", label: "Mesas y turnos" },
];
const modeLabel = (m: BookingMode) => MODE_OPTIONS.find((o) => o.value === m)?.label ?? m;

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

// ---------------- primitivas de UI ----------------

function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border p-5 sm:p-7"
      style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}
    >
      <div className="mb-5 text-center">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
          <Icon size={16} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />
        </div>
        <h3 className="font-nexora text-sm font-semibold" style={{ color: "var(--nexora-ink)" }}>
          {title}
        </h3>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs leading-snug" style={{ color: "var(--nexora-ink-dim)" }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function Feedback({ state }: { state: { kind: "ok" | "error"; text: string } | null }) {
  if (!state) return null;
  return (
    <p
      className="mt-4 rounded-lg border p-2.5 text-center text-xs"
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

const numInputClass =
  "rounded-lg border bg-transparent py-2 text-center text-base font-semibold outline-none [appearance:textfield] focus-visible:border-[var(--nexora-nova)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function NumInput({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${numInputClass} ${className}`}
      style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
    />
  );
}

function AddBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-5 flex flex-wrap items-end justify-center gap-3 border-t pt-5"
      style={{ borderColor: "var(--nexora-line)" }}
    >
      {children}
    </div>
  );
}

function ItemRow({ children, onRemove, disabled }: { children: ReactNode; onRemove: () => void; disabled: boolean }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5"
      style={{ borderColor: "var(--nexora-line)", background: "rgba(255,255,255,0.02)" }}
    >
      <span className="min-w-0 truncate text-sm" style={{ color: "var(--nexora-ink)" }}>
        {children}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="shrink-0 rounded-md p-1 transition-colors hover:bg-white/[0.06]"
        style={{ color: "var(--nexora-alert)" }}
      >
        <Trash2 size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

// ---------------- secciones ----------------

function SettingsSection({ config }: { config: Config }) {
  const [mode, setMode] = useState<BookingMode>(config.settings.mode);
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
    <Card icon={Settings2} title="¿Qué usa este negocio?">
      <div className="mx-auto max-w-sm space-y-6">
        <Select value={mode} onValueChange={(v) => v && setMode(v as BookingMode)}>
          <SelectTrigger className="h-11 w-full justify-between text-sm">{modeLabel(mode)}</SelectTrigger>
          <SelectContent>
            {MODE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {mode !== "off" && (
          <div className="space-y-5">
            <QuestionField
              question={mode === "tables" ? "¿Cuánto dura cada reserva de mesa?" : "¿Cada cuánto sale un turno?"}
              unit="minutos"
              value={turnLength}
              onChange={setTurnLength}
              hint={
                mode === "tables"
                  ? "Cuánto se retiene la mesa. Ej. 90 = hora y media por reserva."
                  : "Cada 30, cada 60… Si el turno lleva un servicio, se usa la duración del servicio."
              }
            />
            <QuestionField
              question="¿Con cuánto tiempo mínimo de anticipación?"
              unit="minutos"
              value={minNotice}
              onChange={setMinNotice}
              hint="Para que no reserven a última hora. Ej. 60 = nada para la próxima hora."
            />
            <QuestionField
              question="¿Hasta con cuántos días de anticipación?"
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
    </Card>
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
    <div className="space-y-2 text-center">
      <Label className="block text-sm font-medium">{question}</Label>
      <div className="flex items-center justify-center gap-2">
        <NumInput value={value} onChange={onChange} className="w-20" />
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
        return { weekday: wd, open: !!block, opensAt: block?.opensAt ?? "09:00", closesAt: block?.closesAt ?? "18:00" };
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
    <Card icon={Clock} title="Horario de atención" description="Las franjas de la agenda salen de acá.">
      <div className="mx-auto max-w-sm space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.weekday}
            className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
            style={{
              borderColor: "var(--nexora-line)",
              background: r.open ? "rgba(255,255,255,0.02)" : "transparent",
              opacity: r.open ? 1 : 0.6,
            }}
          >
            <label className="flex cursor-pointer items-center gap-2.5 text-sm" style={{ color: "var(--nexora-ink)" }}>
              <input type="checkbox" checked={r.open} onChange={(e) => patch(r.weekday, { open: e.target.checked })} />
              <span className="w-16">{weekdayLabel(r.weekday)}</span>
            </label>
            {r.open ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="time"
                  value={r.opensAt}
                  onChange={(e) => patch(r.weekday, { opensAt: e.target.value })}
                  className="h-8 w-[7.5rem]"
                />
                <span style={{ color: "var(--nexora-ink-dim)" }}>–</span>
                <Input
                  type="time"
                  value={r.closesAt}
                  onChange={(e) => patch(r.weekday, { closesAt: e.target.value })}
                  className="h-8 w-[7.5rem]"
                />
              </div>
            ) : (
              <span className="pr-2 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                Cerrado
              </span>
            )}
          </div>
        ))}
      </div>
      <Feedback state={feedback} />
      <div className="mt-4 flex justify-center">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Guardando..." : "Guardar horario"}
        </Button>
      </div>
    </Card>
  );
}

function ResourcesSection({ config, kind }: { config: Config; kind: "table" | "staff" }) {
  const list = config.resources.filter((r) => r.kind === kind);
  const isTable = kind === "table";
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function add() {
    if (!name.trim()) return;
    setFeedback(null);
    start(async () => {
      const result = await createResourceAction({
        kind,
        name: name.trim(),
        capacity: isTable ? Number(capacity) || 1 : null,
      });
      if (result.error) setFeedback({ kind: "error", text: result.error });
      else setName("");
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
    <Card
      icon={isTable ? UtensilsCrossed : Users}
      title={isTable ? "Mesas" : "Empleados"}
      description={
        isTable
          ? "El agente reserva la mesa más chica que alcance para el grupo."
          : "El agente agenda con el empleado que el cliente pida por nombre."
      }
    >
      <div className="mx-auto max-w-sm space-y-1.5">
        {list.length === 0 ? (
          <p className="py-2 text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
            {isTable ? "Todavía no hay mesas." : "Todavía no hay empleados."}
          </p>
        ) : (
          list.map((r) => (
            <ItemRow key={r.id} onRemove={() => remove(r.id)} disabled={pending}>
              {r.name}
              {isTable && r.capacity != null && (
                <span style={{ color: "var(--nexora-ink-dim)" }}> · {r.capacity} sillas</span>
              )}
            </ItemRow>
          ))
        )}
      </div>

      <AddBar>
        <div className="space-y-1">
          <Label className="block text-center text-xs">{isTable ? "Nombre de la mesa" : "Nombre"}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isTable ? "Mesa 1" : "Angie"}
            className="h-10 w-40 text-center"
          />
        </div>
        {isTable && (
          <div className="space-y-1">
            <Label className="block text-center text-xs">Sillas</Label>
            <NumInput value={capacity} onChange={setCapacity} className="h-10 w-20" />
          </div>
        )}
        <Button type="button" size="sm" onClick={add} disabled={pending || !name.trim()}>
          <Plus size={14} strokeWidth={2} /> Agregar
        </Button>
      </AddBar>

      <Feedback state={feedback} />
    </Card>
  );
}

function ServicesSection({
  config,
  countryIso2,
  products,
}: {
  config: Config;
  countryIso2: string | null;
  products: CatalogProduct[];
}) {
  const usedIds = new Set(config.services.map((s) => s.productId).filter(Boolean));
  const available = products.filter((p) => p.active && !usedIds.has(p.id));
  const [productId, setProductId] = useState("");
  const [duration, setDuration] = useState("30");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function add() {
    if (!productId) return;
    setFeedback(null);
    start(async () => {
      const result = await createBookingServiceAction({ productId, durationMinutes: Number(duration) || 30 });
      if (result.error) setFeedback({ kind: "error", text: result.error });
      else setProductId("");
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
    <Card
      icon={Scissors}
      title="Servicios"
      description="El servicio sale del Catálogo. Elígelo y ponle cuánto dura — el agente lo usa para agendar y cobrar."
    >
      <div className="mx-auto max-w-sm space-y-1.5">
        {config.services.length === 0 ? (
          <p className="py-2 text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
            Todavía no marcaste ningún producto del catálogo como servicio.
          </p>
        ) : (
          config.services.map((s) => (
            <ItemRow key={s.id} onRemove={() => remove(s.id)} disabled={pending}>
              {s.name}
              <span style={{ color: "var(--nexora-ink-dim)" }}>
                {" · "}
                {s.durationMinutes} min
                {s.price != null ? ` · ${formatCurrency(s.price, countryIso2)}` : ""}
              </span>
            </ItemRow>
          ))
        )}
      </div>

      {products.length === 0 ? (
        <p
          className="mt-5 border-t pt-5 text-center text-xs"
          style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink-dim)" }}
        >
          Primero agrega tus servicios en el Catálogo.
        </p>
      ) : available.length === 0 ? (
        <p
          className="mt-5 border-t pt-5 text-center text-xs"
          style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink-dim)" }}
        >
          Ya marcaste todos los productos del catálogo como servicio.
        </p>
      ) : (
        <AddBar>
          <div className="space-y-1">
            <Label className="block text-center text-xs">Servicio del catálogo</Label>
            <Select value={productId} onValueChange={(v) => setProductId(v ?? "")}>
              <SelectTrigger className="h-10 w-48 justify-between text-sm">
                {available.find((p) => p.id === productId)?.name ?? "Elegir…"}
              </SelectTrigger>
              <SelectContent>
                {available.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="block text-center text-xs">Minutos</Label>
            <NumInput value={duration} onChange={setDuration} className="h-10 w-20" />
          </div>
          <Button type="button" size="sm" onClick={add} disabled={pending || !productId}>
            <Plus size={14} strokeWidth={2} /> Agregar
          </Button>
        </AddBar>
      )}

      <Feedback state={feedback} />
    </Card>
  );
}

function ConfigView({
  config,
  countryIso2,
  products,
}: {
  config: Config;
  countryIso2: string | null;
  products: CatalogProduct[];
}) {
  const mode = config.settings.mode;
  const showTables = mode === "tables" || mode === "both";
  const showAppointments = mode === "appointments" || mode === "both";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <SettingsSection config={config} />
      {mode !== "off" && (
        <>
          <HoursSection config={config} />
          {showTables && <ResourcesSection config={config} kind="table" />}
          {showAppointments && <ResourcesSection config={config} kind="staff" />}
          {showAppointments && (
            <ServicesSection config={config} countryIso2={countryIso2} products={products} />
          )}
        </>
      )}
    </div>
  );
}

// ---------------- panel ----------------

export function ReservasPanel({
  config,
  upcoming,
  countryIso2,
  products,
}: {
  config: Config | null;
  upcoming: Reservation[];
  countryIso2: string | null;
  products: CatalogProduct[];
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
        <ConfigView config={config} countryIso2={countryIso2} products={products} />
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
