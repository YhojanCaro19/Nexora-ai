// lib/auth/require-module-access.ts
//
// Capa de "defensa en profundidad" para módulos operativos (Pedidos,
// Catálogo, ...) documentada en docs/architecture.md — "Regla de oro sobre
// permisos de colaborador": nunca confiar solo en ocultar el sidebar. La
// garantía real vive en RLS (ver el guard `require-module-access.sql`
// aplicado en Supabase); esto es lo que da un mensaje de error claro en
// vez de dejar pasar la petición hasta que RLS la rechace en silencio.
//
// Reglas:
// - admin: acceso total a los módulos operativos de su propio negocio.
// - colaborador: solo si el módulo está en su `permissions`.
// - cualquier otro caso (sin sesión, otro rol, sin negocio): sin acceso.
import { getSessionProfile } from "@/lib/auth/get-session";
import type { ModuleKey } from "@/lib/constants/nav-items";

export async function requireModuleAccess(moduleKey: ModuleKey): Promise<string | null> {
  const profile = await getSessionProfile();
  if (!profile || !profile.businessId) return null;

  if (profile.role === "admin") return profile.businessId;

  if (profile.role === "colaborador" && profile.permissions.includes(moduleKey)) {
    return profile.businessId;
  }

  return null;
}
