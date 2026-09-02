// proxy.ts (raíz del proyecto)
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { DEVICE_COOKIE, deviceFingerprint, logSessionDeviceMismatch } from '@/lib/auth/session-guard';

const ROLE_PREFIX: Record<string, string> = {
  superadmin: '/superadmin',
  admin: '/admin',
  colaborador: '/colaborador',
};

// Cierre de sesión por inactividad (60 minutos, para los 3 roles) —
// ventana móvil: cada request a una ruta del dashboard "toca" la cookie y
// reinicia el conteo, así que se mide inactividad real, no tiempo total
// conectado. Vive acá (no en una tabla ni en el JWT) porque proxy.ts ya es
// el único lugar que corre en CADA navegación del dashboard y sí puede
// escribir cookies desde un Server Component/ruta — a diferencia de
// getSessionProfile() (lib/auth/get-session.ts), que solo puede leerlas.
const INACTIVITY_COOKIE = 'aventhra_last_activity';
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

async function resolveRoleAndBusiness(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<{ role: string | null; businessId: string | null }> {
  const { data: platformAdmin } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (platformAdmin) return { role: 'superadmin', businessId: null };

  const { data: membership } = await supabase
    .from('business_members')
    .select('role, business_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  return { role: membership?.role ?? null, businessId: membership?.business_id ?? null };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDashboardRoute = Object.values(ROLE_PREFIX).some((p) => pathname.startsWith(p));
  if (!isDashboardRoute) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  // Sesión atada al dispositivo (ver lib/auth/session-guard.ts): si estas
  // cookies se copiaron a otro navegador/equipo, la huella del User-Agent
  // no coincide con la de cuando se inició sesión → se cierra la sesión de
  // verdad y se registra en el historial de seguridad. Si la cookie falta
  // (sesión previa a esta función, o expiró) se ata al dispositivo actual
  // más abajo, sin cerrar nada.
  const boundFp = request.cookies.get(DEVICE_COOKIE)?.value;
  const currentFp = await deviceFingerprint(request.headers.get('user-agent'));
  if (boundFp && boundFp !== currentFp) {
    const { businessId } = await resolveRoleAndBusiness(supabase, user.id);
    await supabase.auth.signOut({ scope: 'global' });
    await logSessionDeviceMismatch(user.id, businessId);
    const blocked = NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent('Tu sesión se abrió en otro dispositivo. Por seguridad la cerramos — vuelve a iniciar sesión.')}`,
        request.url
      )
    );
    blocked.cookies.delete(DEVICE_COOKIE);
    blocked.cookies.delete(INACTIVITY_COOKIE);
    return blocked;
  }

  // Inactividad: si la cookie ya existía y pasaron más de 60 minutos desde
  // la última vez que se tocó, se cierra la sesión de verdad (revoca el
  // refresh token, no solo se borra la cookie) antes de redirigir — igual
  // de real que "Cerrar sesión en todos los dispositivos" en Perfil, solo
  // que disparado automáticamente en vez de por el usuario.
  const lastActivityRaw = request.cookies.get(INACTIVITY_COOKIE)?.value;
  const lastActivity = lastActivityRaw ? Number(lastActivityRaw) : null;
  if (lastActivity && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
    await supabase.auth.signOut({ scope: 'global' });
    const redirectResponse = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('Tu sesión expiró por inactividad. Vuelve a iniciar sesión.')}`, request.url)
    );
    redirectResponse.cookies.delete(INACTIVITY_COOKIE);
    return redirectResponse;
  }

  const { role } = await resolveRoleAndBusiness(supabase, user.id);
  const ownPrefix = role ? ROLE_PREFIX[role] : undefined;

  if (!ownPrefix || !pathname.startsWith(ownPrefix)) {
    return NextResponse.redirect(new URL(ownPrefix ?? '/login', request.url));
  }

  // Primer request de una sesión que todavía no está atada a un
  // dispositivo → se ata al actual (sin cerrar nada). httpOnly + larga
  // duración para que no expire antes que la sesión de Supabase.
  if (!boundFp) {
    response.cookies.set(DEVICE_COOKIE, currentFp, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 400 * 24 * 60 * 60,
    });
  }

  // "Toca" la cookie en cada request válido — reinicia la ventana de 60
  // minutos. httpOnly: no debe ser legible ni manipulable desde JS del
  // navegador, es una señal de control de sesión, no un dato de UI.
  response.cookies.set(INACTIVITY_COOKIE, String(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: INACTIVITY_TIMEOUT_MS / 1000,
  });

  return response;
}

export const config = {
  matcher: ['/superadmin/:path*', '/admin/:path*', '/colaborador/:path*'],
};