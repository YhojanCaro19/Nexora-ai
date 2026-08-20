import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateTempPassword } from "@/lib/services/passwordService";
import { translateError } from "@/lib/errors/translate";
import { getIndustryTemplate } from "@/lib/services/agentTemplateService";
import { getAgentUsageByBusiness } from "@/lib/services/agentUsageService";
import { AGENT_TOOLS, sanitizeToolKeys } from "@/lib/config/agentTools";
import { logPlatformAdminAction } from "@/lib/services/auditLogService";

export async function isCurrentUserPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return !!data;
}

export async function getContactRequests() {
  // Solo se lee con el cliente admin — no hay policy de SELECT pública
  // para contact_requests a propósito.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contact_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getContactRequests] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }
  return data;
}

export async function createAccountFromRequest(
  requestId: string,
  industryType: string,
  createdBy: string
) {
  const admin = createAdminClient();

  const { data: request, error: reqError } = await admin
    .from("contact_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (reqError || !request) {
    return { error: "Solicitud no encontrada", data: null };
  }

  const tempPassword = generateTempPassword();

  const { data: newUser, error: createError } =
    await admin.auth.admin.createUser({
      email: request.email,
      password: tempPassword,
      email_confirm: true, // el admin ya validó al cliente por fuera, no requiere reconfirmar correo
      user_metadata: {
        full_name: request.full_name,
        must_change_password: true,
      },
    });

  if (createError || !newUser.user) {
    return { error: translateError(createError), data: null };
  }

  // El negocio + la membresía admin. Antes esto no se creaba y el usuario
  // quedaba "huérfano" (existía en Auth pero sin rol en ningún lado), así
  // que el login lo devolvía a /login sin ningún error visible.
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({
      owner_id: newUser.user.id,
      name: request.business_name ?? request.full_name,
      industry_type: industryType,
      // Si la solicitud no trae país resuelto, se omite y queda el
      // default 'CO' de la columna en vez de forzar un valor incorrecto.
      ...(request.country_iso2 ? { country_iso2: request.country_iso2 } : {}),
    })
    .select()
    .single();

  if (businessError || !business) {
    console.error("[createAccountFromRequest] error al crear businesses:", {
      message: businessError?.message,
      code: businessError?.code,
      details: businessError?.details,
      hint: businessError?.hint,
    });
    // No dejar un usuario de Auth huérfano si esto falla.
    await admin.auth.admin.deleteUser(newUser.user.id);
    return { error: translateError(businessError), data: null };
  }

  // El trigger on_business_created (en Supabase) ya crea automáticamente
  // una fila mínima en business_members (business_id, user_id, role) apenas
  // se inserta el negocio, ANTES de que este código siga corriendo — así
  // que en vez de insertar una fila nueva (que duplicaría o chocaría con
  // la del trigger), se completa la que el trigger ya dejó con el resto de
  // los datos: nombre, teléfono, y el must_change_password que de verdad
  // importa para forzar el cambio de la contraseña temporal.
  const { error: memberError } = await admin
    .from("business_members")
    .update({
      full_name: request.full_name,
      phone: request.phone,
      must_change_password: true,
      created_by: createdBy,
    })
    .eq("business_id", business.id)
    .eq("user_id", newUser.user.id);

  if (memberError) {
    console.error("[createAccountFromRequest] error al completar business_members:", {
      message: memberError.message,
      code: memberError.code,
      details: memberError.details,
      hint: memberError.hint,
    });
    await admin.from("businesses").delete().eq("id", business.id);
    await admin.auth.admin.deleteUser(newUser.user.id);
    return { error: translateError(memberError), data: null };
  }

  // El agente arranca con la plantilla COMPLETA de esa industria — no solo
  // las herramientas (como era antes), también saludo, tono, mensajes y
  // FAQs base, así el admin nuevo no ve el agente en blanco la primera vez
  // que entra a Mi Agente.
  const template = await getIndustryTemplate(industryType);
  const { error: agentError } = await admin.from("agent_configs").insert({
    business_id: business.id,
    enabled_tools: template.toolKeys,
    personality: template.personality,
    greeting_message: template.greetingMessage,
    escalation_message: template.escalationMessage,
    fallback_message: template.fallbackMessage,
    after_hours_message: template.afterHoursMessage,
    farewell_message: template.farewellMessage,
    faqs: template.faqs,
    response_length: template.responseLength,
    use_emojis: template.useEmojis,
    restrictions: template.restrictions,
  });

  if (agentError) {
    // No es fatal para el flujo — el negocio y la cuenta ya existen y son
    // válidos. Se deja registrado para revisar, el admin puede configurar
    // sus herramientas después desde "Mi Agente".
    console.error("[createAccountFromRequest] error al crear agent_configs:", {
      message: agentError.message,
      code: agentError.code,
      details: agentError.details,
      hint: agentError.hint,
    });
  }

  await admin
    .from("contact_requests")
    .update({ status: "approved" })
    .eq("id", requestId);

  await logPlatformAdminAction(createdBy, "request_approved", business.id, business.name);

  return {
    error: null,
    data: {
      email: request.email,
      tempPassword,
    },
  };
}

