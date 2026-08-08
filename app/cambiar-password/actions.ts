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

// Cliente aparte, con service role, SOLO para esta escritura puntual que
// RLS no permite hacer a un usuario sobre su propia fila. Nunca se expone
// al cliente/navegador — esto corre exclusivamente en el server action.
const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function changePasswordAction(formData: FormData) {
  const parsed = schema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    redirect(`/cambiar-password?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  // Cliente normal (sujeto a sesión/RLS) solo para leer quién es el usuario
  // y para el cambio de contraseña en sí, que sí es una operación de auth
  // sobre el propio usuario y no pasa por RLS de tablas.
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error: authError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (authError) {
    redirect(`/cambiar-password?error=${encodeURIComponent(authError.message)}`);
  }

  // Con service role: apaga el flag real que lee getSessionProfile().
  // Solo tocamos esta columna, nunca role ni permissions, para no abrir
  // una puerta de escalación de privilegios desde este endpoint.
  const { error: memberError } = await supabaseAdmin
    .from("business_members")
    .update({ must_change_password: false })
    .eq("user_id", user.id);

  if (memberError) {
    redirect(`/cambiar-password?error=${encodeURIComponent(memberError.message)}`);
  }

  const { data: membership } = await supabaseAdmin
    .from("business_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  redirect(roleHome[membership?.role ?? ""] ?? "/login");
}