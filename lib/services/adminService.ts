import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateTempPassword } from "@/lib/services/passwordService";
import { translateError } from "@/lib/errors/translate";
import { getToolKeysForIndustry } from "@/lib/services/agentTemplateService";

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

  // El agente arranca con las herramientas por defecto de esa industria —
  // esto tampoco se estaba creando antes (el negocio quedaba sin ninguna
  // fila en agent_configs, ni siquiera vacía).
  const defaultTools = await getToolKeysForIndustry(industryType);
  const { error: agentError } = await admin.from("agent_configs").insert({
    business_id: business.id,
    enabled_tools: defaultTools,
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
 */
export async function deleteBusiness(businessId: string): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { data: memberUserIds, error: rpcError } = await admin.rpc("delete_business_cascade", {
    target_business_id: businessId,
  });

  if (rpcError) {
    console.error("[deleteBusiness] error en la cascada de borrado:", rpcError);
    return { error: translateError(rpcError) };
  }

  for (const userId of (memberUserIds as string[] | null) ?? []) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      // Los datos del negocio ya se borraron correctamente en la
      // transacción de arriba — esto es un residuo de Auth a limpiar a
      // mano si llega a pasar, no se revierte lo ya borrado.
      console.error(`[deleteBusiness] no se pudo borrar el usuario de Auth ${userId}:`, error);
    }
  }

  return { error: null };
}

export interface BusinessWithOwner {
  id: string;
  name: string;
  industry_type: string;
  created_at: string;
  owner_id: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
}

export async function getBusinesses(): Promise<BusinessWithOwner[]> {
  // Vista de superadmin: cliente admin, no depende de RLS por-negocio.
  const admin = createAdminClient();
  const { data: businesses, error } = await admin
    .from("businesses")
    .select("id, name, industry_type, created_at, owner_id")
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

  // Datos del dueño: full_name/phone viven en business_members, el correo
  // solo existe en Auth (no se duplica en ninguna tabla), así que hace
  // falta una llamada aparte a la Admin API por cada negocio.
  return Promise.all(
    businesses.map(async (b) => {
      const [{ data: member }, { data: authUser }] = await Promise.all([
        admin
          .from("business_members")
          .select("full_name, phone")
          .eq("business_id", b.id)
          .eq("user_id", b.owner_id)
          .maybeSingle(),
        admin.auth.admin.getUserById(b.owner_id),
      ]);

      return {
        ...b,
        ownerName: member?.full_name ?? null,
        ownerEmail: authUser.user?.email ?? null,
        ownerPhone: member?.phone ?? null,
      };
    })
  );
}

export async function rejectRequest(requestId: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("contact_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);

  if (error) {
    return { error: translateError(error) };
  }
  return { error: null };
}