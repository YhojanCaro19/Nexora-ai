import { createClient, createAdminClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import { sanitizeImageUpload } from "@/lib/services/imageSecurityService";
import { ALLOWED_STATUS_TRANSITIONS, isValidOrderStatus } from "@/lib/types/order";
import type { Order, OrderItem, OrderStatus } from "@/lib/types/order";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validators/orderSchema";

export type { Order, OrderItem, OrderStatus };
export { ORDER_STATUSES, ORDER_STATUS_LABELS, ALLOWED_STATUS_TRANSITIONS } from "@/lib/types/order";

export async function getOrders(businessId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getOrders] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return [];
  }
  return data as Order[];
}

// Pedidos de UN cliente puntual — usado por el módulo de Clientes (CRM
// ligero) para mostrar el historial de pedidos dentro del detalle de un
// cliente. Mismo patrón que getOrders(), con el filtro extra por
// customer_id (siempre junto a business_id, nunca solo por customer_id).
export async function getOrdersByCustomer(businessId: string, customerId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getOrdersByCustomer] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return [];
  }
  return data as Order[];
}

// Crea un pedido nuevo — la usa la tool `tomar_pedido` del agente
// conversacional, y cualquier futuro flujo de pedidos (ej. un catálogo
// público). Nunca confía en nombre/precio que venga de afuera (ni del
// cliente, ni del modelo): busca cada producto REAL en la base de datos y
// arma el pedido con esos datos — así no se puede inventar un precio
// distinto al que el negocio configuró en Catálogo.
//
// El stock NO se toca acá — se descuenta recién cuando el admin confirma
// el pedido (ver updateOrderStatus), para no perder inventario por
// pedidos que quedan pendientes para siempre o terminan rechazados.
//
// customerId es opcional: el motor conversacional siempre lo tiene (ya
// resolvió el cliente real vía getOrCreateCustomer antes de llamar acá),
// pero un futuro flujo de creación manual desde el panel admin puede no
// tenerlo — en ese caso queda null, igual que antes.
export async function createOrder(
  businessId: string,
  input: CreateOrderInput,
  customerId?: string | null
): Promise<{ error: string | null; data: Order | null }> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const supabase = await createClient();
  const productIds = parsed.data.items.map((item) => item.productId);

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, active")
    .eq("business_id", businessId)
    .in("id", productIds);

  if (productsError) {
    return { error: translateError(productsError), data: null };
  }

  const items: OrderItem[] = [];
  let total = 0;

  for (const line of parsed.data.items) {
    const product = products?.find((p) => p.id === line.productId);
    if (!product || !product.active) {
      return { error: "Uno de los productos del pedido ya no está disponible", data: null };
    }
    total += product.price * line.quantity;
    items.push({
      product_id: product.id,
      name: product.name,
      quantity: line.quantity,
      unit_price: product.price,
    });
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      business_id: businessId,
      customer_id: customerId ?? null,
      status: "pending",
      items,
      total,
    })
    .select()
    .single();

  if (error) {
    return { error: translateError(error), data: null };
  }
  return { error: null, data: data as Order };
}

// El estado nunca retrocede — se verifica contra el estado REAL que tiene
// el pedido en la base de datos ahora mismo, no contra lo que mande el
// cliente, porque un botón viejo en pantalla (o alguien llamando la
// action directo) no debe poder saltarse la regla.
export async function updateOrderStatus(orderId: string, businessId: string, status: OrderStatus) {
  const supabase = await createClient();

  const { data: current, error: findError } = await supabase
    .from("orders")
    .select("status, items")
    .eq("id", orderId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (findError || !current) {
    return { error: "Pedido no encontrado" };
  }

  const currentStatus = current.status as OrderStatus;
  const allowedNext = isValidOrderStatus(currentStatus) ? ALLOWED_STATUS_TRANSITIONS[currentStatus] : [];

  if (!allowedNext.includes(status)) {
    return { error: "Ese cambio de estado no está permitido — un pedido no puede retroceder." };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("business_id", businessId);

  if (error) {
    return { error: translateError(error) };
  }

  // El stock se descuenta justo acá — recién cuando se confirma, nunca al
  // crear el pedido (ver createOrder). Si el descuento falla, no se
  // revierte la confirmación — queda logueado, pero el pedido ya
  // confirmado es lo importante; el stock se puede ajustar a mano.
  if (status === "confirmed") {
    const items = (current.items as OrderItem[]) ?? [];
    for (const item of items) {
      const { error: stockError } = await supabase.rpc("decrement_product_stock", {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
      if (stockError) {
        console.error("[updateOrderStatus] error descontando stock:", stockError);
      }
    }
  }

  return { error: null };
}

// Rechazar es su propio camino (no un simple cambio de estado): exige un
// motivo, y queda registrado quién y cuándo — es lo que se muestra
// después en "Pedidos rechazados" para que el admin pueda supervisar.
export async function rejectOrder(
  orderId: string,
  businessId: string,
  reason: string,
  rejectedByUserId: string
): Promise<{ error: string | null }> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { error: "El motivo del rechazo es obligatorio" };
  }

  const supabase = await createClient();
  const { data: current, error: findError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (findError || !current) {
    return { error: "Pedido no encontrado" };
  }
  if (current.status !== "pending") {
    return { error: "Solo se puede rechazar un pedido que todavía está pendiente." };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status: "rejected",
      rejection_reason: trimmedReason,
      rejected_by: rejectedByUserId,
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("business_id", businessId);

  if (error) {
    return { error: translateError(error) };
  }
  return { error: null };
}

// Sube el comprobante de pago (captura de transferencia, etc.) — mismo
// pipeline de seguridad que las fotos de producto y el logo del negocio
// (validación de firma binaria + reconstrucción con sharp). El bucket es
// público, igual que product-images/business-logos.
//
// A propósito NO hay ninguna action ni botón en la UI de admin/colaborador
// que llame a esto: el comprobante lo adjunta el CLIENTE al agente cuando
// paga, nunca el staff a mano (ver orders-table.tsx — solo muestra "Ver
// comprobante", jamás "Adjuntar"). Esta función queda lista para cuando
// el motor conversacional (Épica 09) reciba el pago del cliente y llame
// esto para guardarlo contra el pedido — es infraestructura, no código
// muerto.
export async function uploadPaymentProof(
  businessId: string,
  orderId: string,
  file: File
): Promise<{ error: string | null; url: string | null }> {
  const { error, buffer } = await sanitizeImageUpload(file);
  if (error || !buffer) {
    return { error, url: null };
  }

  const admin = createAdminClient();
  const path = `${businessId}/${orderId}.jpg`;

  const { error: uploadError } = await admin.storage
    .from("payment-proofs")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) {
    console.error("[uploadPaymentProof] error de storage:", uploadError);
    return { error: "No se pudo subir el comprobante, intenta de nuevo", url: null };
  }

  const { data } = admin.storage.from("payment-proofs").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("orders")
    .update({ payment_proof_url: url })
    .eq("id", orderId)
    .eq("business_id", businessId);

  if (dbError) {
    return { error: translateError(dbError), url: null };
  }

  return { error: null, url };
}
