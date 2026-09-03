// lib/services/customerService.ts
//
// `customers` ya existía en Supabase con un diseño multi-canal (columna
// `channel`) — este service es la primera vez que el código lo usa.
// Un cliente se identifica por la combinación business_id + phone +
// channel: el mismo número puede escribir por distintos canales en el
// futuro (WhatsApp, canal de prueba interno...) y son personas/hilos
// distintos para el agente.
import { createClient, type SupabaseServerClient } from "@/lib/supabase/server";
import { getOrdersByCustomer } from "@/lib/services/orderService";
import { getConversationsForCustomer } from "@/lib/services/conversationService";
import { getReservationsByCustomer } from "@/lib/services/reservationService";
import type { Order } from "@/lib/types/order";
import type { Reservation } from "@/lib/types/reservation";
import type { Conversation } from "@/lib/services/conversationService";

export interface Customer {
  id: string;
  business_id: string;
  name: string | null;
  phone: string;
  channel: string;
  created_at: string;
}

// Busca el cliente existente; si no existe, lo crea. No hay upsert nativo
// simple acá porque no hay una constraint UNIQUE sobre (business_id,
// phone, channel) todavía — se resuelve a mano (select, si no hay nada,
// insert). Para el volumen del canal de prueba interno (un admin
// probando) no hay riesgo real de condición de carrera.
export async function getOrCreateCustomer(
  businessId: string,
  phone: string,
  channel: string,
  name?: string | null,
  db?: SupabaseServerClient
): Promise<{ error: string | null; data: Customer | null }> {
  const supabase = db ?? (await createClient());

  const { data: existing, error: findError } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .eq("phone", phone)
    .eq("channel", channel)
    .maybeSingle();

  if (findError) {
    console.error("[getOrCreateCustomer] error buscando cliente:", findError);
    return { error: "No se pudo buscar el cliente", data: null };
  }
  if (existing) {
    const row = existing as Customer;
    // El cliente entró por un canal donde al principio no teníamos su
    // nombre (ej. primer mensaje de Messenger) y ahora sí — lo completamos.
    if (name && name.trim() && !row.name) {
      const { data: updated } = await supabase
        .from("customers")
        .update({ name: name.trim() })
        .eq("id", row.id)
        .select()
        .single();
      return { error: null, data: (updated as Customer | null) ?? row };
    }
    return { error: null, data: row };
  }

  const { data: created, error: createError } = await supabase
    .from("customers")
    .insert({ business_id: businessId, phone, channel, name: name?.trim() || null })
    .select()
    .single();

  if (createError) {
    console.error("[getOrCreateCustomer] error creando cliente:", createError);
    return { error: "No se pudo crear el cliente", data: null };
  }
  return { error: null, data: created as Customer };
}

// Lista los clientes del negocio para el módulo de Clientes (CRM ligero) —
// mismo patrón que getOrders() en orderService.ts.
export async function getCustomersForBusiness(businessId: string): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getCustomersForBusiness] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return [];
  }
  return data as Customer[];
}

export interface CustomerDetail {
  customer: Customer | null;
  orders: Order[];
  reservations: Reservation[];
  conversations: Conversation[];
}

// Vista de detalle combinada para la pantalla de un cliente en el CRM —
// una sola llamada en vez de que la página arme sus fetches propios (mismo
// criterio que getAdminDashboardStats() en dashboardService.ts). El id de
// cliente SIEMPRE se acota a businessId acá, nunca se confía en que el id
// que llega desde la ruta pertenezca de verdad a este negocio.
export async function getCustomerDetail(businessId: string, customerId: string): Promise<CustomerDetail> {
  const supabase = await createClient();

  const [{ data: customer, error: customerError }, orders, reservations, conversations] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", customerId).eq("business_id", businessId).maybeSingle(),
      getOrdersByCustomer(businessId, customerId),
      getReservationsByCustomer(businessId, customerId),
      getConversationsForCustomer(businessId, customerId),
    ]);

  if (customerError) {
    console.error("[getCustomerDetail] error buscando cliente:", customerError);
  }

  return {
    customer: (customer as Customer | null) ?? null,
    orders,
    reservations,
    conversations,
  };
}
