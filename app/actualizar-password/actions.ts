"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[a-z]/, "Debe incluir al menos una minúscula")
    .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
    .regex(/[0-9]/, "Debe incluir al menos un número")
    .regex(/[^a-zA-Z0-9]/, "Debe incluir al menos un carácter especial"),
});

export async function updatePasswordAction(formData: FormData) {
  const parsed = schema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    redirect(`/actualizar-password?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const supabase = await createClient();

  // Requiere que exista una sesión de recuperación activa (creada por el
  // enlace del correo, ya intercambiada en /auth/callback).
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    data: { must_change_password: false },
  });

  if (error) {
    redirect(`/actualizar-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}