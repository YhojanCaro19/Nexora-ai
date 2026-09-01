// lib/config/agentPreviewScripts.ts
//
// Guiones de la conversación de ejemplo de la vista previa de "Mi Agente".
// No hay uno por cada industria — se agrupan en unos pocos "arquetipos"
// según cómo compra el cliente (producto físico, comida/pedido, cita,
// taller, flores). El resto de la vista previa (saludo, "¿cómo pago?",
// emojis, tú/usted) es común a todos y vive en agent-preview.tsx.

export type PreviewArchetype = "retail" | "comida" | "cita" | "taller" | "flores";

// industry_type → arquetipo. Lo que no esté acá cae en "retail".
const INDUSTRY_ARCHETYPE: Record<string, PreviewArchetype> = {
  restaurant: "comida",
  cafe: "comida",
  bakery: "comida",
  ice_cream_shop: "comida",
  barbershop: "cita",
  beauty_salon: "cita",
  workshop: "taller",
  flower_store: "flores",
};

export function previewArchetypeFor(industryType: string | null | undefined): PreviewArchetype {
  return (industryType && INDUSTRY_ARCHETYPE[industryType]) || "retail";
}

export interface PreviewCtx {
  usted: boolean;
  length: string; // "corta" | "media" | "larga" | ""
  item: string; // nombre del producto/servicio real, o el genérico del arquetipo
  price: string | null; // precio ya formateado, o null si no hay catálogo
}

interface PreviewScript {
  // Cómo se refiere el cliente a lo que ofrece el negocio si no hay catálogo.
  genericItem: string;
  // Segundo mensaje del cliente (el primero, "Hola, buenos días", es común).
  clientQuestion: (item: string) => string;
  // Respuesta del agente a esa pregunta. Se escribe en "vos/tú"; el swap a
  // "usted" lo hace agent-preview.tsx.
  agentAnswer: (c: PreviewCtx) => string;
}

const withPrice = (base: string, price: string | null) =>
  price ? `${base} Cuesta ${price}.` : `${base}`;

export const PREVIEW_SCRIPTS: Record<PreviewArchetype, PreviewScript> = {
  retail: {
    genericItem: "esa referencia",
    clientQuestion: (item) => `¿Tienen ${item} disponible? ¿lo manejan en varias tallas o colores?`,
    agentAnswer: (c) =>
      c.length === "corta"
        ? withPrice(`Sí, ${c.item} está disponible.`, c.price)
        : withPrice(
            `¡Claro que sí! ${c.item} está disponible.`,
            c.price
          ) + " Lo manejamos en varias opciones — decime cuál buscás y te lo aparto.",
  },
  comida: {
    genericItem: "un combo",
    clientQuestion: (item) => `¿Tienen domicilio? quiero pedir ${item}`,
    agentAnswer: (c) =>
      c.length === "corta"
        ? withPrice(`Sí, hacemos domicilio.`, c.price)
        : withPrice(`¡Sí! Hacemos domicilio y también podés recoger en el local.`, c.price) +
          " ¿Te lo mando a tu dirección o pasás a recogerlo?",
  },
  cita: {
    genericItem: "ese servicio",
    clientQuestion: (item) => `¿Tienen disponibilidad para ${item} hoy?`,
    agentAnswer: (c) =>
      c.length === "corta"
        ? withPrice(`Sí, hoy tengo espacio en la tarde.`, c.price)
        : withPrice(`¡Claro! Hoy tengo espacio en la tarde para ${c.item}.`, c.price) +
          " ¿Te agendo? decime a qué hora te queda bien.",
  },
  taller: {
    genericItem: "el equipo",
    clientQuestion: (item) => `Se me dañó ${item}, ¿lo revisan?`,
    agentAnswer: (c) =>
      c.length === "corta"
        ? withPrice(`Sí, lo revisamos.`, c.price)
        : `Sí, lo revisamos sin problema. ${c.price ? `El diagnóstico cuesta ${c.price} y ` : "Con el diagnóstico "}te decimos qué tiene y cuánto sale el arreglo antes de tocar nada.`,
  },
  flores: {
    genericItem: "un arreglo",
    clientQuestion: (item) => `Quiero ${item} para un cumpleaños, ¿lo entregan a domicilio?`,
    agentAnswer: (c) =>
      c.length === "corta"
        ? withPrice(`Sí, hacemos entregas a domicilio.`, c.price)
        : withPrice(`¡Claro! ${c.item} lo podemos armar y lo entregamos a domicilio.`, c.price) +
          " ¿Para qué fecha y a qué dirección?",
  },
};
