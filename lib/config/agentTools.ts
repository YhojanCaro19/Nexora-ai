// lib/config/agentTools.ts
//
// Catálogo de herramientas del agente — fijo en código a propósito, igual
// que industryTypes en businessSchema.ts. Cada una implica lógica real de
// backend (no es un flag que "ya funciona" solo con prenderlo), así que
// crear una nueva es un cambio de código, no un dato editable desde el
// panel. Lo que SÍ es editable desde el panel es qué combinación de ESTAS
// herramientas trae cada industria por defecto (ver industry_agent_templates
// en Supabase y agentTemplateService.ts).
// "agendar_cita", "reservar_mesa" y "reservar_habitacion" existieron acá
// pero se quitaron a pedido explícito — no se van a implementar por ahora.
// Si en el futuro se retoman, hay que revisar DEFAULT_INDUSTRY_TOOLS abajo
// (varias industrias las usaban como default) y cualquier fila ya sembrada
// en industry_agent_templates que las mencione — sanitizeToolKeys() ya las
// filtra automáticamente en cualquier dato viejo, así que no rompen nada,
// solo dejan de ofrecerse.
export const AGENT_TOOLS = [
  { key: "tomar_pedido", label: "Tomar pedidos", description: "Registra pedidos de productos directamente en la conversación." },
  { key: "catalogo_productos", label: "Mostrar catálogo de productos", description: "Responde con productos disponibles, precios y fotos." },
  // Nunca "procesa" el pago ni decide si es válido — eso lo hace el
  // admin/colaborador (ver docs/decisions.md, regla de actores). El agente
  // solo recibe el comprobante que manda el cliente, se lo pasa al negocio,
  // y cuando el negocio ya decidió, le avisa al cliente si quedó aceptado
  // (comprobante real) o rechazado (comprobante falso).
  { key: "verificar_comprobante", label: "Verificar comprobante de pago", description: "Recibe el comprobante que envía el cliente, lo pasa al negocio para que lo revise, y le avisa al cliente si fue aceptado o rechazado." },
  { key: "responder_faq", label: "Responder preguntas frecuentes", description: "Horarios, ubicación, políticas, dudas comunes." },
  { key: "recordatorios", label: "Enviar recordatorios", description: "Avisa de citas o pedidos próximos automáticamente." },
] as const;

export type AgentToolKey = (typeof AGENT_TOOLS)[number]["key"];

// Del catálogo completo de 5 herramientas, estas 3 son las que ya tienen
// motor real detrás (services que consultan datos reales — ver
// agentEngineService.ts). Las otras 2 (verificar_comprobante, recordatorios)
// dependen de infraestructura que todavía no existe (verificar_comprobante
// necesita un flujo de revisión admin/colaborador + forma de recibir
// imágenes en la conversación; recordatorios necesita un scheduler) — si un
// admin las prende en Mi Agente, el motor las ignora silenciosamente en vez
// de ofrecerle al modelo una tool que promete algo que no puede cumplir.
export const SUPPORTED_TOOL_KEYS: readonly AgentToolKey[] = [
  "catalogo_productos",
  "tomar_pedido",
  "responder_faq",
];

export const AGENT_TOOL_KEYS: readonly string[] = AGENT_TOOLS.map((t) => t.key);

export const isValidAgentToolKey = (key: string): key is AgentToolKey =>
  (AGENT_TOOL_KEYS as string[]).includes(key);

// Nunca confiar en una lista de keys sin pasar por acá primero — filtra
// cualquier valor que no exista en el catálogo (dato viejo, fila editada a
// mano, lo que sea). Así, aunque algo raro llegue a `enabled_tools` o a una
// plantilla, jamás se interpreta como "ejecutar una herramienta inventada".
export const sanitizeToolKeys = (keys: unknown): AgentToolKey[] => {
  if (!Array.isArray(keys)) return [];
  return keys.filter((k): k is AgentToolKey => typeof k === "string" && isValidAgentToolKey(k));
};

// Plantilla de respaldo si la tabla industry_agent_templates no tiene fila
// para esa industria todavía (no debería pasar tras el seed inicial, pero
// mejor tener un default sensato que dejar el agente sin ninguna herramienta).
export const DEFAULT_INDUSTRY_TOOLS: Record<string, AgentToolKey[]> = {
  restaurant: ["tomar_pedido", "responder_faq", "recordatorios"],
  jewelry: ["catalogo_productos", "responder_faq"],
  barbershop: ["recordatorios", "responder_faq"],
  hotel: ["responder_faq", "recordatorios"],
  workshop: ["verificar_comprobante", "responder_faq"],
  clothing_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  phone_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  computer_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  pet_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  cafe: ["tomar_pedido", "responder_faq"],
  bakery: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  ice_cream_shop: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  makeup_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  beauty_salon: ["responder_faq"],
  accessories_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  appliance_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  home_decor_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  flower_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  toy_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  sporting_goods_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  stationery_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  bookstore: ["catalogo_productos", "tomar_pedido", "responder_faq"],
};
