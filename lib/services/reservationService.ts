// lib/services/reservationService.ts
//
// Reservas de mesas y turnos/citas. Un solo modelo: reservar un RECURSO
// (mesa o empleado) en un rango de tiempo. El "no se puede reservar dos
// veces lo mismo" lo garantiza el exclusion constraint
// `reservations_no_overlap` en Postgres (ver docs/sql/reservations-module.sql)
// — acá solo se traduce el error 23P01 a un mensaje legible; no se
// reimplementa la verificación de solape en JS (sería una carrera).
//
// Lecturas por el cliente normal (RLS `reservations_member_all`). El
// agente llama estas funciones desde un route handler con el cliente que
// le pasen — para el motor conversacional se usa el admin client, igual
// que con `orders`.
import { createClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import { getTimezoneForCountry, startOfDayInTimezone } from "@/lib/utils/timezone";
import { getBookingConfig, getBookingSettings } from "@/lib/services/bookingConfigService";
import {
  ACTIVE_RESERVATION_STATUSES,
  ALLOWED_RESERVATION_TRANSITIONS,
  isValidReservationStatus,
  type AvailabilitySlot,
  type Reservation,
  type ReservationKind,
  type ReservationStatus,
} from "@/lib/types/reservation";
import type { CreateReservationInput } from "@/lib/validators/reservationSchema";
import { createReservationSchema } from "@/lib/validators/reservationSchema";

type Client = Awaited<ReturnType<typeof createClient>>;

const MIN = 60 * 1000;

async function client(passed?: Client): Promise<Client> {
  return passed ?? (await createClient());
}

async function getBusinessTimezone(supabase: Client, businessId: string): Promise<string> {
  const { data } = await supabase.from("businesses").select("country_iso2").eq("id", businessId).maybeSingle();
  return getTimezoneForCountry((data as { country_iso2: string | null } | null)?.country_iso2 ?? null);
}

// "2026-09-05" + minutos-desde-medianoche-local → instante UTC. Mismo
// criterio aproximado de DST que los reportes (timezone.ts): se usa el
// offset vigente al mediodía de ese día, suficiente para reservas.
function localDateTimeToUtc(timezone: string, dateIso: string, minutesFromMidnight: number): Date {
  const ref = new Date(`${dateIso}T12:00:00Z`);
  const midnight = startOfDayInTimezone(timezone, ref);
  return new Date(midnight.getTime() + minutesFromMidnight * MIN);
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function minToHhmm(t: number): string {
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

// "2026-09-05" + "19:30" (hora LOCAL del negocio) → ISO UTC. Para que el
// agente pueda pasar fecha y hora en lenguaje natural y el backend las
// ancle a la zona horaria correcta.
export async function resolveLocalDateTime(
  businessId: string,
  dateIso: string,
  hhmm: string,
  passed?: Client
): Promise<string> {
  const supabase = await client(passed);
  const timezone = await getBusinessTimezone(supabase, businessId);
  return localDateTimeToUtc(timezone, dateIso, hhmmToMinutes(hhmm)).toISOString();
}

function resourceKindFor(kind: ReservationKind): "staff" | "table" {
  return kind === "table" ? "table" : "staff";
}

function mapReservation(row: Record<string, unknown>): Reservation {
  const resource = row.booking_resources as { name: string } | null;
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    kind: row.kind as ReservationKind,
    resourceId: row.resource_id as string,
    resourceName: resource?.name ?? null,
    customerId: (row.customer_id as string | null) ?? null,
    customerName: (row.customer_name as string | null) ?? null,
    customerPhone: (row.customer_phone as string | null) ?? null,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    partySize: (row.party_size as number | null) ?? null,
    serviceId: (row.service_id as string | null) ?? null,
    serviceName: (row.service_name as string | null) ?? null,
    status: row.status as ReservationStatus,
    source: (row.source as "manual" | "agent") ?? "manual",
    notes: (row.notes as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const SELECT_WITH_JOINS = "*, booking_resources(name)";

export interface GetReservationsFilters {
  fromIso?: string;
  toIso?: string;
  resourceId?: string;
  statuses?: ReservationStatus[];
}

export async function getReservations(
  businessId: string,
  filters: GetReservationsFilters = {},
  passed?: Client
): Promise<Reservation[]> {
  const supabase = await client(passed);
  let query = supabase
    .from("reservations")
    .select(SELECT_WITH_JOINS)
    .eq("business_id", businessId)
    .order("starts_at", { ascending: true });

  if (filters.fromIso) query = query.gte("starts_at", filters.fromIso);
  if (filters.toIso) query = query.lte("starts_at", filters.toIso);
  if (filters.resourceId) query = query.eq("resource_id", filters.resourceId);
  if (filters.statuses && filters.statuses.length > 0) query = query.in("status", filters.statuses);

  const { data, error } = await query;
  if (error) {
    console.error("[getReservations] error:", error);
    return [];
  }
  return ((data as Record<string, unknown>[]) ?? []).map(mapReservation);
}

export async function getReservationsByCustomer(
  businessId: string,
  customerId: string,
  passed?: Client
): Promise<Reservation[]> {
  const supabase = await client(passed);
  const { data, error } = await supabase
    .from("reservations")
    .select(SELECT_WITH_JOINS)
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("starts_at", { ascending: false });
  if (error) {
    console.error("[getReservationsByCustomer] error:", error);
    return [];
  }
  return ((data as Record<string, unknown>[]) ?? []).map(mapReservation);
}

export async function getUpcomingReservations(
  businessId: string,
  limit = 50,
  passed?: Client
): Promise<Reservation[]> {
  const supabase = await client(passed);
  const { data, error } = await supabase
    .from("reservations")
    .select(SELECT_WITH_JOINS)
    .eq("business_id", businessId)
    .in("status", [...ACTIVE_RESERVATION_STATUSES])
    .gte("starts_at", new Date(Date.now() - 2 * 60 * MIN).toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[getUpcomingReservations] error:", error);
    return [];
  }
  return ((data as Record<string, unknown>[]) ?? []).map(mapReservation);
}

// ---------- Disponibilidad ----------

export interface AvailabilityQuery {
  dateIso: string; // "YYYY-MM-DD" (día local del negocio)
  kind: ReservationKind;
  partySize?: number; // mesas
  serviceId?: string; // citas
  resourceId?: string; // limitar a un recurso puntual (ej. "con Angie")
}

export async function computeAvailability(
  businessId: string,
  q: AvailabilityQuery,
  passed?: Client
): Promise<{ slots: AvailabilitySlot[]; error: string | null }> {
  const supabase = await client(passed);
  const [settings, config, timezone] = await Promise.all([
    getBookingSettings(businessId),
    getBookingConfig(businessId),
    getBusinessTimezone(supabase, businessId),
  ]);

  if (settings.mode === "off") return { slots: [], error: "El negocio no tiene reservas activas." };

  // Ventana de reserva.
  const now = Date.now();
  const maxAdvanceMs = settings.maxAdvanceDays * 24 * 60 * MIN;
  const dayStartLocalUtc = localDateTimeToUtc(timezone, q.dateIso, 0).getTime();
  if (dayStartLocalUtc - now > maxAdvanceMs) {
    return { slots: [], error: `Solo se puede reservar hasta ${settings.maxAdvanceDays} días antes.` };
  }

  const weekday = new Date(dayStartLocalUtc).getUTCDay();
  // El weekday hay que sacarlo del día LOCAL, no del instante UTC de su
  // medianoche local — que ya es el mismo día. getUTCDay sobre ese
  // instante da el día correcto porque dayStartLocalUtc ES medianoche
  // local expresada en UTC y cae dentro de ese mismo día calendario en la
  // mayoría de zonas; para AVENTHRA (América / Europa) es exacto.
  const dayBlocks = config.hours.filter((h) => h.weekday === weekday);
  if (dayBlocks.length === 0) return { slots: [], error: null };

  const resourceKind = resourceKindFor(q.kind);
  let candidates = config.resources.filter((r) => r.active && r.kind === resourceKind);
  if (q.resourceId) candidates = candidates.filter((r) => r.id === q.resourceId);
  if (q.kind === "table" && q.partySize != null) {
    candidates = candidates.filter((r) => (r.capacity ?? 0) >= q.partySize!);
  }
  if (candidates.length === 0) {
    return {
      slots: [],
      error: q.kind === "table" ? "No hay mesas para ese número de personas." : "No hay personal disponible.",
    };
  }

  const duration =
    q.kind === "appointment" && q.serviceId
      ? config.services.find((s) => s.id === q.serviceId)?.durationMinutes ?? settings.defaultDurationMinutes
      : settings.defaultDurationMinutes;

  // Reservas activas del día + un margen, para chequear solape en memoria.
  const dayEndUtcIso = new Date(dayStartLocalUtc + 24 * 60 * MIN + duration * MIN).toISOString();
  const dayStartUtcIso = new Date(dayStartLocalUtc - duration * MIN).toISOString();
  const { data: existing } = await supabase
    .from("reservations")
    .select("resource_id, starts_at, ends_at")
    .eq("business_id", businessId)
    .in("status", [...ACTIVE_RESERVATION_STATUSES])
    .lt("starts_at", dayEndUtcIso)
    .gt("ends_at", dayStartUtcIso);

  const busy = ((existing as { resource_id: string; starts_at: string; ends_at: string }[]) ?? []).map((r) => ({
    resourceId: r.resource_id,
    start: new Date(r.starts_at).getTime(),
    end: new Date(r.ends_at).getTime(),
  }));

  const minStart = now + settings.minNoticeMinutes * MIN;
  const slots: AvailabilitySlot[] = [];

  for (const block of dayBlocks) {
    const openMin = hhmmToMinutes(block.opensAt);
    const closeMin = hhmmToMinutes(block.closesAt);
    for (let t = openMin; t + duration <= closeMin; t += settings.slotMinutes) {
      const slotStart = localDateTimeToUtc(timezone, q.dateIso, t).getTime();
      const slotEnd = slotStart + duration * MIN;
      if (slotStart < minStart) continue;

      const free = candidates.filter(
        (r) => !busy.some((b) => b.resourceId === r.id && b.start < slotEnd && b.end > slotStart)
      );
      if (free.length > 0) {
        slots.push({
          startsAt: new Date(slotStart).toISOString(),
          endsAt: new Date(slotEnd).toISOString(),
          label: minToHhmm(t),
          resourceIds: free.map((r) => r.id),
        });
      }
    }
  }

  return { slots, error: null };
}

// ---------- Crear ----------

export interface CreateReservationContext {
  source: "manual" | "agent";
  createdByUserId?: string | null;
  customerId?: string | null;
}

export async function createReservation(
  businessId: string,
  rawInput: CreateReservationInput,
  ctx: CreateReservationContext,
  passed?: Client
): Promise<{ error: string | null; data: Reservation | null }> {
  const parsed = createReservationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }
  const input = parsed.data;
  const supabase = await client(passed);

  const config = await getBookingConfig(businessId);
  if (config.settings.mode === "off") {
    return { error: "El negocio no tiene reservas activas.", data: null };
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Fecha de inicio inválida.", data: null };
  }

  // Duración y nombre del servicio (citas).
  let durationMinutes = config.settings.defaultDurationMinutes;
  let serviceName: string | null = null;
  if (input.kind === "appointment") {
    if (input.serviceId) {
      const service = config.services.find((s) => s.id === input.serviceId && s.active);
      if (!service) return { error: "Ese servicio ya no está disponible.", data: null };
      durationMinutes = service.durationMinutes;
      serviceName = service.name;
    } else if (input.durationMinutes) {
      durationMinutes = input.durationMinutes;
    }
  }
  const endsAt = new Date(startsAt.getTime() + durationMinutes * MIN);

  // Resolver recurso: el que pidieron, o el mejor libre.
  const resourceKind = resourceKindFor(input.kind);
  let pool = config.resources.filter((r) => r.active && r.kind === resourceKind);
  if (input.resourceId) {
    pool = pool.filter((r) => r.id === input.resourceId);
    if (pool.length === 0) return { error: "Ese recurso no existe o está inactivo.", data: null };
  }
  if (input.kind === "table" && input.partySize != null) {
    pool = pool.filter((r) => (r.capacity ?? 0) >= input.partySize!);
    if (pool.length === 0) return { error: "No hay una mesa para ese número de personas.", data: null };
  }
  // Mesas: la más pequeña que alcance, para no quemar las grandes.
  pool = [...pool].sort((a, b) => (a.capacity ?? 999) - (b.capacity ?? 999) || a.sortOrder - b.sortOrder);

  const { data: overlapping } = await supabase
    .from("reservations")
    .select("resource_id")
    .eq("business_id", businessId)
    .in("status", [...ACTIVE_RESERVATION_STATUSES])
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString());
  const busyIds = new Set(((overlapping as { resource_id: string }[]) ?? []).map((r) => r.resource_id));

  const chosen = pool.find((r) => !busyIds.has(r.id));
  if (!chosen) {
    return { error: "No hay disponibilidad a esa hora. Ofrece otro horario.", data: null };
  }

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      business_id: businessId,
      kind: input.kind,
      resource_id: chosen.id,
      customer_id: ctx.customerId ?? null,
      customer_name: input.customerName ?? null,
      customer_phone: input.customerPhone ?? null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      party_size: input.partySize ?? null,
      service_id: input.serviceId ?? null,
      service_name: serviceName,
      status: "confirmed", // decisión: el agente auto-confirma
      source: ctx.source,
      notes: input.notes ?? null,
      created_by: ctx.createdByUserId ?? null,
    })
    .select(SELECT_WITH_JOINS)
    .single();

  if (error) {
    // 23P01 = exclusion constraint: alguien tomó ese recurso en el mismo
    // instante entre el chequeo y el insert. Es la red de seguridad real.
    if ((error as { code?: string }).code === "23P01") {
      return { error: "Ese horario se acaba de ocupar. Ofrece otro.", data: null };
    }
    console.error("[createReservation] error:", error);
    return { error: translateError(error), data: null };
  }

  return { error: null, data: mapReservation(data as Record<string, unknown>) };
}

// ---------- Cambiar estado ----------

export async function updateReservationStatus(
  reservationId: string,
  businessId: string,
  status: ReservationStatus,
  updatedByUserId?: string | null,
  passed?: Client
): Promise<{ error: string | null }> {
  const supabase = await client(passed);
  const { data: current } = await supabase
    .from("reservations")
    .select("status")
    .eq("id", reservationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!current) return { error: "Reserva no encontrada." };

  const currentStatus = current.status as ReservationStatus;
  const allowed = isValidReservationStatus(currentStatus) ? ALLOWED_RESERVATION_TRANSITIONS[currentStatus] : [];
  if (!allowed.includes(status)) {
    return { error: "Ese cambio de estado no está permitido." };
  }

  const { error } = await supabase
    .from("reservations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", reservationId)
    .eq("business_id", businessId);

  return { error: error ? translateError(error) : null };
}
