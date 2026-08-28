"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";

// AVENTHRA solo autentica con Google. No hay login con correo/contraseña,
// ni registro público, ni recuperación de contraseña — decisión explícita
// de seguridad (ver docs/decisions.md). Las cuentas se aprovisionan desde
// el panel de superadmin al aprobar una solicitud de /contacto: se crea el
// usuario en Supabase Auth con ese correo y SIN contraseña. La persona
// entra con "Continuar con Google" usando ese mismo correo; Supabase
// vincula la identidad de Google al usuario existente por email verificado.

export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
      // Fuerza el selector de cuenta de Google en cada login — si no,
      // cuando hay una sola sesión de Google activa Google se lo salta y
      // mete directo, sin dejar elegir otra cuenta.
      queryParams: { prompt: "select_account" },
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(translateError(error))}`);
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
