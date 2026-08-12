// lib/config/agentTools.ts
//
// Catálogo de herramientas del agente — fijo en código a propósito, igual
// que industryTypes en businessSchema.ts. Cada una implica lógica real de
// backend (no es un flag que "ya funciona" solo con prenderlo), así que
// crear una nueva es un cambio de código, no un dato editable desde el
// panel. Lo que SÍ es editable desde el panel es qué combinación de ESTAS
// herramientas trae cada industria por defecto (ver industry_agent_templates
// en Supabase y agentTemplateService.ts).
export const AGENT_TOOLS = [
  { key: "tomar_pedido", label: "Tomar pedidos", description: "Registra pedidos de productos directamente en la conversación." },
  { key: "agendar_cita", label: "Agendar citas", description: "Reserva horarios disponibles (servicios, consultas)." },
  { key: "reservar_mesa", label: "Reservar mesas", description: "Gestiona reservas de mesa con fecha y hora." },
  { key: "reservar_habitacion", label: "Reservar habitaciones", description: "Gestiona disponibilidad y reservas de alojamiento." },
  { key: "catalogo_productos", label: "Mostrar catálogo de productos", description: "Responde con productos disponibles, precios y fotos." },
  { key: "cobrar", label: "Cobrar / procesar pagos", description: "Genera links de pago o confirma cobros." },
  { key: "responder_faq", label: "Responder preguntas frecuentes", description: "Horarios, ubicación, políticas, dudas comunes." },
  { key: "recordatorios", label: "Enviar recordatorios", description: "Avisa de citas o pedidos próximos automáticamente." },
] as const;

export type AgentToolKey = (typeof AGENT_TOOLS)[number]["key"];

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
  jewelry: ["catalogo_productos", "agendar_cita", "responder_faq"],
  barbershop: ["agendar_cita", "recordatorios", "responder_faq"],
  hotel: ["reservar_habitacion", "responder_faq", "recordatorios"],
  workshop: ["agendar_cita", "cobrar", "responder_faq"],
  store: ["catalogo_productos", "tomar_pedido", "responder_faq"],
};
