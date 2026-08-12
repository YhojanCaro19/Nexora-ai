"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback?next=/actualizar-password`,
  });

  if (error) {
    console.error("[requestPasswordReset] error:", error);
    // No revelamos si el correo existe o no (evita enumeración de usuarios).
  }

  redirect("/recuperar-password?success=true");
}