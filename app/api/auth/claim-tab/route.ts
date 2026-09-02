// app/api/auth/claim-tab/route.ts
//
// Canje del grant de "login por pestaña" (ver
// components/dashboard/shared/TabSessionGuard.tsx). Solo la pestaña que
// completó el login de Google trae la cookie `av_tab_grant` (un solo uso,
// 2 min). Esta ruta la consume y responde ok; el cliente entonces marca la
// pestaña en sessionStorage. Sin grant → 403 → el cliente va a /login.
//
// No hace nada más que verificar sesión + consumir la cookie: no toca la
// base de datos.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionProfile } from "@/lib/auth/get-session";
import { TAB_GRANT_COOKIE } from "@/lib/auth/session-guard";

export async function POST() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const cookieStore = await cookies();
  const grant = cookieStore.get(TAB_GRANT_COOKIE)?.value;
  if (!grant) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // Un solo uso: cualquier otra pestaña que intente canjear después falla.
  cookieStore.delete(TAB_GRANT_COOKIE);
  return NextResponse.json({ ok: true });
}
