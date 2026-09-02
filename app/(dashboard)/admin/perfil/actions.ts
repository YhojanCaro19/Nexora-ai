"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ownProfileSchema } from "@/lib/validators/profileSchema";
import { accountChangeRequestSchema } from "@/lib/validators/accountChangeSchema";
import { updateOwnProfile, signOutAllSessions, uploadAvatar, deleteAvatar } from "@/lib/services/profileService";
import {
  createAccountChangeRequest,
  cancelAccountChangeRequest,
} from "@/lib/services/accountChangeService";
import { logProfileSecurityEvent } from "@/lib/services/profileSecurityLogService";
import { checkRateLimit } from "@/lib/utils/rateLimit";

// AVENTHRA solo autentica con Google — no hay contraseña que cambiar. El
// flujo de OTP para cambio de contraseña que vivía acá se eliminó junto
// con /cambiar-password, /recuperar-password y /actualizar-password (ver
// docs/decisions.md — "Autenticación solo con Google"). El OTP como paso
// de re-verificación para acciones destructivas sigue vivo en
// colaboradores/actions.ts y superadmin/negocios/actions.ts.

export async function updateOwnProfileAction(input: { fullName: string; phone: string }) {
  const profile = await getSessionProfile();
  if (!profile || !profile.businessId) return { error: "No autorizado" };

  const parsed = ownProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await updateOwnProfile(profile.userId, profile.businessId, {
    fullName: parsed.data.fullName,
    phone: parsed.data.phone ?? "",
  });

  // result.field distingue el error de cooldown (30 días por campo) de
  // cualquier otro error — así el formulario puede resaltar el input que
  // corresponde en vez de mostrar un error genérico.
  if (!result.error) {
    await logProfileSecurityEvent(profile.userId, profile.businessId, "profile_updated");
  }

  revalidatePath("/admin/perfil");
  return result;
}

export async function uploadAvatarAction(file: File) {
  const profile = await getSessionProfile();
  if (!profile || !profile.businessId) return { error: "No autorizado", url: null };

  const limit = checkRateLimit(`upload-avatar:${profile.userId}`, 10, 60 * 1000);
  if (!limit.allowed) {
    return { error: `Demasiadas subidas seguidas. Espera ${limit.retryAfterSeconds}s.`, url: null };
  }

  const result = await uploadAvatar(profile.businessId, profile.userId, file);
  if (!result.error) {
    await logProfileSecurityEvent(profile.userId, profile.businessId, "avatar_updated");
  }
  revalidatePath("/admin/perfil");
  return result;
}

export async function deleteAvatarAction() {
  const profile = await getSessionProfile();
  if (!profile || !profile.businessId) return { error: "No autorizado" };

  const result = await deleteAvatar(profile.businessId, profile.userId);
  if (!result.error) {
    await logProfileSecurityEvent(profile.userId, profile.businessId, "avatar_updated");
  }
  revalidatePath("/admin/perfil");
  return result;
}

// Solicitud de cambio de cuenta de acceso (Google). No cambia nada por sí
// sola — crea una solicitud que el superadmin verifica y aprueba. Ver
// lib/services/accountChangeService.ts.
export async function requestAccountChangeAction(input: { requestedEmail: string; reason: string }) {
  const profile = await getSessionProfile();
  if (!profile || !profile.businessId) return { error: "No autorizado" };

  const limit = checkRateLimit(`account-change-request:${profile.userId}`, 3, 60 * 60 * 1000);
  if (!limit.allowed) {
    return { error: `Demasiados intentos. Espera ${limit.retryAfterSeconds}s y vuelve a intentarlo.` };
  }

  const parsed = accountChangeRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "No encontramos un correo asociado a tu cuenta" };

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("business_members")
    .select("phone")
    .eq("user_id", profile.userId)
    .eq("business_id", profile.businessId)
    .maybeSingle();

  const result = await createAccountChangeRequest({
    userId: profile.userId,
    businessId: profile.businessId,
    memberRole: profile.role,
    currentEmail: user.email,
    contactPhone: (member as { phone: string | null } | null)?.phone ?? null,
    input: parsed.data,
  });

  if (!result.error) {
    await logProfileSecurityEvent(profile.userId, profile.businessId, "account_change_requested");
  }

  revalidatePath("/admin/perfil");
  revalidatePath("/colaborador/perfil");
  return result;
}

export async function cancelAccountChangeAction(requestId: string) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "No autorizado" };

  const result = await cancelAccountChangeRequest(requestId, profile.userId);
  revalidatePath("/admin/perfil");
  revalidatePath("/colaborador/perfil");
  return result;
}

// Cierra todas las sesiones del usuario actual (todos los dispositivos) —
// signOutAllSessions() ya usa scope "global" en el cliente de sesión, que
// revoca todos los refresh tokens de esta cuenta Y limpia la cookie local
// de inmediato en un solo llamado (ver el comentario en profileService.ts
// sobre por qué NO se puede hacer esto por user_id vía la Admin API).
export async function signOutAllDevicesAction() {
  const profile = await getSessionProfile();
  if (!profile) return { error: "No autorizado" };

  const result = await signOutAllSessions();
  if (result.error) return result;

  // Antes del redirect: redirect() corta la ejecución del server action
  // (lanza internamente), así que cualquier código después de la línea
  // nunca corre. businessId puede faltar en teoría, igual que en
  // updateOwnPasswordAction — solo se loguea si existe.
  if (profile.businessId) {
    await logProfileSecurityEvent(profile.userId, profile.businessId, "signed_out_all_devices");
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
