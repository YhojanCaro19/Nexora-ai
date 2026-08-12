// lib/services/agentTemplateService.ts
//
// Plantillas de herramientas por industria (industry_agent_templates). RLS
// de esa tabla no tiene ninguna policy a propósito — solo se toca con el
// cliente admin (service role) desde acá, nunca desde el cliente normal.
import { createAdminClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import {
  AGENT_TOOLS,
  DEFAULT_INDUSTRY_TOOLS,
  sanitizeToolKeys,
  type AgentToolKey,
} from "@/lib/config/agentTools";
import { industryTypes } from "@/lib/validators/businessSchema";

export interface IndustryTemplate {
  industryType: string;
  industryLabel: string;
  toolKeys: AgentToolKey[];
}

export async function getIndustryTemplates(): Promise<IndustryTemplate[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("industry_agent_templates").select("industry_type, tool_keys");

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

  const byIndustry = new Map<string, AgentToolKey[]>();
  (data ?? []).forEach((row) => {
    byIndustry.set(row.industry_type, sanitizeToolKeys(row.tool_keys));
  });

  // Una entrada por cada industria conocida en el código, aunque la tabla
  // todavía no tenga fila para ella (usa el default de respaldo).
  return industryTypes.map(({ value, label }) => ({
    industryType: value,
    industryLabel: label,
    toolKeys: byIndustry.get(value) ?? DEFAULT_INDUSTRY_TOOLS[value] ?? [],
  }));
}

// Las keys que trae `industryType` HOY en la tabla (o el default si no hay
// fila) — usado al crear el negocio, para poblar agent_configs.enabled_tools.
export async function getToolKeysForIndustry(industryType: string): Promise<AgentToolKey[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("industry_agent_templates")
    .select("tool_keys")
    .eq("industry_type", industryType)
    .maybeSingle();

  if (data) return sanitizeToolKeys(data.tool_keys);
  return DEFAULT_INDUSTRY_TOOLS[industryType] ?? [];
}

export async function updateIndustryTemplate(industryType: string, toolKeys: string[]) {
  // Nunca se guarda lo que venga del formulario tal cual — se filtra contra
  // el catálogo real primero.
  const clean = sanitizeToolKeys(toolKeys);
  const validIndustry = industryTypes.some((it) => it.value === industryType);
  if (!validIndustry) {
    return { error: "Tipo de industria inválido" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("industry_agent_templates")
    .upsert({ industry_type: industryType, tool_keys: clean }, { onConflict: "industry_type" });

  if (error) {
    return { error: translateError(error) };
  }
  return { error: null };
}

export function getToolCatalog() {
  return AGENT_TOOLS;
}
