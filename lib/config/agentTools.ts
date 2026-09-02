// lib/config/agentTools.ts
//
// Catálogo de herramientas del agente — fijo en código a propósito, igual
// que industryTypes en businessSchema.ts. Cada una implica lógica real de
// backend (no es un flag que "ya funciona" solo con prenderlo), así que
// crear una nueva es un cambio de código, no un dato editable desde el
// panel. Lo que SÍ es editable desde el panel es qué combinación de ESTAS
// herramientas trae cada industria por defecto (ver industry_agent_templates
// en Supabase y agentTemplateService.ts).
// Ojo: `catalogo_productos`, `responder_faq`, `agendar_cita` y
// `reservar_mesa` YA NO dependen del toggle de "Mi Agente" — el motor
// (agentEngineService) las expone siempre que el dato exista (catálogo/FAQ
// siempre; reservas si `booking_settings.mode != 'off'`). El toggle de
// `enabled_tools` solo controla `tomar_pedido` y `recordatorios`. Estas
// keys se mantienen acá para el seed por industria y la UI de Mi Agente.
// "reservar_habitacion" y "verificar_comprobante" siguen sin implementarse.
export const AGENT_TOOLS = [
  { key: "tomar_pedido", label: "Tomar pedidos", description: "Registra pedidos de productos directamente en la conversación." },
  { key: "catalogo_productos", label: "Mostrar catálogo de productos", description: "Responde con productos disponibles, precios y fotos." },
  { key: "responder_faq", label: "Responder preguntas frecuentes", description: "Horarios, ubicación, políticas, dudas comunes." },
  { key: "reservar_mesa", label: "Reservar mesas", description: "Consulta disponibilidad y reserva mesas para restaurantes (usa el módulo Reservas)." },
  { key: "agendar_cita", label: "Agendar turnos y citas", description: "Consulta horarios libres y agenda turnos con un empleado (usa el módulo Reservas)." },
  { key: "recordatorios", label: "Enviar recordatorios", description: "Avisa de citas o pedidos próximos automáticamente." },
] as const;

export type AgentToolKey = (typeof AGENT_TOOLS)[number]["key"];

// Del catálogo completo de 4 herramientas, estas 3 son las que ya tienen
// motor real detrás (services que consultan datos reales — ver
// agentEngineService.ts). La otra (recordatorios) depende de un scheduler
// que todavía no existe — si un admin la prende en Mi Agente, el motor la
// ignora silenciosamente en vez de ofrecerle al modelo una tool que
// promete algo que no puede cumplir.
export const SUPPORTED_TOOL_KEYS: readonly AgentToolKey[] = [
  "catalogo_productos",
  "tomar_pedido",
  "responder_faq",
  "reservar_mesa",
  "agendar_cita",
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
  restaurant: ["tomar_pedido", "reservar_mesa", "responder_faq", "recordatorios"],
  jewelry: ["catalogo_productos", "responder_faq"],
  barbershop: ["agendar_cita", "recordatorios", "responder_faq"],
  hotel: ["responder_faq", "recordatorios"],
  workshop: ["agendar_cita", "responder_faq"],
  clothing_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  phone_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  computer_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  pet_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  cafe: ["tomar_pedido", "responder_faq"],
  bakery: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  ice_cream_shop: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  makeup_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  beauty_salon: ["agendar_cita", "responder_faq"],
  accessories_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  appliance_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  home_decor_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  flower_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  toy_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  sporting_goods_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  stationery_store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
  bookstore: ["catalogo_productos", "tomar_pedido", "responder_faq"],
};
