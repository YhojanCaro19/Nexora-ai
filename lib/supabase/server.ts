import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Cliente de Supabase para usar en Server Components y Route Handlers.
 * Usa la anon key + cookies de sesión — respeta RLS del usuario autenticado.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se puede ignorar si se llama desde un Server Component
            // (el middleware/proxy ya se encarga de refrescar la sesión)
          }
        },
      },
    }
  );
}

/**
 * Cliente ADMIN — usa la service_role key, se salta RLS.
 * Úsalo SOLO en Route Handlers para operaciones del agente que necesitan
 * escribir en varios negocios sin estar limitado por RLS del usuario final,
 * o para tareas administrativas. NUNCA lo importes en código de cliente.
 */
export function createAdminClient() {
  return createSupabaseJsClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Cliente de Supabase server-side, sea el de sesión (RLS del usuario) o el
 * admin (service role). Lo usan los servicios que a veces corren dentro de
 * una request con sesión y a veces desde un route handler / cron SIN sesión
 * (ej. el motor del agente llamado desde el webhook de canales): reciben un
 * `db?` opcional y hacen `db ?? await createClient()`.
 */
export type SupabaseServerClient =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;