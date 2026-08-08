// proxy.ts (raíz del proyecto)
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ROLE_PREFIX: Record<string, string> = {
  superadmin: '/superadmin',
  admin: '/admin',
  colaborador: '/colaborador',
};

async function resolveRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<string | null> {
  const { data: platformAdmin } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (platformAdmin) return 'superadmin';

  const { data: membership } = await supabase
    .from('business_members')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  return membership?.role ?? null;
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

  const role = await resolveRole(supabase, user.id);
  const ownPrefix = role ? ROLE_PREFIX[role] : undefined;

  if (!ownPrefix || !pathname.startsWith(ownPrefix)) {
    return NextResponse.redirect(new URL(ownPrefix ?? '/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/superadmin/:path*', '/admin/:path*', '/colaborador/:path*'],
};