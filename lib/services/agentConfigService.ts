// lib/services/agentConfigService.ts
//
// El agente de CADA negocio: nombre, personalidad/tono y el resto de la
// personalización (ver docs/decisions.md, "Personalización del agente:
// nunca reemplaza la capa de seguridad base") — todo esto tiene efecto
// real, agentEngineService.ts lo inyecta en el system prompt — y qué
// herramientas del catálogo tiene prendidas. Se crea automáticamente al
// aprobar una
// solicitud (ver createAccountFromRequest en adminService.ts), precargado
// con las herramientas por defecto de su industria — esta pantalla es
// donde el admin lo ve y lo ajusta.
import { createClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import { sanitizeToolKeys, type AgentToolKey } from "@/lib/config/agentTools";

export interface FaqEntry {
  question: string;
  answer: string;
}

// Nunca confiar en jsonb crudo de la base sin pasar por acá — filtra
// cualquier fila que no tenga la forma esperada (dato viejo, edición a
// mano) y descarta pares con pregunta o respuesta vacía.
export function sanitizeFaqs(value: unknown): FaqEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is { question: unknown; answer: unknown } => typeof v === "object" && v !== null)
    .map((v) => ({
      question: typeof v.question === "string" ? v.question.trim() : "",
      answer: typeof v.answer === "string" ? v.answer.trim() : "",
    }))
    .filter((v) => v.question && v.answer);
}

// `agent_configs` — personalización completa del agente. El motor
// (agentEngineService.ts) lee y usa todos estos campos; esta pantalla es
// donde el admin los edita.
export interface AgentConfig {
  name: string;
  personality: string;
  enabledTools: AgentToolKey[];
  systemPromptExtra: string;
  useEmojis: boolean;
  responseLength: string | null;
  language: string | null;
  priorityProducts: string[];
  restrictions: string;
  faqs: FaqEntry[];
  businessHours: string;
  greetingMessage: string;
  escalationMessage: string;
  fallbackMessage: string;
  afterHoursMessage: string;
  farewellMessage: string;
  acceptsCashPickup: boolean;
  bankName: string;
  bankAccountNumber: string;
}

export interface UpdateAgentConfigInput {
  name: string;
  personality: string;
  enabledTools: string[];
  systemPromptExtra: string;
  useEmojis: boolean;
  responseLength: string;
  language: string;
  priorityProducts: string[];
  restrictions: string;
  faqs: FaqEntry[];
  businessHours: string;
  greetingMessage: string;
  escalationMessage: string;
  fallbackMessage: string;
  afterHoursMessage: string;
  farewellMessage: string;
  acceptsCashPickup: boolean;
  bankName: string;
  bankAccountNumber: string;
}

export async function getAgentConfig(businessId: string): Promise<AgentConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_configs")
    .select(
      "name, personality, enabled_tools, system_prompt_extra, use_emojis, response_length, language, priority_products, restrictions, faqs, business_hours, greeting_message, escalation_message, fallback_message, after_hours_message, farewell_message, accepts_cash_pickup, bank_name, bank_account_number"
    )
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    console.error("[getAgentConfig] error:", error);
  }

  return {
    name: data?.name ?? "Tu Agente",
    personality: data?.personality ?? "",
    enabledTools: sanitizeToolKeys(data?.enabled_tools),
    systemPromptExtra: data?.system_prompt_extra ?? "",
    useEmojis: data?.use_emojis ?? false,
    responseLength: data?.response_length ?? null,
    language: data?.language ?? null,
    priorityProducts: Array.isArray(data?.priority_products) ? data.priority_products : [],
    restrictions: data?.restrictions ?? "",
    faqs: sanitizeFaqs(data?.faqs),
    businessHours: data?.business_hours ?? "",
    greetingMessage: data?.greeting_message ?? "",
    escalationMessage: data?.escalation_message ?? "",
    fallbackMessage: data?.fallback_message ?? "",
    afterHoursMessage: data?.after_hours_message ?? "",
    farewellMessage: data?.farewell_message ?? "",
    acceptsCashPickup: data?.accepts_cash_pickup ?? false,
    bankName: data?.bank_name ?? "",
    bankAccountNumber: data?.bank_account_number ?? "",
  };
}

export async function updateAgentConfig(
  businessId: string,
  input: UpdateAgentConfigInput
): Promise<{ error: string | null }> {
  const name = input.name.trim() || "Tu Agente";
  const clean = sanitizeToolKeys(input.enabledTools);

  const supabase = await createClient();
  const { error } = await supabase
    .from("agent_configs")
    .update({
      name,
      personality: input.personality.trim() || null,
      enabled_tools: clean,
      system_prompt_extra: input.systemPromptExtra.trim() || null,
      use_emojis: input.useEmojis,
      response_length: input.responseLength || null,
      language: input.language.trim() || null,
      priority_products: input.priorityProducts,
      restrictions: input.restrictions.trim() || null,
      faqs: sanitizeFaqs(input.faqs),
      business_hours: input.businessHours.trim() || null,
      greeting_message: input.greetingMessage.trim() || null,
      escalation_message: input.escalationMessage.trim() || null,
      fallback_message: input.fallbackMessage.trim() || null,
      after_hours_message: input.afterHoursMessage.trim() || null,
      farewell_message: input.farewellMessage.trim() || null,
      accepts_cash_pickup: input.acceptsCashPickup,
      bank_name: input.bankName.trim() || null,
      bank_account_number: input.bankAccountNumber.trim() || null,
    })
    .eq("business_id", businessId);

  if (error) {
    console.error("[updateAgentConfig] error:", error);
    return { error: translateError(error) };
  }
  return { error: null };
}
