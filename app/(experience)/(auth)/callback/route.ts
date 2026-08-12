import { NextResponse } from "next/server";
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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Si el link traía un destino explícito (ej. recuperación de contraseña
      // -> /actualizar-password), respetamos ese destino primero.
      // Solo aceptamos rutas relativas propias, para evitar open-redirect.
      if (next && next.startsWith("/")) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const role = await resolveRole(supabase, user.id);
        const prefix = role ? ROLE_PREFIX[role] : undefined;
        return NextResponse.redirect(`${origin}${prefix ?? "/login"}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=No se pudo iniciar sesión`);
}