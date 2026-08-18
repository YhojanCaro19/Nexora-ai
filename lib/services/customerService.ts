// lib/services/customerService.ts
//
// `customers` ya existía en Supabase con un diseño multi-canal (columna
// `channel`) — este service es la primera vez que el código lo usa.
// Un cliente se identifica por la combinación business_id + phone +
// channel: el mismo número puede escribir por distintos canales en el
// futuro (WhatsApp, canal de prueba interno...) y son personas/hilos
// distintos para el agente.
import { createClient } from "@/lib/supabase/server";

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
  name?: string | null
): Promise<{ error: string | null; data: Customer | null }> {
  const supabase = await createClient();

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
    return { error: null, data: existing as Customer };
  }

  const { data: created, error: createError } = await supabase
    .from("customers")
    .insert({ business_id: businessId, phone, channel, name: name ?? null })
    .select()
    .single();

  if (createError) {
    console.error("[getOrCreateCustomer] error creando cliente:", createError);
    return { error: "No se pudo crear el cliente", data: null };
  }
  return { error: null, data: created as Customer };
}
