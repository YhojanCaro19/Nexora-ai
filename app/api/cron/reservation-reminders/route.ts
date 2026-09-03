// app/api/cron/reservation-reminders/route.ts
//
// Mantenimiento de reservas, una vez por hora (Vercel Cron, ver vercel.json):
//
//  1) Auto-completar: toda reserva activa cuyo `ends_at` ya pasó → status
//     "completed". La mesa/empleado queda libre (sale del exclusion
//     constraint) y la agenda deja de mostrarla como activa. Cada cita
//     completada con precio genera un pedido (venta del día del servicio).
//
//  2) Recordatorio — UNO por reserva (dedup con `reminder_sent_at`), y se
//     ENVÍA de verdad al cliente por su canal (Messenger/Instagram/WhatsApp
//     vía sendChannelMessage). El momento depende de cuándo es la cita:
//       - Mismo día  → ~1 h antes (cae en el tick :00 anterior).
//       - Al día siguiente o más → la tarde anterior (desde las 6 pm, hora
//         local del negocio), o sea el día antes.
//     Fuera de la ventana de 24 h de Messenger se usa el tag
//     CONFIRMED_EVENT_UPDATE. Si el envío falla igual (IG sin tag, WhatsApp
//     sin plantilla, token muerto, cliente sin conversación) → el mensaje
//     se agrega al hilo del CRM y se marca `reminder_sent_at` de todos
//     modos (no se reintenta).
//
// Protegida igual que /api/cron/daily-reports: header
// `Authorization: Bearer $CRON_SECRET` que Vercel agrega solo. Sin
// CRON_SECRET, rechaza todo.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getTimezoneForCountry, formatLongDateInTimezone } from "@/lib/utils/timezone";
import { recordCompletedAppointmentAsOrder } from "@/lib/services/reservationService";
import { getActiveConnection } from "@/lib/services/channelConnectionService";
import { sendChannelMessage } from "@/lib/services/metaChannelService";
import { isChannel } from "@/lib/types/channel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

// Recordatorio de "1 h antes": con el cron cada hora en punto, una cita a
// las 5:00 pm se avisa en el tick de las 4:00 pm (60 min). El tope de 105
// min cubre el caso de que un tick se salte (Vercel) y el siguiente ya
// esté a <105 min.
const SOON_MAX_MIN = 105;
// A partir de esta hora local del negocio se manda el recordatorio de "la
// tarde anterior" para las citas de mañana en adelante.
const EVENING_HOUR = 18;
// Cuánto hacia adelante se leen reservas cada tick.
const FETCH_HORIZON_H = 30;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// Date → "5:00 pm" en la zona del negocio (formato que lee la gente, no militar).
function to12hInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  })
    .format(date)
    .toLowerCase();
}

// Hora local del negocio ahora (0–23).
function localHour(tz: string, at: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: tz })
    .formatToParts(at)
    .find((p) => p.type === "hour")?.value;
  return Number(h ?? "0") % 24;
}

