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
  bookingSettingsSchema,
  businessHoursSchema,
  bookingResourceSchema,
  bookingServiceSchema,
  type BookingSettingsInput,
  type BusinessHoursInput,
  type BookingResourceInput,
  type BookingServiceInput,
} from "@/lib/validators/reservationSchema";

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
