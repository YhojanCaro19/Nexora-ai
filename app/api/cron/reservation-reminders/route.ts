// app/api/cron/reservation-reminders/route.ts
//
// Mantenimiento de reservas, una vez por hora (Vercel Cron, ver vercel.json):
//  1) Auto-completar: toda reserva activa cuyo `ends_at` ya pasó → status
//     "completed". La mesa/empleado queda libre (sale del exclusion
//     constraint) y la agenda deja de mostrarla como activa.
//  2) Recordatorio de confirmación ~1 día antes: reservas activas que
//     empiezan dentro de ~24 h y sin `reminder_sent_at` → se agrega un
//     mensaje de confirmación al hilo de conversación del cliente. Sin
//     canal saliente (WhatsApp aún no conectado) el mensaje queda en la
//     conversación (visible en el CRM); un worker de salida lo entregará
//     cuando exista.
//
// Protegida igual que /api/cron/daily-reports: header
// `Authorization: Bearer $CRON_SECRET` que Vercel agrega solo. Sin
// CRON_SECRET, rechaza todo.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getTimezoneForCountry, formatLongDateInTimezone } from "@/lib/utils/timezone";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOUR = 60 * 60 * 1000;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

interface DueReservation {
  id: string;
  business_id: string;
  customer_id: string | null;
  customer_name: string | null;
  kind: string;
  starts_at: string;
  party_size: number | null;
  service_name: string | null;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // 1) Auto-completar: toda reserva activa cuyo `ends_at` ya pasó se marca
  //    como "completed". Así sale del exclusion constraint y la mesa /
  //    empleado queda 100% libre, y la agenda deja de mostrarla como activa.
  const { data: completed } = await admin
    .from("reservations")
    .update({ status: "completed", updated_at: nowIso })
    .in("status", ["confirmed", "seated"])
    .lt("ends_at", nowIso)
    .select("id");
  const autoCompleted = (completed ?? []).length;

  // Ventana 23–25 h: con el cron corriendo cada hora, cada reserva cae en
  // exactamente una pasada (no se manda dos veces gracias a reminder_sent_at).
  const from = new Date(now + 23 * HOUR).toISOString();
  const to = new Date(now + 25 * HOUR).toISOString();

  const { data: due, error } = await admin
    .from("reservations")
    .select("id, business_id, customer_id, customer_name, kind, starts_at, party_size, service_name")
    .is("reminder_sent_at", null)
    .in("status", ["pending", "confirmed", "seated"])
    .gte("starts_at", from)
    .lte("starts_at", to);

  if (error) {
    console.error("[reservation-reminders] error leyendo reservas:", error);
    return NextResponse.json({ error: "No se pudieron leer las reservas" }, { status: 500 });
  }

  let sent = 0;
  let markedOnly = 0;
  let failed = 0;

  const businessCache = new Map<string, { name: string; tz: string }>();

  for (const r of (due as DueReservation[]) ?? []) {
    try {
      let biz = businessCache.get(r.business_id);
      if (!biz) {
        const { data: b } = await admin
          .from("businesses")
          .select("name, country_iso2")
          .eq("id", r.business_id)
          .maybeSingle();
        biz = {
          name: (b as { name: string } | null)?.name ?? "el negocio",
          tz: getTimezoneForCountry((b as { country_iso2: string | null } | null)?.country_iso2 ?? null),
        };
        businessCache.set(r.business_id, biz);
      }

      const start = new Date(r.starts_at);
      const fecha = formatLongDateInTimezone(start, biz.tz);
      const hora = new Intl.DateTimeFormat("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: biz.tz,
      }).format(start);
      const label = r.kind === "table" ? "reserva" : "cita";
      const detail = r.service_name ? ` (${r.service_name})` : r.party_size ? ` para ${r.party_size} personas` : "";
      const nombre = r.customer_name ? ` ${r.customer_name}` : "";
      const message =
        `Hola${nombre}, te recordamos tu ${label} en ${biz.name} para ${fecha} a las ${hora}${detail}. ` +
        `Queda confirmada. Si necesitas cambiarla o cancelarla, respóndenos por aquí.`;

      // Solo se puede "enviar" si el cliente tiene un hilo de conversación.
      if (r.customer_id) {
        const { data: convo } = await admin
          .from("conversations")
          .select("id, messages")
          .eq("business_id", r.business_id)
          .eq("customer_id", r.customer_id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (convo) {
          const nowIso = new Date().toISOString();
          const messages = [
            ...(((convo as { messages: unknown[] }).messages as unknown[]) ?? []),
            { role: "assistant", content: message, at: nowIso },
          ];
          await admin
            .from("conversations")
            .update({ messages, updated_at: nowIso })
            .eq("id", (convo as { id: string }).id);
          sent++;
        } else {
          markedOnly++;
        }
      } else {
        markedOnly++;
      }

      await admin.from("reservations").update({ reminder_sent_at: new Date().toISOString() }).eq("id", r.id);
    } catch (err) {
      failed++;
      console.error(`[reservation-reminders] error en reserva ${r.id}:`, err);
    }
  }

  return NextResponse.json({ autoCompleted, due: (due ?? []).length, sent, markedOnly, failed });
}
