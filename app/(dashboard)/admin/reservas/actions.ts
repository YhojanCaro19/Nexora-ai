"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import {
  upsertBookingSettings,
  replaceBusinessHours,
  createResource,
  updateResource,
  deleteResource,
  createBookingService,
  updateBookingService,
  deleteBookingService,
} from "@/lib/services/bookingConfigService";
import {
  getReservations,
  createReservation,
  updateReservationStatus,
  computeAvailability,
  type AvailabilityQuery,
} from "@/lib/services/reservationService";
import {
  bookingSettingsSchema,
  businessHoursSchema,
  bookingResourceSchema,
  bookingServiceSchema,
  createReservationSchema,
  type BookingSettingsInput,
  type BusinessHoursInput,
  type BookingResourceInput,
  type BookingServiceInput,
  type CreateReservationInput,
} from "@/lib/validators/reservationSchema";
import { isValidReservationStatus, type Reservation, type ReservationStatus } from "@/lib/types/reservation";

// La configuración de reservas la maneja el admin (número de mesas,
// horario, empleados, servicios) — no un colaborador.
async function requireAdmin() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) return null;
  return profile;
}

function done() {
  revalidatePath("/admin/reservas");
}

export async function saveBookingSettingsAction(input: BookingSettingsInput) {
  const profile = await requireAdmin();
  if (!profile) return { error: "No autorizado" };
  const parsed = bookingSettingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await upsertBookingSettings(profile.businessId!, parsed.data);
  done();
  return result;
}

export async function saveBusinessHoursAction(input: BusinessHoursInput) {
  const profile = await requireAdmin();
  if (!profile) return { error: "No autorizado" };
  const parsed = businessHoursSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await replaceBusinessHours(profile.businessId!, parsed.data);
  done();
  return result;
}

export async function createResourceAction(input: BookingResourceInput) {
  const profile = await requireAdmin();
  if (!profile) return { error: "No autorizado" };
  const parsed = bookingResourceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await createResource(profile.businessId!, parsed.data);
  done();
  return result;
}

export async function updateResourceAction(resourceId: string, input: Partial<BookingResourceInput>) {
  const profile = await requireAdmin();
  if (!profile) return { error: "No autorizado" };
  const result = await updateResource(resourceId, profile.businessId!, input);
  done();
  return result;
}

export async function deleteResourceAction(resourceId: string) {
  const profile = await requireAdmin();
  if (!profile) return { error: "No autorizado" };
  const result = await deleteResource(resourceId, profile.businessId!);
  done();
  return result;
}

export async function createBookingServiceAction(input: BookingServiceInput) {
  const profile = await requireAdmin();
  if (!profile) return { error: "No autorizado" };
  const parsed = bookingServiceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await createBookingService(profile.businessId!, parsed.data);
  done();
  return result;
}

export async function updateBookingServiceAction(serviceId: string, input: Partial<BookingServiceInput>) {
  const profile = await requireAdmin();
  if (!profile) return { error: "No autorizado" };
  const result = await updateBookingService(serviceId, profile.businessId!, input);
  done();
  return result;
}

export async function deleteBookingServiceAction(serviceId: string) {
  const profile = await requireAdmin();
  if (!profile) return { error: "No autorizado" };
  const result = await deleteBookingService(serviceId, profile.businessId!);
  done();
  return result;
}

// ---------- Agenda ----------

export async function listReservationsForRangeAction(fromIso: string, toIso: string) {
  const profile = await requireAdmin();
  if (!profile) return { error: "No autorizado", data: [] as Reservation[] };
  const data = await getReservations(profile.businessId!, {
    fromIso,
    toIso,
    statuses: ["pending", "confirmed", "seated", "completed", "no_show"],
  });
  return { error: null, data };
}

export async function checkAvailabilityAction(query: AvailabilityQuery) {
  const profile = await requireAdmin();
  if (!profile) return { error: "No autorizado", slots: [] };
  const result = await computeAvailability(profile.businessId!, query);
  return { error: result.error, slots: result.slots };
}

export async function createManualReservationAction(input: CreateReservationInput) {
  const profile = await requireAdmin();
  if (!profile) return { error: "No autorizado", data: null };
  const parsed = createReservationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, data: null };
  const result = await createReservation(profile.businessId!, parsed.data, {
    source: "manual",
    createdByUserId: profile.userId,
  });
  done();
  return result;
}

export async function setReservationStatusAction(reservationId: string, status: string) {
  const profile = await requireAdmin();
  if (!profile) return { error: "No autorizado" };
  if (!isValidReservationStatus(status)) return { error: "Estado inválido" };
  const result = await updateReservationStatus(
    reservationId,
    profile.businessId!,
    status as ReservationStatus,
    profile.userId
  );
  done();
  return result;
}
