"use client";

import { Monitor } from "lucide-react";
import { CardDescription } from "@/components/ui/card";
import { formatShortDateTime } from "@/lib/utils/date";
import { SignOutAllDevices } from "./sign-out-all-devices";
import type { LoginEvent } from "@/lib/services/loginEventService";

// Historial de EVENTOS de inicio de sesión, no una lista de sesiones
// activas revocables individualmente — Supabase Auth no expone eso vía
// SDK (confirmado leyendo el código fuente de @supabase/auth-js). Nunca
// prometer acá "cerrar esta sesión" fila por fila: la única acción real
// disponible es SignOutAllDevices (todos los dispositivos a la vez), que
// se reutiliza tal cual debajo de la lista en vez de duplicar un botón.
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
        Registro informativo de tus últimos inicios de sesión — no permite cerrar sesiones una por una, eso no es
        técnicamente posible con nuestro proveedor de autenticación. Para revocar acceso, usa el botón de abajo.
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

      <div className="w-full max-w-md border-t pt-5" style={{ borderColor: 'var(--nexora-line)' }}>
        <SignOutAllDevices />
      </div>
    </div>
  );
}
