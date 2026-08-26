// lib/services/customerTaskService.ts
//
// `customer_tasks` ya existía en Supabase (verificado contra
// information_schema.columns): tareas/recordatorios del staff sobre un
// cliente puntual, con due_date opcional y done_at como marca de
// completado (nunca se borra una tarea al completarla, queda en el
// historial — mismo criterio que orders: el estado avanza, no se borra).
import { createClient } from "@/lib/supabase/server";
// Tope de tareas PENDIENTES por cliente — vive en
// lib/constants/customerLimits.ts (no acá) porque customer-detail-view.tsx
// ("use client") también lo necesita y este archivo importa createClient()
// de server.ts (solo servidor) — ver el porqué completo en ese archivo de
// constantes. Acotado solo a pendientes para no chocar con el criterio ya
// documentado arriba ("nunca se borra una tarea al completarla, queda en
// el historial"): al completar una tarea libera espacio para una nueva,
// las completadas se siguen acumulando sin límite ni borrado.
import { MAX_PENDING_TASKS_PER_CUSTOMER } from "@/lib/constants/customerLimits";

export interface CustomerTask {
  id: string;
  business_id: string;
  customer_id: string;
  text: string;
  due_date: string | null;
  done_at: string | null;
  created_by: string;
  created_at: string;
}

// Tareas de un cliente puntual: pendientes primero (ordenadas por fecha
// límite más próxima, las sin fecha al final), después las ya hechas
// (más reciente primero). No es un orden expresable con una sola llamada
// a .order() encadenada (eso ordena por columnas, no por "grupo"), así
// que se resuelve con dos consultas en paralelo y se concatenan.
export async function getTasksForCustomer(businessId: string, customerId: string): Promise<CustomerTask[]> {
  const supabase = await createClient();

  const [{ data: pending, error: pendingError }, { data: done, error: doneError }] = await Promise.all([
    supabase
      .from("customer_tasks")
      .select("*")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .is("done_at", null)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("customer_tasks")
      .select("*")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .not("done_at", "is", null)
      .order("done_at", { ascending: false }),
  ]);

  if (pendingError || doneError) {
    console.error("[getTasksForCustomer] error:", {
      pendingError,
      doneError,
    });
    return [];
  }

  return [...((pending ?? []) as CustomerTask[]), ...((done ?? []) as CustomerTask[])];
}

// Cuántas tareas PENDIENTES (done_at is null) tiene cada cliente de una
// lista — mismo criterio que getNoteCountsForCustomers/getTagsForCustomers,
// un solo query agrupado en vez de N por cliente.
export async function getPendingTaskCountsForCustomers(
  businessId: string,
  customerIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (customerIds.length === 0) {
    return map;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_tasks")
    .select("customer_id")
    .eq("business_id", businessId)
    .is("done_at", null)
    .in("customer_id", customerIds);

  if (error) {
    console.error("[getPendingTaskCountsForCustomers] error:", {
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

// Crea una tarea/recordatorio para un cliente. dueDate es opcional
// (nullable en la tabla) — createdBy siempre viene de la sesión, validado
// por quien llama (server action), no acá.
export async function createCustomerTask(
  businessId: string,
  customerId: string,
  text: string,
  dueDate: string | null | undefined,
  createdBy: string
): Promise<{ error: string | null; data: CustomerTask | null }> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { error: "La tarea no puede estar vacía", data: null };
  }

  const supabase = await createClient();

  // Doble capa además de RLS: confirma que el cliente sea de verdad de
  // este negocio antes de crear la tarea contra él.
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
  // valida en el cliente (TasksSection) para feedback inmediato, pero acá
  // es donde de verdad se hace cumplir.
  const { count, error: countError } = await supabase
    .from("customer_tasks")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .is("done_at", null);

  if (countError) {
    console.error("[createCustomerTask] count error:", countError);
    return { error: "No se pudo crear la tarea", data: null };
  }
  if ((count ?? 0) >= MAX_PENDING_TASKS_PER_CUSTOMER) {
    return {
      error: `Máximo ${MAX_PENDING_TASKS_PER_CUSTOMER} tareas pendientes por cliente. Completa una para agregar otra.`,
      data: null,
    };
  }

  const { data, error } = await supabase
    .from("customer_tasks")
    .insert({
      business_id: businessId,
      customer_id: customerId,
      text: trimmed,
      due_date: dueDate ?? null,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    console.error("[createCustomerTask] error:", error);
    return { error: "No se pudo crear la tarea", data: null };
  }
  return { error: null, data: data as CustomerTask };
}

// Marca (o desmarca) una tarea como hecha. Verifica que la tarea
// pertenezca de verdad a businessId antes de actualizar — el id de tarea
// nunca se confía tal cual venga de afuera.
export async function toggleCustomerTaskDone(
  businessId: string,
  taskId: string,
  done: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customer_tasks")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", taskId)
    .eq("business_id", businessId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[toggleCustomerTaskDone] error:", error);
    return { error: "No se pudo actualizar la tarea" };
  }
  if (!data) {
    return { error: "Tarea no encontrada" };
  }
  return { error: null };
}
