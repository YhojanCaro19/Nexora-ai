"use client";

import { Monitor } from "lucide-react";
import { CardDescription } from "@/components/ui/card";
import { formatShortDateTime } from "@/lib/utils/date";
import type { LoginEvent } from "@/lib/services/loginEventService";

// Historial de EVENTOS de inicio de sesión, no una lista de sesiones
// activas revocables individualmente — Supabase Auth no expone eso vía
// SDK (confirmado leyendo el código fuente de @supabase/auth-js). Nunca
// prometer acá "cerrar esta sesión" fila por fila: la única acción real
// disponible es "Cerrar sesión en todos los dispositivos", que ya vive
// como su propia entrada en el menú de Seguridad — no se repite el botón
// acá abajo, sería el mismo control dos veces en la misma pantalla.
function describeUserAgent(userAgent: string | null): string {
  if (!userAgent || userAgent === "unknown") return "Dispositivo desconocido";

  let os = "dispositivo desconocido";
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac OS X") || userAgent.includes("Macintosh")) os = "macOS";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("Linux")) os = "Linux";

  let browser = "Navegador desconocido";
  if (userAgent.includes("Edg/")) browser = "Edge";
  else if (userAgent.includes("OPR/") || userAgent.includes("Opera")) browser = "Opera";
  else if (userAgent.includes("Firefox/")) browser = "Firefox";
  else if (userAgent.includes("Chrome/")) browser = "Chrome";
  else if (userAgent.includes("Safari/")) browser = "Safari";

  return `${browser} en ${os}`;
}

export function ActiveSessionsPreview({ events }: { events: LoginEvent[] }) {
  return (
    <div className="space-y-5 flex flex-col items-center text-center">
      <CardDescription>
        Historial de tus inicios de sesión — queda guardado como registro de seguridad, no desaparece al cerrar
        sesión (cerrar sesión revoca el acceso, no borra que ese inicio de sesión ocurrió). No permite cerrar
        sesiones una por una, eso no es técnicamente posible con nuestro proveedor de autenticación. Para revocar
        acceso, usa &quot;Cerrar sesión en todos los dispositivos&quot; en el menú de Seguridad.
      </CardDescription>

      {events.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>
          Todavía no hay registros de inicio de sesión.
        </p>
      ) : (
        <div className="w-full max-w-md space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-xl border p-3 text-left"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
            >
              <Monitor size={18} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
                  {describeUserAgent(event.userAgent)}
                </p>
                <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                  {formatShortDateTime(event.createdAt)}
                  {event.ip ? ` · ${event.ip}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
