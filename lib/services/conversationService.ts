// lib/services/conversationService.ts
//
// `conversations` ya existía en Supabase: una fila por hilo de
// conversación (business_id + customer_id + channel), con TODOS los
// mensajes de ese hilo guardados en la columna `messages` (jsonb) — no es
// una fila por mensaje, es una fila por conversación completa.
import { createClient } from "@/lib/supabase/server";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  at: string; // ISO timestamp
}

export interface Conversation {
  id: string;
  business_id: string;
  customer_id: string;
  channel: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export async function getOrCreateConversation(
  businessId: string,
  customerId: string,
  channel: string
): Promise<{ error: string | null; data: Conversation | null }> {
  const supabase = await createClient();

  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .eq("channel", channel)
    .maybeSingle();

  if (findError) {
    console.error("[getOrCreateConversation] error buscando conversación:", findError);
    return { error: "No se pudo buscar la conversación", data: null };
  }
  if (existing) {
    return { error: null, data: existing as Conversation };
  }

  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({ business_id: businessId, customer_id: customerId, channel, messages: [] })
    .select()
    .single();

  if (createError) {
    console.error("[getOrCreateConversation] error creando conversación:", createError);
    return { error: "No se pudo crear la conversación", data: null };
  }
  return { error: null, data: created as Conversation };
}

// Todas las conversaciones de un cliente puntual — un cliente puede tener
// un hilo por canal (test, whatsapp futuro), así que esto trae todos los
// hilos, no solo uno. Usado por el módulo de Clientes (CRM ligero) para
// mostrar el historial de conversación dentro del detalle de un cliente.
export async function getConversationsForCustomer(businessId: string, customerId: string): Promise<Conversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[getConversationsForCustomer] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return [];
  }
  return data as Conversation[];
}

// Agrega el turno del usuario y la respuesta del agente al hilo — se
// reescribe el array completo en vez de un append atómico en SQL porque,
// para el volumen del canal de prueba interno, es más simple y no hay
// escrituras concurrentes reales sobre la misma conversación.
export async function appendConversationTurn(
  conversationId: string,
  existingMessages: ConversationMessage[],
  userMessage: string,
  assistantMessage: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const updatedMessages: ConversationMessage[] = [
    ...existingMessages,
    { role: "user", content: userMessage, at: now },
    { role: "assistant", content: assistantMessage, at: now },
  ];

  const { error } = await supabase
    .from("conversations")
    .update({ messages: updatedMessages, updated_at: now })
    .eq("id", conversationId);

  if (error) {
    console.error("[appendConversationTurn] error guardando turno:", error);
    return { error: "No se pudo guardar la conversación" };
  }
  return { error: null };
}
