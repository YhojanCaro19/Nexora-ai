import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Log informativo de "Sesiones activas" (Perfil → Seguridad) — este
      // callback también crea una sesión real (Google OAuth, magic link,
      // recuperación de contraseña), así que queda registrado igual que
      // login() con email/contraseña. Nunca bloquea el flujo si falla.
      if (user) {
        const ip = await getClientIp();
        const userAgent = await getUserAgent();
        const { businessId } = await resolveRoleAndBusiness(supabase, user.id);
        await logLoginEvent(user.id, businessId, ip, userAgent);
      }

      // Si el link traía un destino explícito (ej. recuperación de contraseña
      // -> /actualizar-password), respetamos ese destino primero.
      // Solo aceptamos rutas relativas propias, para evitar open-redirect.
      if (next && next.startsWith("/")) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      if (user) {
        const { role } = await resolveRoleAndBusiness(supabase, user.id);
        const prefix = role ? ROLE_PREFIX[role] : undefined;
        return NextResponse.redirect(`${origin}${prefix ?? "/login"}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=No se pudo iniciar sesión`);
}