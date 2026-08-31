// lib/config/orderVocabulary.ts
//
// El mismo `orders` con los mismos estados sirve para negocios que venden
// PRODUCTOS y para los que ofrecen SERVICIOS (una barbería toma "pedidos"
// que en realidad son citas). No hay columna servicio/producto en la base
// — se deriva de `businesses.industry_type`. Este archivo traduce el ciclo
// de vida del pedido al vocabulario correcto para cada caso, sin tocar el
// enum de estados (`ORDER_STATUSES` en lib/types/order.ts).
//
// Para un servicio, "enviado"/"recogido" no tiene sentido: el pedido pasa
// de confirmado a "atendido". Se reutiliza el estado `picked_up` como ese
// terminal "ya se hizo".
import type { OrderStatus } from "@/lib/types/order";

// Industrias donde un pedido = una cita / un trabajo, no una compra de algo
// físico que se despacha o se recoge.
const SERVICE_INDUSTRIES = new Set(["barbershop", "beauty_salon", "workshop"]);

export type OrderKind = "service" | "product";

export function orderKindFor(industryType: string | null | undefined): OrderKind {
  return industryType && SERVICE_INDUSTRIES.has(industryType) ? "service" : "product";
}

export interface OrderVocabulary {
  kind: OrderKind;
  /** Encabezado de la lista de ítems en el detalle. */
  itemsHeading: string;
  /** Nombre del estado para la pastilla y el paso actual del pipeline. */
  statusLabel: Record<OrderStatus, string>;
  /** Los 3 pasos del camino feliz (pendiente → medio → terminal). */
  steps: [string, string, string];
  /** Texto de la barra para aceptar desde `pending`. */
  acceptLabel: string;
  /** Texto del botón secundario de rechazo. */
  rejectLabel: string;
  /** Título del panel de rechazo. */
  rejectPanelTitle: string;
  /** Barras disponibles desde `confirmed` — cada una con el estado destino. */
  advanceFromConfirmed: { status: Extract<OrderStatus, "shipped" | "picked_up">; label: string }[];
  /** Nota cuando el pedido ya está en un estado terminal (no rechazado). */
  finishedNote: string;
}

const PRODUCT_VOCAB: OrderVocabulary = {
  kind: "product",
  itemsHeading: "Productos",
  statusLabel: {
    pending: "Pendiente",
    confirmed: "Confirmado",
    shipped: "Enviado",
    picked_up: "Recogido",
    rejected: "Rechazado",
  },
  steps: ["Pendiente", "Confirmado", "Entregado"],
  acceptLabel: "Deslizá para aceptar el pedido",
  rejectLabel: "Rechazar pedido",
  rejectPanelTitle: "Rechazar este pedido",
  advanceFromConfirmed: [
    { status: "shipped", label: "Deslizá: marcar como enviado" },
    { status: "picked_up", label: "Deslizá: marcar como recogido" },
  ],
  finishedNote: "Este pedido ya está finalizado.",
};

const SERVICE_VOCAB: OrderVocabulary = {
  kind: "service",
  itemsHeading: "Servicios",
  statusLabel: {
    pending: "Solicitada",
    confirmed: "Confirmada",
    shipped: "Atendida",
    picked_up: "Atendida",
    rejected: "Rechazada",
  },
  steps: ["Solicitada", "Confirmada", "Atendida"],
  acceptLabel: "Deslizá para confirmar la cita",
  rejectLabel: "Rechazar la cita",
  rejectPanelTitle: "Rechazar esta cita",
  advanceFromConfirmed: [{ status: "picked_up", label: "Deslizá: cliente atendido" }],
  finishedNote: "Esta cita ya se atendió.",
};

export function getOrderVocabulary(kind: OrderKind): OrderVocabulary {
  return kind === "service" ? SERVICE_VOCAB : PRODUCT_VOCAB;
}