// "2026-09-03" en la zona del negocio.
function localDateStr(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
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

type Biz = { name: string; tz: string };
type DeliverOutcome = "sent" | "thread" | "unreachable";

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // ── 1) Auto-completar ──────────────────────────────────────────────────
  const { data: toComplete } = await admin
    .from("reservations")
    .select("id, business_id, kind")
    .in("status", ["confirmed", "seated"])
    .lt("ends_at", nowIso);

  let autoCompleted = 0;
  for (const rc of (toComplete as { id: string; business_id: string; kind: string }[]) ?? []) {
    const { error: upErr } = await admin
      .from("reservations")
      .update({ status: "completed", updated_at: nowIso })
      .eq("id", rc.id);
    if (upErr) continue;
    autoCompleted++;
    if (rc.kind === "appointment") {
      try {
        await recordCompletedAppointmentAsOrder(rc.business_id, rc.id, null, admin);
      } catch (err) {
        console.error(`[reservation-reminders] error registrando venta de la cita ${rc.id}:`, err);
      }
    }
  }

  // ── 2) Recordatorios ──────────────────────────────────────────────────
  const horizon = new Date(now + FETCH_HORIZON_H * HOUR).toISOString();

  const { data: due, error } = await admin
    .from("reservations")
    .select("id, business_id, customer_id, customer_name, kind, starts_at, party_size, service_name")
    .is("reminder_sent_at", null)
    .in("status", ["pending", "confirmed", "seated"])
    .gt("starts_at", nowIso)
    .lte("starts_at", horizon)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("[reservation-reminders] error leyendo reservas:", error);
    return NextResponse.json({ error: "No se pudieron leer las reservas" }, { status: 500 });
  }

  const businessCache = new Map<string, Biz>();
  let sent = 0;
  let threadOnly = 0;
  let unreachable = 0;
  let skipped = 0;
  let failed = 0;

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
      const minutesUntil = (start.getTime() - now) / MIN;
      const apptDate = localDateStr(start, biz.tz);
      const todayDate = localDateStr(new Date(now), biz.tz);
      const tomorrowDate = localDateStr(new Date(now + 24 * HOUR), biz.tz);

      // Qué ventana aplica ahora. Si ninguna, se revisa en un tick futuro.
      let windowKind: "soon" | "eve" | null = null;
      if (minutesUntil > 0 && minutesUntil <= SOON_MAX_MIN && apptDate === todayDate) {
        windowKind = "soon";
      } else if (
        minutesUntil > SOON_MAX_MIN &&
        apptDate === tomorrowDate &&
        localHour(biz.tz) >= EVENING_HOUR
      ) {
        windowKind = "eve";
      }
      if (!windowKind) {
        skipped++;
        continue;
      }

      const label = r.kind === "table" ? "reserva" : "cita";
      const hora = to12hInTz(start, biz.tz);
      const detail = r.service_name
        ? ` (${r.service_name})`
        : r.party_size
          ? ` para ${r.party_size} personas`
          : "";
      const nombre = r.customer_name ? ` ${r.customer_name}` : "";
      const message =
        windowKind === "soon"
          ? `Hola${nombre}, te recordamos tu ${label} HOY a las ${hora} en ${biz.name}${detail}. ¡Te esperamos! Si necesitas cambiarla, respóndenos por aquí.`
          : `Hola${nombre}, te recordamos tu ${label} MAÑANA ${formatLongDateInTimezone(start, biz.tz)} a las ${hora} en ${biz.name}${detail}. Queda confirmada. Si necesitas cambiarla o cancelarla, respóndenos por aquí.`;

      const outcome = await deliverReminder(admin, r, message, windowKind);
      if (outcome === "sent") sent++;
      else if (outcome === "thread") threadOnly++;
      else unreachable++;

      await admin
        .from("reservations")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", r.id);
    } catch (err) {
      failed++;
      console.error(`[reservation-reminders] error en reserva ${r.id}:`, err);
    }
  }

  return NextResponse.json({
    autoCompleted,
    due: (due ?? []).length,
    sent,
    threadOnly,
    unreachable,
    skipped,
    failed,
  });
}

// Entrega el recordatorio: intenta el canal real del cliente y, pase lo que
// pase, deja el mensaje en el hilo del CRM. Devuelve qué se logró.
async function deliverReminder(
  admin: ReturnType<typeof createAdminClient>,
  r: DueReservation,
  message: string,
  windowKind: "soon" | "eve"
): Promise<DeliverOutcome> {
  if (!r.customer_id) return "unreachable";

  const [{ data: customer }, { data: convo }] = await Promise.all([
    admin.from("customers").select("phone, channel").eq("id", r.customer_id).maybeSingle(),
    admin
      .from("conversations")
      .select("id, messages")
      .eq("business_id", r.business_id)
      .eq("customer_id", r.customer_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const channel = (customer as { channel: string | null } | null)?.channel ?? null;
  const externalId = (customer as { phone: string | null } | null)?.phone ?? null;

  let deliveredViaChannel = false;
  if (channel && isChannel(channel) && externalId) {
    const connection = await getActiveConnection(r.business_id, channel);
    if (connection) {
      // Fuera de la ventana de 24 h (recordatorio de "la tarde anterior")
      // Messenger deja usar este tag para una cita ya confirmada. En IG el
      // tag no aplica y en WhatsApp haría falta plantilla → si falla, cae
      // al hilo.
      const tag =
        channel === "messenger" && windowKind === "eve" ? "CONFIRMED_EVENT_UPDATE" : undefined;
      const res = await sendChannelMessage(connection, externalId, message, { tag });
      if (!res.error) {
        deliveredViaChannel = true;
      } else {
        console.warn(
          `[reservation-reminders] reserva ${r.id}: no se pudo enviar por ${channel} (${res.graphCode ?? "?"}): ${res.error} — queda en el hilo`
        );
      }
    }
  }

  // El mensaje va al hilo siempre que exista (visible en el CRM), aunque
  // también se haya enviado por el canal — los mensajes salientes no se
  // reflejan solos en `conversations.messages`.
  if (convo) {
    const at = new Date().toISOString();
    const existing = ((convo as { messages: unknown[] }).messages as unknown[]) ?? [];
    await admin
      .from("conversations")
      .update({ messages: [...existing, { role: "assistant", content: message, at }], updated_at: at })
      .eq("id", (convo as { id: string }).id);
    return deliveredViaChannel ? "sent" : "thread";
  }

  return deliveredViaChannel ? "sent" : "unreachable";
}
