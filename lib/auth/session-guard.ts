// lib/auth/session-guard.ts
//
// Sesión atada al dispositivo. La sesión de Supabase vive en cookies
// httpOnly (no viajan al copiar una URL), y `proxy.ts` ya manda a /login
// cualquier ruta del panel abierta sin sesión. Esto es la capa extra:
// si esas cookies se copian a OTRO navegador o equipo (sync del navegador,
// devtools, malware), la huella del User-Agent no coincide con la de
// cuando se inició sesión → `proxy.ts` cierra la sesión de verdad
// (`signOut` global) y registra el intento en el historial de seguridad.
//
// Límite conocido: si el atacante además falsea su User-Agent para que
// sea idéntico al de la víctima, la huella coincide. Es una barrera
// proporcional al riesgo de AVENTHRA (negocios pyme; Google ya cubre la
// seguridad a nivel de cuenta), no un anti-robo de sesión perfecto.
//
// Edge-safe: usa Web Crypto (`crypto.subtle`, global en Edge y Node) y un
// cliente `@supabase/supabase-js` propio (fetch, sin `next/headers`), para
// poder correr dentro de `proxy.ts`.
import { createClient } from "@supabase/supabase-js";

export const DEVICE_COOKIE = "av_dev";

// Huella estable del navegador/equipo: SHA-256 del User-Agent completo.
// Un cambio de navegador o de equipo la cambia; una actualización menor
// del mismo navegador normalmente no (Chrome congela la versión menor en
// el UA). Si cambia, el usuario vuelve a iniciar sesión una vez y se
// re-ata al navegador nuevo.
export async function deviceFingerprint(userAgent: string | null | undefined): Promise<string> {
  const data = new TextEncoder().encode((userAgent ?? "unknown").slice(0, 1024));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Registra "sesión usada desde otro dispositivo" en el historial personal
// (Perfil → Historial de seguridad). Va con service role porque
// `profile_security_events` no tiene policy de INSERT. Nunca lanza — es
// auditoría, no puede tumbar el cierre de sesión por seguridad.
// `businessId` null (superadmin) → no se registra, igual que el resto de
// eventos de seguridad.
export async function logSessionDeviceMismatch(
  userId: string,
  businessId: string | null
): Promise<void> {
  if (!businessId) return;
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    await admin.from("profile_security_events").insert({
      user_id: userId,
      business_id: businessId,
      event_type: "session_device_mismatch",
    });
  } catch (err) {
    console.error("[logSessionDeviceMismatch] error:", err);
  }
}
