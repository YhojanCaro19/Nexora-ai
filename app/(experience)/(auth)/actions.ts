"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { getClientIp, getUserAgent } from "@/lib/utils/request";
import { logLoginEvent } from "@/lib/services/loginEventService";

const ROLE_PREFIX: Record<string, string> = {
  superadmin: "/superadmin",
  admin: "/admin",
  colaborador: "/colaborador",
};

async function resolveRoleAndBusiness(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ role: string | null; businessId: string | null }> {
  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (platformAdmin) return { role: "superadmin", businessId: null };

  const { data: membership } = await supabase
    .from("business_members")
    .select("role, business_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  return { role: membership?.role ?? null, businessId: membership?.business_id ?? null };
}

// ip/userAgent se calculan en login() (antes de este redirect) y se pasan
// acá porque headers() ya no es confiable de leer después de un redirect.
async function redirectByRole(supabase: Awaited<ReturnType<typeof createClient>>, ip: string, userAgent: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { role, businessId } = await resolveRoleAndBusiness(supabase, user.id);

  // Log informativo de "Sesiones activas" (Perfil → Seguridad) — nunca
  // debe impedir el login si falla, por eso va antes del redirect y
  // logLoginEvent() ya atrapa sus propios errores internamente.
  await logLoginEvent(user.id, businessId, ip, userAgent);

  const prefix = role ? ROLE_PREFIX[role] : undefined;
  redirect(prefix ?? "/login");
}

export async function login(formData: FormData) {
  const ip = await getClientIp();
  const userAgent = await getUserAgent();
  const limit = checkRateLimit(`login:${ip}`, 10, 60 * 1000);
  if (!limit.allowed) {
    redirect(`/login?error=${encodeURIComponent(`Demasiados intentos. Espera ${limit.retryAfterSeconds}s y vuelve a intentarlo.`)}`);
  }

  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(translateError(error))}`);
  }

  revalidatePath("/", "layout");
  await redirectByRole(supabase, ip, userAgent);
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