// lib/services/customerNoteService.ts
//
// `customer_notes` ya existía en Supabase (verificado contra
// information_schema.columns): una fila por nota interna sobre un
// cliente. Diseño original: sin edición ni borrado — solo historial de
// apuntes que va dejando el equipo (mismo criterio que rejection_reason en
// orders: se registra y queda, no se edita después). Eso cambió con el
// tope de MAX_NOTES_PER_CUSTOMER: para no bloquear al equipo para siempre
// una vez alcanzado, ahora sí se puede borrar una nota puntual
// (deleteCustomerNote) — pero solo eso, sigue sin haber edición. Requiere
// una policy de DELETE en customer_notes que no existía antes de este
// cambio (is_business_admin(business_id), igual que el resto de policies
// del proyecto).
import { createClient } from "@/lib/supabase/server";
// Tope de notas por cliente — vive en lib/constants/customerLimits.ts (no
// acá) porque customer-detail-view.tsx ("use client") también lo necesita
// y este archivo importa createClient() de server.ts (solo servidor) —
// ver el porqué completo en ese archivo de constantes. A diferencia del
// criterio original ("nunca se borra"), este tope obliga a poder borrar
// una nota puntual para hacer espacio a otra.
import { MAX_NOTES_PER_CUSTOMER } from "@/lib/constants/customerLimits";

export interface CustomerNote {
  id: string;
  business_id: string;
  customer_id: string;
  text: string;
  created_by: string;
  created_at: string;
  // Se resuelve acá vía join con business_members (created_by = user_id,
  // mismo business_id) para que la UI no tenga que hacer un segundo
  // fetch — mismo criterio que updated_by_name en Order (ver
  // lib/types/order.ts).
  author_name?: string | null;
}

// Notas de un cliente puntual, la más reciente primero — usado por el
// detalle del cliente en el CRM. El customerId SIEMPRE se acota a
// businessId acá, nunca se confía en que venga ya validado.
export async function getNotesForCustomer(businessId: string, customerId: string): Promise<CustomerNote[]> {
  const supabase = await createClient();
  const [{ data, error }, { data: members }] = await Promise.all([
    supabase
      .from("customer_notes")
      .select("*")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    // customer_notes.created_by referencia auth.users, no business_members
    // directo — no hay FK que Postgrest pueda embeder sola, se resuelve el
    // nombre a mano con este mapa (mismo patrón que getOrders() en
    // orderService.ts).
    supabase.from("business_members").select("user_id, full_name").eq("business_id", businessId),
  ]);

  if (error) {
    console.error("[getNotesForCustomer] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return [];
  }

  const nameByUserId = new Map((members ?? []).map((m) => [m.user_id, m.full_name]));

  return (data ?? []).map((note) => ({
    ...(note as CustomerNote),
    author_name: nameByUserId.get((note as CustomerNote).created_by) ?? null,
  }));
}

// Cuántas notas tiene cada cliente de una lista — usado por la lista de
// Clientes para mostrar un indicador rápido sin entrar al detalle de cada
// uno (mismo criterio que getTagsForCustomers en tagService.ts: un solo
// query agrupado por customer_id, no N queries).
export async function getNoteCountsForCustomers(
  businessId: string,
  customerIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (customerIds.length === 0) {
    return map;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_notes")
    .select("customer_id")
    .eq("business_id", businessId)
    .in("customer_id", customerIds);

  if (error) {
    console.error("[getNoteCountsForCustomers] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return map;
  }

  for (const row of data ?? []) {
    const id = (row as { customer_id: string }).customer_id;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

// Crea una nota interna sobre un cliente. createdBy siempre viene de la
// sesión (nunca del cliente/formData) — se valida en la server action, no
// acá, pero esta función tampoco confía por su cuenta: la usa tal cual la
// recibe, ya que la responsabilidad de que sea el user_id real de la
// sesión es de quien la llama (mismo contrato que updatedByUserId en
// updateOrderStatus).
export async function createCustomerNote(
  businessId: string,
  customerId: string,
  text: string,
  createdBy: string
): Promise<{ error: string | null; data: CustomerNote | null }> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { error: "La nota no puede estar vacía", data: null };
  }

  const supabase = await createClient();

  // Doble capa además de RLS: confirma que el cliente sea de verdad de
  // este negocio antes de insertar la nota contra él.
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (customerError || !customer) {
    return { error: "Cliente no encontrado", data: null };
  }

  // Doble capa igual que el resto de este archivo: el tope también se
  // valida en el cliente (NotesSection) para feedback inmediato, pero acá
  // es donde de verdad se hace cumplir.
  const { count, error: countError } = await supabase
    .from("customer_notes")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("customer_id", customerId);

  if (countError) {
    console.error("[createCustomerNote] count error:", countError);
    return { error: "No se pudo guardar la nota", data: null };
  }
  if ((count ?? 0) >= MAX_NOTES_PER_CUSTOMER) {
    return { error: `Máximo ${MAX_NOTES_PER_CUSTOMER} notas por cliente. Borra una para agregar otra.`, data: null };
  }

  const { data, error } = await supabase
    .from("customer_notes")
    .insert({ business_id: businessId, customer_id: customerId, text: trimmed, created_by: createdBy })
    .select()
    .single();

  if (error) {
    console.error("[createCustomerNote] error:", error);
    return { error: "No se pudo guardar la nota", data: null };
  }
  return { error: null, data: data as CustomerNote };
}

// Borra una nota puntual. Nuevo a partir del tope de MAX_NOTES_PER_CUSTOMER
// (antes las notas no se borraban nunca) — requiere la policy de DELETE en
// customer_notes (is_business_admin(business_id)) agregada junto con este
// cambio. Verifica que la nota sea de verdad de este negocio antes de
// borrar, mismo criterio que toggleCustomerTaskDone.
export async function deleteCustomerNote(businessId: string, noteId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customer_notes")
    .delete()
    .eq("id", noteId)
    .eq("business_id", businessId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[deleteCustomerNote] error:", error);
    return { error: "No se pudo borrar la nota" };
  }
  if (!data) {
    return { error: "Nota no encontrada" };
  }
  return { error: null };
}
