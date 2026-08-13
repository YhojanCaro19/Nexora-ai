"use server";

import { cookies } from "next/headers";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import { strongPasswordSchema } from "@/lib/validators/passwordSchema";
import { signOtpVerification, isOtpVerificationValid, OTP_COOKIE } from "@/lib/services/otpService";

export async function requestPasswordOtpAction() {
  const profile = await getSessionProfile();
  if (!profile) return { error: "No autorizado" };

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
  cookieStore.set(OTP_COOKIE.name, signOtpVerification(user.id), {
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
  if (!isOtpVerificationValid(otpCookie, user.id)) {
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
  return { error: null };
}
