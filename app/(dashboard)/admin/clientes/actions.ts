"use server";

// Clientes es admin-exclusivo, igual que Mi Agente y Reportes (no está en
// ASSIGNABLE_MODULES de nav-items.ts): expone el historial completo de
// pedidos y conversaciones de cada cliente, un nivel de detalle que no se
// delega a colaboradores por defecto.
//
// La lista de clientes ya llega server-side vía page.tsx (getCustomersForBusiness),
// pero el detalle (pedidos + conversaciones) es una consulta más pesada
// que solo se dispara cuando el admin toca un cliente puntual — de ahí
// esta action en vez de precargar el detalle de todos los clientes de una.
import { getSessionProfile } from "@/lib/auth/get-session";
import { getCustomerDetail, type CustomerDetail } from "@/lib/services/customerService";
import { createCustomerNote, deleteCustomerNote, type CustomerNote } from "@/lib/services/customerNoteService";
import {
  createTag,
  getTagsForBusiness,
  assignTagToCustomer,
  removeTagFromCustomer,
  type Tag,
} from "@/lib/services/tagService";
import { createCustomerTask, toggleCustomerTaskDone, type CustomerTask } from "@/lib/services/customerTaskService";

export async function getCustomerDetailAction(
  customerId: string
): Promise<{ error: string | null; data: CustomerDetail | null }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado", data: null };
  }

  const detail = await getCustomerDetail(profile.businessId, customerId);
  if (!detail.customer) {
    return { error: "Cliente no encontrado", data: null };
  }
  return { error: null, data: detail };
}

// A partir de acá: notas internas, etiquetas y tareas/recordatorios por
// cliente. Mismo patrón que getCustomerDetailAction: sesión + rol admin
// primero, businessId/userId siempre de la sesión, nunca del cliente.

export async function createCustomerNoteAction(
  customerId: string,
  text: string
): Promise<{ error: string | null; data: CustomerNote | null }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado", data: null };
  }

  return createCustomerNote(profile.businessId, customerId, text, profile.userId);
}

export async function deleteCustomerNoteAction(noteId: string): Promise<{ error: string | null }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado" };
  }

  return deleteCustomerNote(profile.businessId, noteId);
}

export async function getTagsForBusinessAction(): Promise<{ error: string | null; data: Tag[] }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado", data: [] };
  }

  return { error: null, data: await getTagsForBusiness(profile.businessId) };
}

export async function createTagAction(
  name: string,
  color?: string
): Promise<{ error: string | null; data: Tag | null }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado", data: null };
  }

  return createTag(profile.businessId, name, color);
}

export async function assignTagToCustomerAction(
  customerId: string,
  tagId: string
): Promise<{ error: string | null }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado" };
  }

  return assignTagToCustomer(profile.businessId, customerId, tagId);
}

export async function removeTagFromCustomerAction(
  customerId: string,
  tagId: string
): Promise<{ error: string | null }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado" };
  }

  return removeTagFromCustomer(profile.businessId, customerId, tagId);
}

export async function createCustomerTaskAction(
  customerId: string,
  text: string,
  dueDate?: string | null
): Promise<{ error: string | null; data: CustomerTask | null }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado", data: null };
  }

  return createCustomerTask(profile.businessId, customerId, text, dueDate, profile.userId);
}

export async function toggleCustomerTaskDoneAction(
  taskId: string,
  done: boolean
): Promise<{ error: string | null }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado" };
  }

  return toggleCustomerTaskDone(profile.businessId, taskId, done);
}
