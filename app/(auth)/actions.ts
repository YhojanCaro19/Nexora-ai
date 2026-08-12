"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROLE_PREFIX: Record<string, string> = {
  superadmin: "/superadmin",
  admin: "/admin",
  colaborador: "/colaborador",
};

async function resolveRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (platformAdmin) return "superadmin";

  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  return membership?.role ?? null;
}

async function redirectByRole(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await resolveRole(supabase, user.id);
  const prefix = role ? ROLE_PREFIX[role] : undefined;
  redirect(prefix ?? "/login");
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  await redirectByRole(supabase);
}

// NOTA: el registro público (signup) fue eliminado intencionalmente.
// Las cuentas solo se crean desde el panel de super-admin usando la
// Admin API de Supabase (service_role), después de revisar una
// solicitud de contacto. Ver app/contacto/ y app/(dashboard)/admin/.

export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
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