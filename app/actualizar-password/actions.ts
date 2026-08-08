"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createServiceClient } from "@supabase/supabase-js";
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

const roleHome: Record<string, string> = {
  admin: "/admin",
  colaborador: "/colaborador",
  superadmin: "/superadmin",
};

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function updatePasswordAction(formData: FormData) {
  const parsed = schema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    redirect(`/actualizar-password?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No hay sesión de recuperación activa (link vencido, ya usado, o
    // se entró directo a esta página sin pasar por el correo).
    redirect("/recuperar-password?error=El%20enlace%20expiró%20o%20ya%20fue%20usado%2C%20solicita%20uno%20nuevo");
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    redirect(`/actualizar-password?error=${encodeURIComponent(error.message)}`);
  }

  // Sincroniza el flag real por si este usuario también tenía pendiente
  // el cambio forzado de contraseña temporal — ya no aplica, la acaba de
  // definir él mismo.
  await supabaseAdmin
    .from("business_members")
    .update({ must_change_password: false })
    .eq("user_id", user.id);

  const { data: membership } = await supabaseAdmin
    .from("business_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  redirect(roleHome[membership?.role ?? ""] ?? "/login");
}