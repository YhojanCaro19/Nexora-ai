import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, getUserAgent } from "@/lib/utils/request";
import { logLoginEvent } from "@/lib/services/loginEventService";

// Callback de Google OAuth — único método de autenticación de AVENTHRA.
// Intercambia el `code` por una sesión, resuelve el rol y manda al panel.
// Si el correo de la cuenta de Google NO tiene acceso (no es superadmin ni
// miembro de ningún negocio), cierra la sesión y lo manda a
// /solicitar-acceso — puede ser un correo distinto al que se registró en
// Contáctanos, o alguien que nunca pidió acceso.

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

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=No se pudo iniciar sesión`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=No se pudo iniciar sesión`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=No se pudo iniciar sesión`);
  }

  const { role, businessId } = await resolveRoleAndBusiness(supabase, user.id);

  // Correo de Google sin acceso a la plataforma.
  if (!role) {
    await supabase.auth.signOut();
    const email = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
    return NextResponse.redirect(`${origin}/solicitar-acceso${email}`);
  }

  // Log informativo de "Sesiones activas" (Perfil → Seguridad). Nunca
  // bloquea el flujo si falla.
  const ip = await getClientIp();
  const userAgent = await getUserAgent();
  await logLoginEvent(user.id, businessId, ip, userAgent);

  return NextResponse.redirect(`${origin}${ROLE_PREFIX[role] ?? "/login"}`);
}
