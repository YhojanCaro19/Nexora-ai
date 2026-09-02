"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  CalendarDays,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Users,
  UtensilsCrossed,
  Scissors,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/currency";
import {
  weekdayLabel,
  type BookingMode,
  type BookingResource,
  type BookingService,
  type BusinessHour,
  type Reservation,
} from "@/lib/types/reservation";
import type { BookingConfig } from "@/lib/services/bookingConfigService";
import {
  saveBookingSettingsAction,
  saveBusinessHoursAction,
  createResourceAction,
  deleteResourceAction,
  createBookingServiceAction,
  deleteBookingServiceAction,
  getServiceCatalogAction,
} from "./actions";
import { ReservasAgenda } from "./reservas-agenda";
import { TablesMap } from "./tables-map";

type CatalogProduct = { id: string; name: string; price: number; active: boolean };

const MODE_OPTIONS: { value: BookingMode; label: string; hint: string }[] = [
  { value: "off", label: "No usa reservas ni turnos", hint: "El negocio no agenda nada (ej. una tienda)." },
  {
    value: "tables",
    label: "Reserva de mesas (restaurante)",
    hint: "El cliente reserva una mesa para X personas, de tal hora a tal hora.",
  },
  {
    value: "appointments",
    label: "Turnos y citas (con hora y empleado)",
    hint: "",
  },
  {
    value: "both",
    label: "Mesas y turnos (los dos)",
    hint: "Solo si el negocio hace ambas cosas: reserva mesas Y agenda citas con empleados (ej. un spa con salas y esteticistas).",
  },
];
const modeLabel = (m: BookingMode) => MODE_OPTIONS.find((o) => o.value === m)?.label ?? m;
const modeHint = (m: BookingMode) => MODE_OPTIONS.find((o) => o.value === m)?.hint ?? "";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

type Feed = { kind: "ok" | "error"; text: string } | null;

