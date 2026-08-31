// lib/config/escalationTriggers.ts
//
// Situaciones que SIEMPRE deben pasar a una persona real — el admin las
// prende con checkboxes en Mi Agente y el motor las mete en el system
// prompt como reglas duras ("si pasa X, no lo manejes tú, escala").
// Fijo en código a propósito, mismo criterio que AGENT_TOOLS: agregar una
// es un cambio de código, no un dato editable desde el panel.
//
// El mensaje de escalamiento (qué decir) sigue en `agent_configs.escalation_message`.
// Esto es el CUÁNDO, no el qué.
export const ESCALATION_TRIGGERS = [
  { key: "reclamos", label: "Reclamos y quejas" },
  { key: "devoluciones", label: "Devoluciones, cambios o garantías" },
  { key: "precios_especiales", label: "Precios especiales, descuentos o negociación" },
  { key: "cliente_molesto", label: "Cliente molesto o insatisfecho" },
  { key: "temas_legales", label: "Temas legales o delicados" },
  { key: "pedido_grande", label: "Pedidos grandes o al por mayor" },
] as const;

export type EscalationTriggerKey = (typeof ESCALATION_TRIGGERS)[number]["key"];

const VALID_KEYS = new Set<string>(ESCALATION_TRIGGERS.map((t) => t.key));

// Nunca confiar en el jsonb crudo de la base — filtra cualquier valor que
// no exista en el catálogo (dato viejo, fila editada a mano).
export function sanitizeEscalationTriggers(value: unknown): EscalationTriggerKey[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is EscalationTriggerKey => typeof v === "string" && VALID_KEYS.has(v)
  );
}

// Frase que va al system prompt cuando hay al menos un disparador activo.
export function escalationTriggersPromptLine(keys: EscalationTriggerKey[]): string | null {
  if (keys.length === 0) return null;
  const labels = ESCALATION_TRIGGERS.filter((t) => keys.includes(t.key)).map((t) =>
    t.label.toLowerCase()
  );
  return `SIEMPRE pasa la conversación a una persona real (usando el mensaje de escalamiento) si aparece cualquiera de estas situaciones, sin intentar resolverlas tú: ${labels.join("; ")}.`;
}
