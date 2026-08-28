"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { ownProfileSchema } from "@/lib/validators/profileSchema";
import { updateOwnProfile, signOutAllSessions, uploadAvatar, deleteAvatar } from "@/lib/services/profileService";
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
