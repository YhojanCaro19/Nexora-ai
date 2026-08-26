// lib/services/tagService.ts
//
// `tags` y `customer_tags` ya existían en Supabase (verificado contra
// information_schema.columns): `tags` es el catálogo de etiquetas de un
// negocio (unique(business_id, name)), `customer_tags` es la tabla
// puente que asigna etiquetas a clientes (PK compuesta customer_id +
// tag_id, sin business_id propio — su RLS valida vía join a customers).
import { createClient } from "@/lib/supabase/server";
// Tope de etiquetas por cliente — vive en lib/constants/customerLimits.ts
// (no acá) porque customer-detail-view.tsx ("use client") también lo
// necesita y este archivo importa createClient() de server.ts (solo
// servidor) — ver el porqué completo en ese archivo de constantes.
import { MAX_TAGS_PER_CUSTOMER } from "@/lib/constants/customerLimits";

export interface Tag {
  id: string;
  business_id: string;
  name: string;
  color: string;
  created_at: string;
}

export const DEFAULT_TAG_COLOR = "#4CC2E8";

// Todas las etiquetas del negocio — para poblar el selector al asignar
// una etiqueta a un cliente.
export async function getTagsForBusiness(businessId: string): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  if (error) {
    console.error("[getTagsForBusiness] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return [];
  }
  return data as Tag[];
}

// Crea una etiqueta nueva del negocio. El unique(business_id, name) ya
// existente en Supabase es quien realmente evita duplicados — acá solo se
// traduce ese conflicto a un mensaje legible en vez del error crudo de
// Postgres (23505).
export async function createTag(
  businessId: string,
  name: string,
  color?: string
): Promise<{ error: string | null; data: Tag | null }> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "El nombre de la etiqueta no puede estar vacío", data: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({ business_id: businessId, name: trimmedName, color: color?.trim() || DEFAULT_TAG_COLOR })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe una etiqueta con ese nombre", data: null };
    }
    console.error("[createTag] error:", error);
    return { error: "No se pudo crear la etiqueta", data: null };
  }
  return { error: null, data: data as Tag };
}

// Etiquetas asignadas a UN cliente puntual — join customer_tags -> tags,
// acotado a businessId. El customerId nunca se confía tal cual: se
// verifica primero que pertenezca de verdad a este negocio (doble capa
// además de RLS, mismo criterio que getCustomerDetail()).
export async function getTagsForCustomer(businessId: string, customerId: string): Promise<Tag[]> {
  const supabase = await createClient();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (customerError || !customer) {
    return [];
  }

  const { data, error } = await supabase
    .from("customer_tags")
    .select("tags(*)")
    .eq("customer_id", customerId);

  if (error) {
    console.error("[getTagsForCustomer] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return [];
  }

  // El join embebido de Postgrest devuelve `tags` como objeto anidado por
  // fila de customer_tags — se aplana, y se filtra por las etiquetas que
  // de verdad son de este negocio (una etiqueta de otro negocio nunca
  // podría estar asignada por RLS, pero se acota igual, doble capa).
  return (data ?? [])
    .map((row) => (row as unknown as { tags: Tag | null }).tags)
    .filter((tag): tag is Tag => tag !== null && tag.business_id === businessId);
}

// Etiquetas de VARIOS clientes en un solo query — para que la lista de
// Clientes pueda mostrar las etiquetas de todos los clientes visibles sin
// hacer N queries (una por fila). Devuelve un Map customer_id -> Tag[].
export async function getTagsForCustomers(
  businessId: string,
  customerIds: string[]
): Promise<Map<string, Tag[]>> {
  const map = new Map<string, Tag[]>();
  if (customerIds.length === 0) {
    return map;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_tags")
    .select("customer_id, tags(*)")
    .in("customer_id", customerIds);

  if (error) {
    console.error("[getTagsForCustomers] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return map;
  }

  for (const row of data ?? []) {
    const { customer_id, tags } = row as unknown as { customer_id: string; tags: Tag | null };
    // Doble capa: solo se agrupan etiquetas que de verdad son de este
    // negocio, nunca se confía en el join por sí solo.
    if (!tags || tags.business_id !== businessId) continue;
    const existing = map.get(customer_id) ?? [];
    existing.push(tags);
    map.set(customer_id, existing);
  }

  return map;
}

// Asigna una etiqueta existente a un cliente. Verifica que AMBOS (cliente
// y etiqueta) sean de verdad de este negocio antes de insertar en la
// tabla puente — customer_tags no tiene business_id propio, así que esta
// doble validación es la única forma de evitar mezclar datos entre
// negocios desde esta capa (RLS ya lo cubre, esto es la segunda capa).
export async function assignTagToCustomer(
  businessId: string,
  customerId: string,
  tagId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const [{ data: customer, error: customerError }, { data: tag, error: tagError }] = await Promise.all([
    supabase.from("customers").select("id").eq("id", customerId).eq("business_id", businessId).maybeSingle(),
    supabase.from("tags").select("id").eq("id", tagId).eq("business_id", businessId).maybeSingle(),
  ]);

  if (customerError || !customer) {
    return { error: "Cliente no encontrado" };
  }
  if (tagError || !tag) {
    return { error: "Etiqueta no encontrada" };
  }

  // Doble capa igual que el resto de esta función: el tope también se
  // valida en el cliente (TagsSection) para feedback inmediato, pero acá
  // es donde de verdad se hace cumplir.
  const { count, error: countError } = await supabase
    .from("customer_tags")
    .select("tag_id", { count: "exact", head: true })
    .eq("customer_id", customerId);

  if (countError) {
    console.error("[assignTagToCustomer] count error:", countError);
    return { error: "No se pudo asignar la etiqueta" };
  }
  if ((count ?? 0) >= MAX_TAGS_PER_CUSTOMER) {
    return { error: `Máximo ${MAX_TAGS_PER_CUSTOMER} etiquetas por cliente. Quita una para agregar otra.` };
  }

  const { error } = await supabase.from("customer_tags").insert({ customer_id: customerId, tag_id: tagId });

  if (error) {
    if (error.code === "23505") {
      // Ya estaba asignada — no es un error real desde el punto de vista
      // del usuario, la etiqueta ya está donde quería que estuviera.
      return { error: null };
    }
    console.error("[assignTagToCustomer] error:", error);
    return { error: "No se pudo asignar la etiqueta" };
  }
  return { error: null };
}

// Quita una etiqueta de un cliente. Mismo doble check que assignTagToCustomer.
export async function removeTagFromCustomer(
  businessId: string,
  customerId: string,
  tagId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (customerError || !customer) {
    return { error: "Cliente no encontrado" };
  }

  const { error } = await supabase
    .from("customer_tags")
    .delete()
    .eq("customer_id", customerId)
    .eq("tag_id", tagId);

  if (error) {
    console.error("[removeTagFromCustomer] error:", error);
    return { error: "No se pudo quitar la etiqueta" };
  }
  return { error: null };
}
