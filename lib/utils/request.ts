// lib/utils/request.ts
import { headers } from "next/headers";

// Para acciones sin sesión todavía (login, formulario de contacto) el
// único identificador que tenemos de quién está pidiendo algo es la IP.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

// String crudo del header, sin parsear a "Safari en macOS" — un parser de
// user-agent confiable es una dependencia nueva que no se justifica solo
// para el log de "Sesiones activas" (ver loginEventService.ts).
export async function getUserAgent(): Promise<string> {
  const h = await headers();
  return h.get("user-agent") ?? "unknown";
}
