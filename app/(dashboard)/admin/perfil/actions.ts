"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import { strongPasswordSchema } from "@/lib/validators/passwordSchema";
import { ownProfileSchema } from "@/lib/validators/profileSchema";
import { signOtpVerification, isOtpVerificationValid, OTP_COOKIE } from "@/lib/services/otpService";
import { updateOwnProfile, signOutAllSessions, uploadAvatar, deleteAvatar } from "@/lib/services/profileService";
import { logProfileSecurityEvent } from "@/lib/services/profileSecurityLogService";
import { checkRateLimit } from "@/lib/utils/rateLimit";

export async function requestPasswordOtpAction() {
  const profile = await getSessionProfile();
  if (!profile) return { error: "No autorizado" };

  // Mismo namespace de rate limit que usan colaboradores/actions.ts y
  // superadmin/negocios/actions.ts para este mismo mecanismo de OTP — a
  // propósito compartido por usuario en vez de acotado a esta pantalla,
  // así nadie lo esquiva disparando el flujo desde otra pantalla.
  const limit = checkRateLimit(`otp-request:${profile.userId}`, 3, 5 * 60 * 1000);
  if (!limit.allowed) {
    return { error: `Demasiados intentos. Espera ${limit.retryAfterSeconds}s y vuelve a intentarlo.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "No encontramos un correo asociado a tu cuenta" };

  // No crea una cuenta nueva ni inicia sesión de verdad — solo dispara el
  // envío del código a un usuario que YA existe y ya está logueado.
  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    console.error("[requestPasswordOtpAction] error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return { error: translateError(error) };
  }
  return { error: null };
}

export async function verifyPasswordOtpAction(code: string) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "No autorizado" };

  const limit = checkRateLimit(`otp-verify:${profile.userId}`, 5, 5 * 60 * 1000);
  if (!limit.allowed) {
    return { error: `Demasiados intentos. Espera ${limit.retryAfterSeconds}s y vuelve a intentarlo.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "No encontramos un correo asociado a tu cuenta" };

  const { error } = await supabase.auth.verifyOtp({
    email: user.email,
    token: code,
    type: "email",
  });

  if (error) {
    console.error("[verifyPasswordOtpAction] error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return { error: "Código incorrecto o vencido, pide uno nuevo." };
  }

  const cookieStore = await cookies();
  cookieStore.set(OTP_COOKIE.name, signOtpVerification(user.id, "password-change"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OTP_COOKIE.maxAgeSeconds,
    path: "/",
  });

  return { error: null };
}

export async function updateOwnPasswordAction(password: string) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "No autorizado" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const cookieStore = await cookies();
  const otpCookie = cookieStore.get(OTP_COOKIE.name)?.value;
  if (!isOtpVerificationValid(otpCookie, user.id, "password-change")) {
    return { error: "Verifica el código enviado a tu correo antes de cambiar la contraseña." };
  }

  const parsed = strongPasswordSchema.safeParse(password);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: translateError(error) };

  // Un solo uso — no se reutiliza la misma verificación para un segundo cambio.
  cookieStore.delete(OTP_COOKIE.name);

  // No bloquea la respuesta si falla — es un log de auditoría, la
  // contraseña ya quedó cambiada. businessId puede faltar en teoría (esta
  // action no lo exige como los otros), así que solo se loguea si existe.
  if (profile.businessId) {
    await logProfileSecurityEvent(profile.userId, profile.businessId, "password_changed");
  }

  return { error: null };
}

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

// Cierra todas las sesiones del usuario actual (todos los dispositivos),
// nunca de otro usuario — profile.userId sale de getSessionProfile(), no
// de un parámetro. Además de revocar globalmente, cierra la sesión local
// de este mismo request (igual que logout() en (experience)/(auth)/actions.ts)
// para que el navegador actual quede deslogueado de inmediato: el access
// token ya emitido es un JWT de corta duración que seguiría "viéndose"
// válido hasta su expiración natural si solo se revocara el refresh token.
export async function signOutAllDevicesAction() {
  const profile = await getSessionProfile();
  if (!profile) return { error: "No autorizado" };

  const result = await signOutAllSessions(profile.userId);
  if (result.error) return result;

  // Antes del redirect: redirect() corta la ejecución del server action
  // (lanza internamente), así que cualquier código después de la línea
  // nunca corre. businessId puede faltar en teoría, igual que en
  // updateOwnPasswordAction — solo se loguea si existe.
  if (profile.businessId) {
    await logProfileSecurityEvent(profile.userId, profile.businessId, "signed_out_all_devices");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