/**
 * Elimina un negocio de verdad: todos sus datos (pedidos, productos,
 * config del agente, reservas, clientes, conversaciones, suscripciones,
 * miembros) y las cuentas de Auth de todos sus miembros (admin y
 * colaboradores) — no es un "desactivar", es borrado real e irreversible.
 *
 * El borrado de las tablas pasa por la función `delete_business_cascade`
 * en Postgres (ver SQL entregado al usuario), en una sola transacción:
 * si algo falla a mitad de camino, no queda nada borrado a medias. Borrar
 * las cuentas de Auth es un paso aparte porque eso no se puede hacer
 * desde SQL — solo con la Admin API.
 *
 * Decisión explícita del negocio: ya NO existe forma de eliminar un
 * negocio desde el panel — se reemplazó por habilitar/inhabilitar
 * (toggleBusinessActive, más abajo). Se quitó por completo, no se dejó
 * como acción de último recurso.
 */
export async function toggleBusinessActive(
  businessId: string,
  isActive: boolean,
  actingAdminUserId: string
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { error } = await admin.from("businesses").update({ is_active: isActive }).eq("id", businessId);

  if (error) {
    console.error("[toggleBusinessActive] error:", error);
    return { error: translateError(error) };
  }

  await logPlatformAdminAction(actingAdminUserId, isActive ? "business_enabled" : "business_disabled", businessId);
  return { error: null };
}

export interface BusinessAgentSummary {
  agentName: string;
  personality: string;
  greetingMessage: string;
  enabledToolLabels: string[];
}

// Cargado aparte del listado de negocios (no dentro de getBusinesses) —
// solo hace falta cuando el superadmin abre el detalle de un negocio
// puntual, no en cada fila de la lista.
export async function getBusinessAgentSummary(businessId: string): Promise<BusinessAgentSummary | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_configs")
    .select("name, personality, greeting_message, enabled_tools")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getBusinessAgentSummary] error:", error);
    return null;
  }

  const toolKeys = sanitizeToolKeys(data.enabled_tools);
  const enabledToolLabels: string[] = toolKeys
    .map((key) => AGENT_TOOLS.find((t) => t.key === key)?.label)
    .filter((label): label is (typeof AGENT_TOOLS)[number]["label"] => !!label);

  return {
    agentName: data.name || "Sin nombre configurado",
    personality: data.personality || "Sin personalidad configurada",
    greetingMessage: data.greeting_message || "Sin mensaje de bienvenida configurado",
    enabledToolLabels,
  };
}

export interface BusinessWithOwner {
  id: string;
  name: string;
  industry_type: string;
  created_at: string;
  owner_id: string;
  is_active: boolean;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  orderCount: number;
  customerCount: number;
  agentTokens: number;
  lastActivityAt: string | null;
}

