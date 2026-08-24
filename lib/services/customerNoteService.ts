// lib/services/customerNoteService.ts
//
// `customer_notes` ya existía en Supabase (verificado contra
// information_schema.columns): una fila por nota interna sobre un
// cliente, sin edición ni borrado en el diseño actual — solo historial de
// apuntes que va dejando el equipo (mismo criterio que rejection_reason en
// orders: se registra y queda, no se edita después).
import { createClient } from "@/lib/supabase/server";

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
