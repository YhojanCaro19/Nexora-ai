// app/api/cron/channel-token-health/route.ts
//
// Salud de los tokens de `channel_connections` (Meta). Una vez por hora
// (Vercel Cron, ver vercel.json), pero el trabajo real solo pasa cada
// ~24 h por conexión (ver LAST_CHECK). Para cada conexión activa:
//   - pregunta a Meta por el token (`debug_token`)
//   - si el token ya no es válido → status "error" + `last_error`, para que
//     el admin vea "reconecta tu canal" en Perfil → Conectar redes
//   - si expira pronto (< 7 días) y sigue válido → solo se loguea; los
//     page tokens del login clásico normalmente NO expiran, así que esto
//     casi nunca dispara. Un refresco real necesitaría re-consentimiento
//     del negocio (no guardamos su user token) → se resuelve reconectando.
//
// Protegida igual que los otros crons: `Authorization: Bearer $CRON_SECRET`.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/utils/tokenCrypto";
import { debugToken, GraphApiError } from "@/lib/services/metaGraphClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_WARN_MS = 7 * 24 * 60 * 60 * 1000;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

interface Row {
  id: string;
  channel: string;
  external_name: string | null;
  access_token: string;
  token_expires_at: string | null;
  extra: Record<string, unknown> | null;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - CHECK_EVERY_MS).toISOString();

  const { data, error } = await admin
    .from("channel_connections")
    .select("id, channel, external_name, access_token, token_expires_at, extra")
    .eq("status", "active")
    .or(`extra->>tokenCheckedAt.is.null,extra->>tokenCheckedAt.lt.${cutoff}`);

  if (error) {
    console.error("[channel-token-health] error leyendo conexiones:", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const rows = (data as Row[] | null) ?? [];
  let checked = 0;
  let marked = 0;

  for (const row of rows) {
    checked += 1;
    let token: string;
    try {
      token = decryptToken(row.access_token);
    } catch {
      await mark(admin, row.id, "No se pudo descifrar el token guardado.");
      marked += 1;
      continue;
    }

    try {
      const meta = await debugToken(token);
      if (meta && meta.is_valid === false) {
        await mark(admin, row.id, "El permiso de este canal ya no es válido en Facebook.");
        marked += 1;
        continue;
      }
      const expMs = meta?.expires_at ? meta.expires_at * 1000 : 0;
      if (expMs > 0 && expMs - Date.now() < EXPIRY_WARN_MS) {
        console.warn(
          `[channel-token-health] ${row.channel} «${row.external_name}» expira pronto (${new Date(expMs).toISOString()})`
        );
      }
      await touch(admin, row.id, row.extra);
    } catch (err) {
      // Un error 190/OAuth = token muerto. Otros errores (red, 5xx) NO
      // marcan la conexión — se reintenta en la próxima corrida.
      if (err instanceof GraphApiError && (err.code === 190 || err.status === 400)) {
        await mark(admin, row.id, err.message);
        marked += 1;
      } else {
        console.error(`[channel-token-health] error consultando ${row.id}:`, err);
      }
    }
  }

  return NextResponse.json({ checked, marked });
}

async function mark(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  message: string
): Promise<void> {
  await admin
    .from("channel_connections")
    .update({ status: "error", last_error: message.slice(0, 500), updated_at: new Date().toISOString() })
    .eq("id", id);
}

async function touch(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  extra: Record<string, unknown> | null
): Promise<void> {
  await admin
    .from("channel_connections")
    .update({
      extra: { ...(extra ?? {}), tokenCheckedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}