export async function getBusinesses(): Promise<BusinessWithOwner[]> {
  // Vista de superadmin: cliente admin, no depende de RLS por-negocio.
  const admin = createAdminClient();
  const { data: businesses, error } = await admin
    .from("businesses")
    .select("id, name, industry_type, created_at, owner_id, is_active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getBusinesses] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }
  if (!businesses) return [];

  // Consumo del agente ya viene agregado por negocio en una sola consulta
  // (agentUsageService.ts) — se reutiliza acá en vez de volver a sumar
  // tokens por negocio uno por uno.
  const usageByBusiness = new Map(
    (await getAgentUsageByBusiness()).map((u) => [u.businessId, u])
  );

  // Datos del dueño: full_name/phone viven en business_members, el correo
  // solo existe en Auth (no se duplica en ninguna tabla), así que hace
  // falta una llamada aparte a la Admin API por cada negocio. Los conteos
  // de pedidos/clientes y la última actividad sí son específicos de cada
  // negocio, no hay forma de traerlos en una sola consulta agregada como
  // el consumo del agente.
  return Promise.all(
    businesses.map(async (b) => {
      const [{ data: member }, { data: authUser }, ordersResult, { count: customerCount }] = await Promise.all([
        admin
          .from("business_members")
          .select("full_name, phone")
          .eq("business_id", b.id)
          .eq("user_id", b.owner_id)
          .maybeSingle(),
        admin.auth.admin.getUserById(b.owner_id),
        admin
          .from("orders")
          .select("created_at", { count: "exact" })
          .eq("business_id", b.id)
          .order("created_at", { ascending: false })
          .limit(1),
        admin.from("customers").select("id", { count: "exact", head: true }).eq("business_id", b.id),
      ]);

      const usage = usageByBusiness.get(b.id);

      return {
        ...b,
        ownerName: member?.full_name ?? null,
        ownerEmail: authUser.user?.email ?? null,
        ownerPhone: member?.phone ?? null,
        orderCount: ordersResult.count ?? 0,
        customerCount: customerCount ?? 0,
        agentTokens: usage?.totalTokens ?? 0,
        lastActivityAt: ordersResult.data?.[0]?.created_at ?? null,
      };
    })
  );
}

/**
 * Para una lista de teléfonos (de solicitudes pendientes en Solicitudes),
 * busca si cada uno ya está registrado en `business_members` de OTRO
 * negocio y devuelve el nombre de ese negocio — es solo informativo para
 * el superadmin, nunca bloquea nada: un mismo dueño real puede tener
 * legítimamente varios negocios en AVENTHRA con el mismo teléfono, así que
 * el criterio de aprobar o no lo decide una persona, no el código.
 */
export async function getPhoneBusinessMatches(
  phones: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const uniquePhones = [...new Set(phones.filter((p): p is string => !!p))];
  if (uniquePhones.length === 0) return {};

  const admin = createAdminClient();
  const { data: members, error } = await admin
    .from("business_members")
    .select("phone, business_id")
    .in("phone", uniquePhones);

  if (error) {
    console.error("[getPhoneBusinessMatches] error al leer business_members:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {};
  }
  if (!members || members.length === 0) return {};

  const businessIds = [...new Set(members.map((m) => m.business_id))];
  const { data: businesses, error: bizError } = await admin
    .from("businesses")
    .select("id, name")
    .in("id", businessIds);

  if (bizError || !businesses) {
    console.error("[getPhoneBusinessMatches] error al leer businesses:", bizError);
    return {};
  }

  const nameById = new Map(businesses.map((b) => [b.id, b.name]));
  const matches: Record<string, string> = {};
  for (const m of members) {
    // Si el mismo teléfono ya matcheó con un negocio antes, se queda con
    // el primero — el aviso es informativo, no necesita listar todos.
    if (!m.phone || matches[m.phone]) continue;
    const name = nameById.get(m.business_id);
    if (name) matches[m.phone] = name;
  }
  return matches;
}

export async function rejectRequest(requestId: string, actingAdminUserId: string) {
  const admin = createAdminClient();

  const { data: request } = await admin
    .from("contact_requests")
    .select("full_name, business_name")
    .eq("id", requestId)
    .maybeSingle();

  const { error } = await admin
    .from("contact_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);

  if (error) {
    return { error: translateError(error) };
  }

  await logPlatformAdminAction(
    actingAdminUserId,
    "request_rejected",
    null,
    request?.business_name ?? request?.full_name ?? null
  );
  return { error: null };
}