import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateTempPassword } from "@/lib/services/passwordService";
import {
  collaboratorSchema,
  type CollaboratorInput,
} from "@/lib/validators/collaboratorSchema";
import { translateError } from "@/lib/errors/translate";

/**
 * Crea un colaborador: usuario de Supabase Auth + fila en business_members
 * con role = 'colaborador' y must_change_password = true.
 *
 * Usa service role (ver docs/architecture.md — "Cuándo usar service role vs
 * cliente normal"): no existe (ni debe existir) una policy de "cada quien
 * edita su fila" en business_members, así que esta escritura no puede pasar
 * por RLS del cliente normal.
 *
 * `businessId` y `createdBy` deben venir siempre de la sesión ya verificada
 * en el server action que llama a esta función, nunca del formulario.
 */
export async function createCollaborator(
  businessId: string,
  createdBy: string,
  input: CollaboratorInput
) {
  const parsed = collaboratorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true, // el admin ya conoce/valida al colaborador, no requiere reconfirmar correo
    user_metadata: {
      full_name: parsed.data.full_name,
    },
  });

  if (createError || !newUser.user) {
    return { error: translateError(createError), data: null };
  }

  const { error: memberError } = await admin.from("business_members").insert({
    business_id: businessId,
    user_id: newUser.user.id,
    role: "colaborador",
    full_name: parsed.data.full_name,
    phone: parsed.data.phone || null,
    permissions: parsed.data.permissions,
    must_change_password: true,
    created_by: createdBy,
  });

  if (memberError) {
    // El usuario de Auth ya se creó pero sin fila en business_members: se
    // elimina para no dejar una cuenta huérfana sin negocio asociado
    // (ver docs/decisions.md — "No hay signup público").
    await admin.auth.admin.deleteUser(newUser.user.id);
    console.error("[createCollaborator] error al crear business_members:", memberError);
    return { error: translateError(memberError), data: null };
  }

  return {
    error: null,
    data: {
      email: parsed.data.email,
      tempPassword,
    },
  };
}

/**
 * Elimina de verdad a un colaborador: borra su fila en business_members Y
 * su cuenta de Auth (no es un "desactivar", es borrado real, a propósito
 * — así lo pidió el negocio).
 *
 * Dos chequeos antes de borrar nada, no solo el id:
 * - `business_id` debe coincidir con el negocio del admin que llama —
 *   evita que un admin borre un colaborador de otro negocio adivinando un id.
 * - `role` debe ser 'colaborador' — esta función nunca debe poder borrar
 *   una fila de admin, aunque alguien pase el id equivocado.
 *
 * Usa service role: borrar un usuario de Auth solo se puede hacer con la
 * Admin API, nunca desde el cliente normal.
 */
export async function deleteCollaborator(
  collaboratorMemberId: string,
  businessId: string
): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { data: member, error: findError } = await admin
    .from("business_members")
    .select("id, user_id, role, business_id")
    .eq("id", collaboratorMemberId)
    .eq("business_id", businessId)
    .eq("role", "colaborador")
    .maybeSingle();

  if (findError || !member) {
    return { error: "Colaborador no encontrado" };
  }

  const { error: deleteMemberError } = await admin
    .from("business_members")
    .delete()
    .eq("id", member.id);

  if (deleteMemberError) {
    console.error("[deleteCollaborator] error al borrar business_members:", deleteMemberError);
    return { error: translateError(deleteMemberError) };
  }

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(member.user_id);
  if (deleteAuthError) {
    // La fila de business_members ya se borró — la cuenta de Auth queda
    // huérfana (sin negocio) pero no puede volver a iniciar sesión con
    // ningún rol válido, así que no es un hueco de seguridad, solo un
    // residuo que vale la pena limpiar a mano si esto llega a pasar.
    console.error("[deleteCollaborator] la fila se borró pero falló borrar el usuario de Auth:", deleteAuthError);
    return { error: "El colaborador se quitó del negocio, pero hubo un problema borrando su cuenta. Avisa para revisarlo." };
  }

  return { error: null };
}

export type CollaboratorListItem = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  permissions: string[];
  is_active: boolean;
};

/**
 * Lista los colaboradores del negocio del admin en sesión.
 *
 * La lectura de business_members usa el cliente normal (RLS vía is_business_member,
 * ver docs/database.md) — es exactamente el caso "lectura sobre datos propios
 * permitidos por política" de docs/architecture.md, no requiere service role.
 *
 * business_members no guarda el correo (vive en auth.users), así que se resuelve
 * aparte con la Admin API — es la única forma de leerlo, acotada a los
 * colaboradores ya confirmados como de este negocio.
 */
export async function getCollaborators(businessId: string): Promise<CollaboratorListItem[]> {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("business_members")
    .select("id, user_id, full_name, phone, permissions, is_active")
    .eq("business_id", businessId)
    .eq("role", "colaborador")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getCollaborators] error:", error);
    return [];
  }
  if (!members || members.length === 0) return [];

  const admin = createAdminClient();
  return Promise.all(
    members.map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      return {
        id: m.id,
        full_name: m.full_name,
        phone: m.phone,
        permissions: (m.permissions as string[]) ?? [],
        is_active: m.is_active,
        email: data?.user?.email ?? "—",
      };
    })
  );
}
