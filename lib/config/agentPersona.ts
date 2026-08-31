// lib/config/agentPersona.ts
//
// Opciones fijas de persona/tono del agente que hoy son enums de texto en
// `agent_configs` (mismo criterio que RESPONSE_LENGTH_OPTIONS en el panel).
// El valor crudo se guarda en la base; el label se muestra en el panel; la
// frase se inyecta en el system prompt.

export const EMOJI_MODES = [
  { value: "ninguno", label: "Ninguno" },
  { value: "pocos", label: "Pocos, con moderación" },
  { value: "personalizado", label: "Estos que yo elijo" },
] as const;
export type EmojiMode = (typeof EMOJI_MODES)[number]["value"];

export const ADDRESS_FORMS = [
  { value: "auto", label: "Automático (que el agente decida)" },
  { value: "tu", label: "Tutear al cliente" },
  { value: "usted", label: "Tratar de usted" },
] as const;
export type AddressForm = (typeof ADDRESS_FORMS)[number]["value"];

const EMOJI_MODE_SET = new Set<string>(EMOJI_MODES.map((m) => m.value));
const ADDRESS_FORM_SET = new Set<string>(ADDRESS_FORMS.map((m) => m.value));

export function sanitizeEmojiMode(value: unknown): EmojiMode {
  return typeof value === "string" && EMOJI_MODE_SET.has(value) ? (value as EmojiMode) : "pocos";
}

export function sanitizeAddressForm(value: unknown): AddressForm {
  return typeof value === "string" && ADDRESS_FORM_SET.has(value)
    ? (value as AddressForm)
    : "auto";
}

// --- Métodos de pago -------------------------------------------------
// Cuentas para consignar/transferir — texto libre (banco/billetera + número),
// mismo criterio que antes (nunca un catálogo de bancos por país).
export interface PaymentMethod {
  label: string;
  detail: string;
}

// Filtra el jsonb crudo: descarta filas sin `label`. Ignora cualquier campo
// viejo (ej. `kind` del backfill inicial).
export function sanitizePaymentMethods(value: unknown): PaymentMethod[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      label: typeof v.label === "string" ? v.label.trim() : "",
      detail: typeof v.detail === "string" ? v.detail.trim() : "",
    }))
    .filter((v) => v.label.length > 0);
}

// Bloque para el system prompt: "Cuentas para transferir/consignar: …"
export function paymentMethodsPromptLine(methods: PaymentMethod[]): string | null {
  if (methods.length === 0) return null;
  const parts = methods.map((m) => (m.detail ? `${m.label}: ${m.detail}` : m.label));
  return `Cuentas para transferir o consignar que da el negocio: ${parts.join(" · ")}.`;
}
