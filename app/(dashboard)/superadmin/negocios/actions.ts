"use server";

import { cookies } from "next/headers";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase/server";
import { deleteBusiness } from "@/lib/services/adminService";
import { translateError } from "@/lib/errors/translate";
import { signOtpVerification, isOtpVerificationValid, OTP_COOKIE } from "@/lib/services/otpService";
import { checkRateLimit } from "@/lib/utils/rateLimit";

async function requireSuperadmin() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "superadmin") return null;
  return profile;
}

// Borrar un negocio completo es la acción más destructiva de todo el
// panel — pide código de verificación por correo antes de dejar ejecutarla,
// igual que cambiar una contraseña en Perfil, reusando el mismo OTP.
export async function requestDeleteBusinessOtpAction() {
  const profile = await requireSuperadmin();
  if (!profile) return { error: "No autorizado" };

  const limit = checkRateLimit(`otp-request:${profile.userId}`, 3, 5 * 60 * 1000);
  if (!limit.allowed) {
    return { error: `Demasiados intentos. Espera ${limit.retryAfterSeconds}s y vuelve a intentarlo.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "No encontramos un correo asociado a tu cuenta" };

  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    console.error("[requestDeleteBusinessOtpAction] error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return { error: translateError(error) };
  }
  return { error: null };
}

export async function verifyDeleteBusinessOtpAction(businessId: string, code: string) {
  const profile = await requireSuperadmin();
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
    console.error("[verifyDeleteBusinessOtpAction] error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return { error: "Código incorrecto o vencido, pide uno nuevo." };
  }

  // Atado a ESTE negocio puntual — verificar el código no deja una
  // ventana abierta para borrar cualquier otro negocio.
  const cookieStore = await cookies();
  cookieStore.set(OTP_COOKIE.name, signOtpVerification(user.id, `delete-business:${businessId}`), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OTP_COOKIE.maxAgeSeconds,
    path: "/",
  });

  return { error: null };
}

export async function deleteBusinessAction(businessId: string) {
  const profile = await requireSuperadmin();
  if (!profile) return { error: "No autorizado" };

  const limit = checkRateLimit(`delete-business:${profile.userId}`, 5, 60 * 1000);
  if (!limit.allowed) {
    return { error: `Demasiados intentos. Espera ${limit.retryAfterSeconds}s y vuelve a intentarlo.` };
  }

  const cookieStore = await cookies();
  const otpCookie = cookieStore.get(OTP_COOKIE.name)?.value;
  if (!isOtpVerificationValid(otpCookie, profile.userId, `delete-business:${businessId}`)) {
    return { error: "Verifica el código enviado a tu correo antes de eliminar este negocio." };
  }

  const result = await deleteBusiness(businessId);
  // Un solo uso — no se reutiliza la misma verificación para un segundo borrado.
  cookieStore.delete(OTP_COOKIE.name);
  return result;
}