// ---------------- primitivas ----------------

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-center gap-2 border-b pb-2" style={{ borderColor: "var(--nexora-line)" }}>
        <Icon size={15} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />
        <h3 className="font-nexora text-sm font-semibold" style={{ color: "var(--nexora-ink)" }}>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function Feedback({ state }: { state: Feed }) {
  if (!state) return null;
  return (
    <p
      className="mx-auto max-w-sm rounded-lg border p-2.5 text-center text-xs"
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

function NumInput({ value, onChange, className = "" }: { value: string; onChange: (v: string) => void; className?: string }) {
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

function ItemList({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-sm divide-y" style={{ borderColor: "var(--nexora-line)" }}>
      {children}
    </div>
  );
}

function ItemLine({ children, onRemove, disabled }: { children: ReactNode; onRemove: () => void; disabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="min-w-0 truncate text-sm" style={{ color: "var(--nexora-ink)" }}>
        {children}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="shrink-0 rounded-md p-1 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

function AddBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-center gap-3">{children}</div>;
}

// ---------------- secciones ----------------

function SettingsSection({
  settings,
  mode,
  onModeChange,
  onSaved,
}: {
  settings: BookingConfig["settings"];
  mode: BookingMode;
  onModeChange: (m: BookingMode) => void;
  onSaved: (s: BookingConfig["settings"]) => void;
}) {
  // El "¿cada cuánto un turno?" solo aplica a citas. En mesas puras no se
  // muestra: la duración de la mesa la decide el cliente al reservar.
  const showTurnLength = mode === "appointments" || mode === "both";
  const [turnLength, setTurnLength] = useState(String(settings.slotMinutes));
  const [minNotice, setMinNotice] = useState(String(settings.minNoticeMinutes));
  const [maxAdvance, setMaxAdvance] = useState(String(settings.maxAdvanceDays));
  const [feedback, setFeedback] = useState<Feed>(null);
  const [pending, start] = useTransition();

  function save() {
    setFeedback(null);
    // En mesas puras se conservan los valores actuales (respaldo interno).
    const len = showTurnLength ? Number(turnLength) || 30 : settings.slotMinutes;
    const next = {
      mode,
      slotMinutes: len,
      defaultDurationMinutes: showTurnLength ? len : settings.defaultDurationMinutes,
      minNoticeMinutes: Number(minNotice) || 0,
      maxAdvanceDays: Number(maxAdvance) || 1,
    };
    start(async () => {
      const result = await saveBookingSettingsAction(next);
      if (result.error) {
        setFeedback({ kind: "error", text: result.error });
        return;
      }
      setFeedback({ kind: "ok", text: "Guardado." });
      onSaved(next);
    });
  }

  return (
    <Section icon={Settings2} title="¿Qué usa este negocio?">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="mx-auto max-w-sm space-y-2">
          <Select value={mode} onValueChange={(v) => v && onModeChange(v as BookingMode)}>
            <SelectTrigger className="h-11 w-full justify-between text-sm">{modeLabel(mode)}</SelectTrigger>
            <SelectContent>
              {MODE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {modeHint(mode) && (
            <p className="text-center text-[11px] leading-snug" style={{ color: "var(--nexora-ink-dim)" }}>
              {modeHint(mode)}
            </p>
          )}
        </div>

        {mode !== "off" && (
          <div className="mx-auto max-w-md divide-y" style={{ borderColor: "var(--nexora-line)" }}>
            {showTurnLength && (
              <QuestionField
                question="¿Cada cuánto un turno?"
                unit="min"
                value={turnLength}
                onChange={setTurnLength}
                hint="Si el turno lleva un servicio, se usa la duración del servicio."
              />
            )}
            <QuestionField
              question="Anticipación mínima para reservar"
              unit="min"
              value={minNotice}
              onChange={setMinNotice}
              hint="Para que no reserven a última hora."
            />
            <QuestionField
              question="¿Con cuántos días de anticipación se puede reservar?"
              unit="días"
              value={maxAdvance}
              onChange={setMaxAdvance}
              hint="Cuántos días hacia adelante como máximo puede pedir una reserva el cliente."
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
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>
          {question}
        </p>
        <p className="mt-1 text-xs leading-snug" style={{ color: "var(--nexora-ink-dim)" }}>
          {hint}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <NumInput value={value} onChange={onChange} className="h-10 w-16" />
        <span className="w-8 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

type DayRow = { weekday: number; open: boolean; opensAt: string; closesAt: string };

function HoursSection({ hours }: { hours: BusinessHour[] }) {
  const initial: DayRow[] = useMemo(
    () =>
      WEEKDAYS.map((wd) => {
        const block = hours.find((h) => h.weekday === wd);
        return { weekday: wd, open: !!block, opensAt: block?.opensAt ?? "09:00", closesAt: block?.closesAt ?? "18:00" };
      }),
    [hours]
  );
  const [rows, setRows] = useState<DayRow[]>(initial);
  const [feedback, setFeedback] = useState<Feed>(null);
  const [pending, start] = useTransition();

  function patch(weekday: number, next: Partial<DayRow>) {
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...next } : r)));
  }
  function save() {
    setFeedback(null);
    const payload = rows.filter((r) => r.open).map((r) => ({ weekday: r.weekday, opensAt: r.opensAt, closesAt: r.closesAt }));
    start(async () => {
      const result = await saveBusinessHoursAction({ hours: payload });
      setFeedback(result.error ? { kind: "error", text: result.error } : { kind: "ok", text: "Horario guardado." });
    });
  }

  return (
    <Section icon={Clock} title="Horario de atención">
      <div className="mx-auto grid max-w-2xl gap-x-10 sm:grid-cols-2">
        {rows.map((r) => (
          <div
            key={r.weekday}
            className="flex items-center justify-between gap-2 border-b py-2.5"
            style={{ borderColor: "var(--nexora-line)", opacity: r.open ? 1 : 0.5 }}
          >
            <label className="flex cursor-pointer items-center gap-2.5 text-sm" style={{ color: "var(--nexora-ink)" }}>
              <Checkbox
                checked={r.open}
                onCheckedChange={(v) => patch(r.weekday, { open: v === true })}
                className="data-[checked]:!border-[#818CF8] data-[checked]:!bg-[#818CF8]"
              />
              <span className="w-14">{weekdayLabel(r.weekday)}</span>
            </label>
            {r.open ? (
              <div className="flex items-center gap-1">
                <Input
                  type="time"
                  value={r.opensAt}
                  onChange={(e) => patch(r.weekday, { opensAt: e.target.value })}
                  className="h-7 w-[6.5rem] px-1.5 text-xs"
                />
                <span style={{ color: "var(--nexora-ink-dim)" }}>–</span>
                <Input
                  type="time"
                  value={r.closesAt}
                  onChange={(e) => patch(r.weekday, { closesAt: e.target.value })}
                  className="h-7 w-[6.5rem] px-1.5 text-xs"
                />
              </div>
            ) : (
              <span className="pr-1 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                Cerrado
              </span>
            )}
          </div>
        ))}
      </div>
      <Feedback state={feedback} />
      <div className="flex justify-center">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Guardando..." : "Guardar horario"}
        </Button>
      </div>
    </Section>
  );
}

function ResourcesSection({
  kind,
  items,
  onAdd,
  onRemove,
}: {
  kind: "table" | "staff";
  items: BookingResource[];
  onAdd: (r: BookingResource) => void;
  onRemove: (id: string) => void;
}) {
  const isTable = kind === "table";
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [feedback, setFeedback] = useState<Feed>(null);
  const [pending, start] = useTransition();

  function add() {
    const trimmed = name.trim();
    if (!trimmed) {
      setFeedback({ kind: "error", text: "Escribe un nombre primero." });
      return;
    }
    setFeedback(null);
    start(async () => {
      try {
        const result = await createResourceAction({
          kind,
          name: trimmed,
          capacity: isTable ? Number(capacity) || 1 : null,
        });
        if (result.error || !result.data) {
          setFeedback({ kind: "error", text: result.error ?? "No se pudo agregar." });
          return;
        }
        onAdd(result.data);
        setName("");
        setFeedback({ kind: "ok", text: "Agregado." });
      } catch (err) {
        setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Error inesperado." });
      }
    });
  }
  function remove(id: string) {
    setFeedback(null);
    start(async () => {
      const result = await deleteResourceAction(id);
      if (result.error) setFeedback({ kind: "error", text: result.error });
      else onRemove(id);
    });
  }

  return (
    <Section icon={isTable ? UtensilsCrossed : Users} title={isTable ? "Mesas" : "Empleados"}>
      {items.length > 0 && (
        <ItemList>
          {items.map((r) => (
            <ItemLine key={r.id} onRemove={() => remove(r.id)} disabled={pending}>
              {r.name}
              {isTable && r.capacity != null && (
                <span style={{ color: "var(--nexora-ink-dim)" }}> · {r.capacity} sillas</span>
              )}
            </ItemLine>
          ))}
        </ItemList>
      )}

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
            <NumInput value={capacity} onChange={setCapacity} className="h-10 w-16" />
          </div>
        )}
        <Button type="button" size="sm" onClick={add} disabled={pending}>
          <Plus size={14} strokeWidth={2} /> Agregar
        </Button>
      </AddBar>

      <Feedback state={feedback} />
    </Section>
  );
}

function ServicesSection({
  services,
  products,
  countryIso2,
  onAdd,
  onRemove,
}: {
  services: BookingService[];
  products: CatalogProduct[];
  countryIso2: string | null;
  onAdd: (s: BookingService) => void;
  onRemove: (id: string) => void;
}) {
  // Relee el catálogo al montar — el usuario puede haber agregado productos
  // en Catálogo y vuelto acá sin recargar (los props del RSC quedan viejos).
  const [catalog, setCatalog] = useState(products);
  useEffect(() => {
    getServiceCatalogAction().then((rows) => {
      if (rows.length > 0) setCatalog(rows);
    });
  }, []);

  const usedIds = new Set(services.map((s) => s.productId).filter(Boolean));
  const available = catalog.filter((p) => p.active && !usedIds.has(p.id));
  const [productId, setProductId] = useState("");
  const [duration, setDuration] = useState("30");
  const [feedback, setFeedback] = useState<Feed>(null);
  const [pending, start] = useTransition();

  function add() {
    if (!productId) {
      setFeedback({ kind: "error", text: "Elige un servicio del catálogo primero." });
      return;
    }
    setFeedback(null);
    start(async () => {
      try {
        const result = await createBookingServiceAction({ productId, durationMinutes: Number(duration) || 30 });
        if (result.error || !result.data) {
          setFeedback({ kind: "error", text: result.error ?? "No se pudo agregar." });
          return;
        }
        onAdd(result.data);
        setProductId("");
        setFeedback({ kind: "ok", text: "Servicio agregado." });
      } catch (err) {
        setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Error inesperado." });
      }
    });
  }
  function remove(id: string) {
    setFeedback(null);
    start(async () => {
      const result = await deleteBookingServiceAction(id);
      if (result.error) setFeedback({ kind: "error", text: result.error });
      else onRemove(id);
    });
  }

  return (
    <Section icon={Scissors} title="Servicios">
      {services.length > 0 && (
        <ItemList>
          {services.map((s) => (
            <ItemLine key={s.id} onRemove={() => remove(s.id)} disabled={pending}>
              {s.name}
              <span style={{ color: "var(--nexora-ink-dim)" }}>
                {" · "}
                {s.durationMinutes} min
                {s.price != null ? ` · ${formatCurrency(s.price, countryIso2)}` : ""}
              </span>
            </ItemLine>
          ))}
        </ItemList>
      )}

      {catalog.length === 0 ? (
        <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          Primero agrega tus servicios en el Catálogo.
        </p>
      ) : available.length === 0 ? (
        <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
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
            <NumInput value={duration} onChange={setDuration} className="h-10 w-16" />
          </div>
          <Button type="button" size="sm" onClick={add} disabled={pending || !productId}>
            <Plus size={14} strokeWidth={2} /> Agregar
          </Button>
        </AddBar>
      )}

      <Feedback state={feedback} />
    </Section>
  );
}

function ConfigView({
  config,
  countryIso2,
  products,
}: {
  config: BookingConfig;
  countryIso2: string | null;
  products: CatalogProduct[];
}) {
  // Estado local — el server persiste, la UI refleja al instante sin
  // depender de router.refresh (que dejaba el botón "pegado").
  const [settings, setSettings] = useState(config.settings);
  const [resources, setResources] = useState(config.resources);
  const [services, setServices] = useState(config.services);

  const mode = settings.mode;
  const showTables = mode === "tables" || mode === "both";
  const showAppointments = mode === "appointments" || mode === "both";

  return (
    <div className="w-full space-y-12">
      <SettingsSection
        settings={settings}
        mode={mode}
        onModeChange={(m) => setSettings((s) => ({ ...s, mode: m }))}
        onSaved={setSettings}
      />
      {mode !== "off" && (
        <>
          <HoursSection hours={config.hours} />
          {showTables && (
            <Section icon={UtensilsCrossed} title="Mesas">
              <TablesMap
                tables={resources.filter((r) => r.kind === "table")}
                onAdd={(r) => setResources((p) => [...p, r])}
                onUpdate={(r) => setResources((p) => p.map((x) => (x.id === r.id ? r : x)))}
                onRemove={(id) => setResources((p) => p.filter((x) => x.id !== id))}
              />
            </Section>
          )}
          {showAppointments && (
            <ResourcesSection
              kind="staff"
              items={resources.filter((r) => r.kind === "staff")}
              onAdd={(r) => setResources((p) => [...p, r])}
              onRemove={(id) => setResources((p) => p.filter((x) => x.id !== id))}
            />
          )}
          {showAppointments && (
            <ServicesSection
              services={services}
              products={products}
              countryIso2={countryIso2}
              onAdd={(s) => setServices((p) => [...p, s])}
              onRemove={(id) => setServices((p) => p.filter((x) => x.id !== id))}
            />
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
  config: BookingConfig | null;
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
      <div className="space-y-6">
        <p className="text-center text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          Modo actual: <span style={{ color: "var(--nexora-ink)" }}>{modeLabel(config.settings.mode)}</span>
        </p>
        <div className="flex flex-col items-center justify-center gap-3 py-4 sm:flex-row sm:gap-6 sm:py-10">
          <ChooserTile
            icon={CalendarDays}
            label="Agenda"
            value={upcoming.length}
            hint={`reserva${upcoming.length === 1 ? "" : "s"} próxima${upcoming.length === 1 ? "" : "s"}`}
            onClick={() => setView("agenda")}
          />
          <ChooserTile
            icon={Settings2}
            label="Configuración"
            hint="modo, horario, recursos"
            onClick={() => setView("config")}
          />
        </div>
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

// Mismo lenguaje visual que el chooser de Pedidos (pedidos-panel.tsx):
// móvil = fila compacta; desktop = cuadrado grande centrado.
function ChooserTile({
  icon: Icon,
  label,
  value,
  hint,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value?: number;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 hover:bg-white/[0.04] sm:h-48 sm:w-48 sm:flex-col sm:items-center sm:justify-center sm:gap-3 sm:rounded-3xl sm:p-0 sm:text-center sm:hover:scale-105 sm:hover:bg-transparent"
      style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--nexora-nova)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nexora-muted)] sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent">
        <Icon size={20} strokeWidth={1.5} className="sm:hidden" style={{ color: "var(--nexora-nova)" }} />
        <Icon size={32} strokeWidth={1.5} className="hidden sm:block" style={{ color: "var(--nexora-nova)" }} />
      </span>

      <span className="min-w-0 flex-1 sm:flex-none">
        <span className="block text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>
          {label}
        </span>
        <span className="mt-0.5 block text-xs sm:hidden" style={{ color: "var(--nexora-ink-dim)" }}>
          {value != null ? `${value} ` : ""}
          {hint}
        </span>
      </span>

      {value != null && (
        <span className="hidden text-2xl font-light sm:block" style={{ color: "var(--nexora-ink-dim)" }}>
          {value}
        </span>
      )}

      <ChevronRight
        size={16}
        strokeWidth={1.75}
        className="shrink-0 sm:hidden"
        style={{ color: "var(--nexora-ink-dim)" }}
      />
    </button>
  );
}
