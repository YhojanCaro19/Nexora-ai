// lib/services/bookingConfigService.ts
//
// Configuración del módulo de Reservas: modo, horario semanal, recursos
// (empleados / mesas) y servicios (para citas). Lecturas y escrituras van
// por el cliente normal — la policy `*_member_all` (ver
// docs/sql/reservations-module.sql) ya cubre "cualquier miembro del
// negocio opera estas tablas". El filtro admin-only se aplica en la capa
// de server actions, igual que en el resto de la app.
import { createClient, type SupabaseServerClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import {
  DEFAULT_BOOKING_SETTINGS,
  type BookingSettings,
  type BusinessHour,
  type BookingResource,
  type BookingService,
  type BusinessClosure,
} from "@/lib/types/reservation";
import type {
  BookingSettingsInput,
  BusinessHoursInput,
  BookingResourceInput,
  BookingServiceInput,
} from "@/lib/validators/reservationSchema";

export interface BookingConfig {
  settings: BookingSettings;
  hours: BusinessHour[];
  resources: BookingResource[];
  services: BookingService[];
}

function mapSettings(row: Record<string, unknown> | null): BookingSettings {
  if (!row) return { ...DEFAULT_BOOKING_SETTINGS };
  return {
    mode: (row.mode as BookingSettings["mode"]) ?? "off",
    slotMinutes: (row.slot_minutes as number) ?? DEFAULT_BOOKING_SETTINGS.slotMinutes,
    defaultDurationMinutes:
      (row.default_duration_minutes as number) ?? DEFAULT_BOOKING_SETTINGS.defaultDurationMinutes,
    minNoticeMinutes: (row.min_notice_minutes as number) ?? DEFAULT_BOOKING_SETTINGS.minNoticeMinutes,
    maxAdvanceDays: (row.max_advance_days as number) ?? DEFAULT_BOOKING_SETTINGS.maxAdvanceDays,
  };
}

const HHMM = (t: string) => t.slice(0, 5);

function mapHour(row: Record<string, unknown>): BusinessHour {
  return {
    id: row.id as string,
    weekday: row.weekday as number,
    opensAt: HHMM(row.opens_at as string),
    closesAt: HHMM(row.closes_at as string),
  };
}

function mapResource(row: Record<string, unknown>): BookingResource {
  return {
    id: row.id as string,
    kind: row.kind as BookingResource["kind"],
    name: row.name as string,
    capacity: (row.capacity as number | null) ?? null,
    active: row.active as boolean,
    sortOrder: (row.sort_order as number) ?? 0,
    posX: (row.pos_x as number | null) ?? null,
    posY: (row.pos_y as number | null) ?? null,
    rotation: (row.rotation as number) ?? 0,
  };
}

function mapService(row: Record<string, unknown>): BookingService {
  return {
    id: row.id as string,
    productId: (row.product_id as string | null) ?? null,
    name: row.name as string,
    durationMinutes: row.duration_minutes as number,
    price: row.price != null ? Number(row.price) : null,
    active: row.active as boolean,
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

export function mapClosure(row: Record<string, unknown>): BusinessClosure {
  return {
    id: row.id as string,
    resourceId: (row.resource_id as string | null) ?? null,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    reason: (row.reason as string | null) ?? null,
  };
}

// Degrada suave: si el módulo no está aplicado en la DB, cada consulta
// falla y se devuelve la config vacía por defecto (mode "off").
export async function getBookingConfig(
  businessId: string,
  db?: SupabaseServerClient
): Promise<BookingConfig> {
  const supabase = db ?? (await createClient());

  const [settingsRes, hoursRes, resourcesRes, servicesRes] = await Promise.all([
    supabase.from("booking_settings").select("*").eq("business_id", businessId).maybeSingle(),
    supabase.from("business_hours").select("*").eq("business_id", businessId).order("weekday").order("opens_at"),
    supabase
      .from("booking_resources")
      .select("*")
      .eq("business_id", businessId)
      .order("kind")
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("booking_services")
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order")
      .order("created_at"),
  ]);

  return {
    settings: mapSettings(settingsRes.data as Record<string, unknown> | null),
    hours: ((hoursRes.data as Record<string, unknown>[]) ?? []).map(mapHour),
    resources: ((resourcesRes.data as Record<string, unknown>[]) ?? []).map(mapResource),
    services: ((servicesRes.data as Record<string, unknown>[]) ?? []).map(mapService),
  };
}

export async function getBookingSettings(
  businessId: string,
  db?: SupabaseServerClient
): Promise<BookingSettings> {
  const supabase = db ?? (await createClient());
  const { data } = await supabase
    .from("booking_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  return mapSettings(data as Record<string, unknown> | null);
}

export async function upsertBookingSettings(
  businessId: string,
  input: BookingSettingsInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("booking_settings").upsert(
    {
      business_id: businessId,
      mode: input.mode,
      slot_minutes: input.slotMinutes,
      default_duration_minutes: input.defaultDurationMinutes,
      min_notice_minutes: input.minNoticeMinutes,
      max_advance_days: input.maxAdvanceDays,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" }
  );
  return { error: error ? translateError(error) : null };
}

// Reemplazo completo del horario semanal — más simple y predecible que
// diff fila por fila desde la UI (que edita la semana como un bloque).
export async function replaceBusinessHours(
  businessId: string,
  input: BusinessHoursInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error: delError } = await supabase.from("business_hours").delete().eq("business_id", businessId);
  if (delError) return { error: translateError(delError) };

  if (input.hours.length === 0) return { error: null };

  const { error } = await supabase.from("business_hours").insert(
    input.hours.map((h) => ({
      business_id: businessId,
      weekday: h.weekday,
      opens_at: h.opensAt,
      closes_at: h.closesAt,
    }))
  );
  return { error: error ? translateError(error) : null };
}

// ---------- Recursos ----------

export async function createResource(
  businessId: string,
  input: BookingResourceInput
): Promise<{ error: string | null; data: BookingResource | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_resources")
    .insert({
      business_id: businessId,
      kind: input.kind,
      name: input.name,
      capacity: input.kind === "table" ? (input.capacity ?? null) : null,
      active: input.active ?? true,
    })
    .select("*")
    .single();
  if (error) return { error: translateError(error), data: null };
  return { error: null, data: mapResource(data as Record<string, unknown>) };
}

export async function updateResource(
  resourceId: string,
  businessId: string,
  input: Partial<BookingResourceInput>
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.capacity !== undefined) patch.capacity = input.capacity;
  if (input.active !== undefined) patch.active = input.active;

  const { error } = await supabase
    .from("booking_resources")
    .update(patch)
    .eq("id", resourceId)
    .eq("business_id", businessId);
  return { error: error ? translateError(error) : null };
}

// Posición/rotación en el plano — se guarda seguido (al soltar la mesa),
// así que es su propia función liviana sin validación de nombre/capacidad.
export async function updateResourceLayout(
  resourceId: string,
  businessId: string,
  layout: { posX?: number | null; posY?: number | null; rotation?: number }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (layout.posX !== undefined) patch.pos_x = layout.posX == null ? null : Math.round(layout.posX);
  if (layout.posY !== undefined) patch.pos_y = layout.posY == null ? null : Math.round(layout.posY);
  if (layout.rotation !== undefined) patch.rotation = ((layout.rotation % 360) + 360) % 360;

  const { error } = await supabase
    .from("booking_resources")
    .update(patch)
    .eq("id", resourceId)
    .eq("business_id", businessId);
  return { error: error ? translateError(error) : null };
}

// No se borra si tiene reservas activas — se desactiva. El on delete
// restrict de reservations.resource_id lo respalda a nivel DB.
export async function deleteResource(
  resourceId: string,
  businessId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("resource_id", resourceId)
    .in("status", ["pending", "confirmed", "seated"]);

  if ((count ?? 0) > 0) {
    return { error: "Este recurso tiene reservas activas. Desactívalo en vez de borrarlo." };
  }

  const { error } = await supabase
    .from("booking_resources")
    .delete()
    .eq("id", resourceId)
    .eq("business_id", businessId);
  return { error: error ? translateError(error) : null };
}

// ---------- Servicios ----------

// El servicio se elige del catálogo: se copia nombre y precio del producto
// y solo se agrega la duración.
export async function createBookingService(
  businessId: string,
  input: BookingServiceInput
): Promise<{ error: string | null; data: BookingService | null }> {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("name, price")
    .eq("id", input.productId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!product) return { error: "Ese producto ya no está en el catálogo.", data: null };

  const { data, error } = await supabase
    .from("booking_services")
    .insert({
      business_id: businessId,
      product_id: input.productId,
      name: (product as { name: string }).name,
      duration_minutes: input.durationMinutes,
      price: (product as { price: number | null }).price ?? null,
      active: true,
    })
    .select("*")
    .single();
  if (error) return { error: translateError(error), data: null };
  return { error: null, data: mapService(data as Record<string, unknown>) };
}

export async function updateBookingServiceDuration(
  serviceId: string,
  businessId: string,
  durationMinutes: number
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("booking_services")
    .update({ duration_minutes: durationMinutes })
    .eq("id", serviceId)
    .eq("business_id", businessId);
  return { error: error ? translateError(error) : null };
}

export async function deleteBookingService(
  serviceId: string,
  businessId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("booking_services")
    .delete()
    .eq("id", serviceId)
    .eq("business_id", businessId);
  return { error: error ? translateError(error) : null };
}
