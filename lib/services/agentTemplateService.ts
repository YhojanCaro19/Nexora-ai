// lib/services/agentTemplateService.ts
//
// Plantilla COMPLETA del agente por industria (industry_agent_templates):
// no solo qué herramientas vienen activadas — también saludo, tono,
// mensajes (escalamiento, fallback, fuera de horario, despedida), FAQs
// base, largo de respuesta y uso de emojis. Se usa en dos momentos:
// - superadmin la edita acá (Agentes → Plantillas por industria).
// - createAccountFromRequest (adminService.ts) la copia completa a
//   agent_configs cuando se crea un negocio nuevo, para que el admin no
//   empiece con el agente en blanco.
//
// RLS de esa tabla no tiene ninguna policy a propósito — solo se toca con
// el cliente admin (service role) desde acá, nunca desde el cliente normal.
import { createAdminClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import {
  AGENT_TOOLS,
  DEFAULT_INDUSTRY_TOOLS,
  sanitizeToolKeys,
  type AgentToolKey,
} from "@/lib/config/agentTools";
import { DEFAULT_INDUSTRY_AGENT_CONTENT } from "@/lib/config/industryAgentDefaults";
import { sanitizeFaqs, type FaqEntry } from "@/lib/services/agentConfigService";
import { industryTypes } from "@/lib/validators/businessSchema";

export interface IndustryTemplate {
  industryType: string;
  industryLabel: string;
  toolKeys: AgentToolKey[];
  personality: string;
  greetingMessage: string;
  escalationMessage: string;
  fallbackMessage: string;
  afterHoursMessage: string;
  farewellMessage: string;
  faqs: FaqEntry[];
  responseLength: string;
  useEmojis: boolean;
  restrictions: string;
}

export interface IndustryTemplateInput {
  toolKeys: string[];
  personality: string;
  greetingMessage: string;
  escalationMessage: string;
  fallbackMessage: string;
  afterHoursMessage: string;
  farewellMessage: string;
  faqs: FaqEntry[];
  responseLength: string;
  useEmojis: boolean;
  restrictions: string;
}

const TEMPLATE_COLUMNS =
  "industry_type, tool_keys, personality, greeting_message, escalation_message, " +
  "fallback_message, after_hours_message, farewell_message, faqs, response_length, " +
  "use_emojis, restrictions";

interface TemplateRow {
  industry_type: string;
  tool_keys: unknown;
  personality: string | null;
  greeting_message: string | null;
  escalation_message: string | null;
  fallback_message: string | null;
  after_hours_message: string | null;
  farewell_message: string | null;
  faqs: unknown;
  response_length: string | null;
  use_emojis: boolean | null;
  restrictions: string | null;
}

// Fila de la tabla -> IndustryTemplate, rellenando con el default en
// código cualquier campo que la fila todavía no tenga escrito (columna
// recién agregada, o fila que nunca se guardó desde el UI).
function rowToTemplate(industryType: string, industryLabel: string, row: TemplateRow | undefined): IndustryTemplate {
  const fallback = DEFAULT_INDUSTRY_AGENT_CONTENT[industryType];
  return {
    industryType,
    industryLabel,
    toolKeys: row ? sanitizeToolKeys(row.tool_keys) : (DEFAULT_INDUSTRY_TOOLS[industryType] ?? []),
    personality: row?.personality ?? fallback?.personality ?? "",
    greetingMessage: row?.greeting_message ?? fallback?.greetingMessage ?? "",
    escalationMessage: row?.escalation_message ?? fallback?.escalationMessage ?? "",
    fallbackMessage: row?.fallback_message ?? fallback?.fallbackMessage ?? "",
    afterHoursMessage: row?.after_hours_message ?? fallback?.afterHoursMessage ?? "",
    farewellMessage: row?.farewell_message ?? fallback?.farewellMessage ?? "",
    faqs: row?.faqs ? sanitizeFaqs(row.faqs) : (fallback?.faqs ?? []),
    responseLength: row?.response_length ?? fallback?.responseLength ?? "media",
    useEmojis: row?.use_emojis ?? fallback?.useEmojis ?? true,
    restrictions: row?.restrictions ?? fallback?.restrictions ?? "",
  };
}

export async function getIndustryTemplates(): Promise<IndustryTemplate[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("industry_agent_templates").select(TEMPLATE_COLUMNS);

  if (error) {
    // Los objetos de error de Supabase no siempre se ven completos en la
    // consola del navegador (Next.js los muestra como "{}") — se listan
    // los campos a mano para que el mensaje real quede visible.
    console.error("[getIndustryTemplates] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }

  const byIndustry = new Map<string, TemplateRow>();
  ((data ?? []) as unknown as TemplateRow[]).forEach((row) => byIndustry.set(row.industry_type, row));

  // Una entrada por cada industria conocida en el código, aunque la tabla
  // todavía no tenga fila para ella (usa el default de respaldo completo).
  return industryTypes.map(({ value, label }) => rowToTemplate(value, label, byIndustry.get(value)));
}

// Plantilla completa de UNA industria — usado al crear el negocio, para
// poblar agent_configs de punta a punta (no solo enabled_tools).
export async function getIndustryTemplate(industryType: string): Promise<IndustryTemplate> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("industry_agent_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("industry_type", industryType)
    .maybeSingle();

  const label = industryTypes.find((it) => it.value === industryType)?.label ?? industryType;
  return rowToTemplate(industryType, label, (data as unknown as TemplateRow) ?? undefined);
}

export async function updateIndustryTemplate(industryType: string, input: IndustryTemplateInput) {
  const validIndustry = industryTypes.some((it) => it.value === industryType);
  if (!validIndustry) {
    return { error: "Tipo de industria inválido" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("industry_agent_templates").upsert(
    {
      industry_type: industryType,
      // Nunca se guarda lo que venga del formulario tal cual — mismo
      // criterio que agentConfigService.ts: se filtra contra el catálogo
      // real y se sanitizan las FAQs antes de tocar la base.
      tool_keys: sanitizeToolKeys(input.toolKeys),
      personality: input.personality.trim(),
      greeting_message: input.greetingMessage.trim(),
      escalation_message: input.escalationMessage.trim(),
      fallback_message: input.fallbackMessage.trim(),
      after_hours_message: input.afterHoursMessage.trim(),
      farewell_message: input.farewellMessage.trim(),
      faqs: sanitizeFaqs(input.faqs),
      response_length: input.responseLength || "media",
      use_emojis: input.useEmojis,
      restrictions: input.restrictions.trim(),
    },
    { onConflict: "industry_type" }
  );

  if (error) {
    return { error: translateError(error) };
  }
  return { error: null };
}

export function getToolCatalog() {
  return AGENT_TOOLS;
}
