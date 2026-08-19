"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase/server";
import {
  createCollaborator,
  deleteCollaborator,
  updateCollaborator,
  setCollaboratorActive,
} from "@/lib/services/collaboratorService";
import {
  collaboratorSchema,
  collaboratorUpdateSchema,
  type CollaboratorInput,
  type CollaboratorUpdateInput,
} from "@/lib/validators/collaboratorSchema";
import { translateError } from "@/lib/errors/translate";
import { signOtpVerification, isOtpVerificationValid, OTP_COOKIE } from "@/lib/services/otpService";
import { checkRateLimit } from "@/lib/utils/rateLimit";

export async function createCollaboratorAction(input: CollaboratorInput) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado", data: null };
  }

  const parsed = collaboratorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const result = await createCollaborator(profile.businessId, profile.userId, parsed.data);
  revalidatePath("/admin/colaboradores");
  return result;
}

export async function updateCollaboratorAction(
  collaboratorMemberId: string,
  input: CollaboratorUpdateInput
) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado" };
  }

  const parsed = collaboratorUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await updateCollaborator(collaboratorMemberId, profile.businessId, parsed.data);
  revalidatePath("/admin/colaboradores");
  return result;
}

// Activar/desactivar es la alternativa a eliminar cuando solo se quiere
// quitar el acceso temporalmente — no requiere el flujo de OTP porque no
// borra nada, es reversible.
export async function setCollaboratorActiveAction(collaboratorMemberId: string, isActive: boolean) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado" };
  }

  const result = await setCollaboratorActive(collaboratorMemberId, profile.businessId, isActive);
  revalidatePath("/admin/colaboradores");
  return result;
}

// Eliminar un colaborador es un borrado real (cuenta de Auth incluida) —
// pide código de verificación al correo del admin antes de ejecutarlo, igual
// que Eliminar Negocio, reusando el mismo OTP.
export async function requestDeleteCollaboratorOtpAction() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") return { error: "No autorizado" };

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
    console.error("[requestDeleteCollaboratorOtpAction] error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return { error: translateError(error) };
  }
  return { error: null };
}

export async function verifyAndDeleteCollaboratorAction(collaboratorMemberId: string, code: string) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado" };
  }

  const limit = checkRateLimit(`delete-collaborator:${profile.userId}`, 5, 5 * 60 * 1000);
  if (!limit.allowed) {
    return { error: `Demasiados intentos. Espera ${limit.retryAfterSeconds}s y vuelve a intentarlo.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "No encontramos un correo asociado a tu cuenta" };

  const scope = `delete-collaborator:${collaboratorMemberId}`;
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(OTP_COOKIE.name)?.value;

  // Si ya hay una verificación vigente para ESTE colaborador puntual (ej.
  // el usuario ya verificó y solo está reintentando por un error previo),
  // no se le vuelve a pedir el código de Supabase — pero si no, se
  // verifica normal.
  if (!isOtpVerificationValid(existingCookie, user.id, scope)) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: user.email,
      token: code,
      type: "email",
    });

    if (verifyError) {
      console.error("[verifyAndDeleteCollaboratorAction] error de verificación:", {
        message: verifyError.message,
        status: verifyError.status,
        code: verifyError.code,
      });
      return { error: "Código incorrecto o vencido, pide uno nuevo." };
    }

    cookieStore.set(OTP_COOKIE.name, signOtpVerification(user.id, scope), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: OTP_COOKIE.maxAgeSeconds,
      path: "/",
    });
  }

  const result = await deleteCollaborator(collaboratorMemberId, profile.businessId);
  cookieStore.delete(OTP_COOKIE.name);
  revalidatePath("/admin/colaboradores");
  return result;
}
