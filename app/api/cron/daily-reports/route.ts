// app/api/cron/daily-reports/route.ts
//
// Envío automático del reporte diario a medianoche LOCAL de cada
// negocio (según su country_iso2), por correo al admin. No hay un cron
// por negocio — Vercel Cron llama esta ruta una vez por hora (ver
// vercel.json) y esta ruta decide, para cada negocio, si "ahora" cae
// dentro de la primera hora después de su medianoche local. Un negocio
// en Bogotá (UTC-5) y uno en Madrid (UTC+1) nunca disparan en la misma
// pasada del cron.
//
// Protegida contra invocación externa: Vercel agrega automáticamente el
// header `Authorization: Bearer $CRON_SECRET` en las llamadas que él
// mismo hace a rutas de cron, cuando CRON_SECRET está seteada como env
// var del proyecto — https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
// Sin CRON_SECRET configurada, esta ruta rechaza cualquier llamada (no
// hay forma de correrla "abierta" ni siquiera por accidente).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getTimezoneForCountry, startOfDayInTimezone } from "@/lib/utils/timezone";
import { getDailySalesSummary } from "@/lib/services/reportService";
import { renderDailySalesReportPdf } from "@/lib/pdf/renderDailySalesReport";
import { sendDailyReportEmail } from "@/lib/services/emailService";
import { wasAutoReportSentToday, logAutoReportSend } from "@/lib/services/reportHistoryService";

// Nunca cachear esta respuesta — cada corrida debe leer el reloj y la
// base de datos de nuevo.
export const dynamic = "force-dynamic";
// Sin efecto en plan Hobby (límite fijo de 10s ahí); en Pro/Enterprise le
// da margen a un lote de varios negocios generando PDF + enviando correo
// en la misma pasada. Ver docs.md de Vercel, "Configuring Maximum
// Duration".
export const maxDuration = 60;

// Ventana de "acaba de pasar medianoche local": si el cron corre en
// horas exactas (0 * * * *) y el negocio no tiene un offset con minutos
// (la gran mayoría), una sola pasada por hora ya cae justo en el primer
// minuto. La ventana de 1 hora es el colchón real: cubre offsets con
// :30 o :45 (India, Venezuela antes de 2016, etc.) y cualquier demora de
// Vercel al disparar el cron, sin arriesgar mandar el reporte dos veces
// gracias al chequeo contra report_email_log.
const WINDOW_MS = 60 * 60 * 1000;

function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sin secret configurada, nunca se autoriza
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

interface BusinessRow {
  id: string;
  name: string;
  country_iso2: string | null;
  contact_email: string | null;
  owner_id: string;
}

// El correo de contacto del negocio (Reportes → Personalizar PDF) manda.
// Si el admin nunca lo configuró, se cae al correo de la cuenta admin
// del negocio en business_members — nunca se deja un negocio sin
// destinatario solo porque contact_email está vacío.
async function resolveRecipientEmail(
  admin: ReturnType<typeof createAdminClient>,
  business: BusinessRow
): Promise<string | null> {
  if (business.contact_email) return business.contact_email;

  const { data: adminMember } = await admin
    .from("business_members")
    .select("user_id")
    .eq("business_id", business.id)
    .eq("role", "admin")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!adminMember) return null;

  const { data: authUser } = await admin.auth.admin.getUserById(adminMember.user_id);
  return authUser.user?.email ?? null;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: businesses, error: businessesError } = await admin
    .from("businesses")
    .select("id, name, country_iso2, contact_email, owner_id");

  if (businessesError) {
    console.error("[GET /api/cron/daily-reports] error leyendo negocios:", businessesError);
    return NextResponse.json({ error: "No se pudo leer la lista de negocios" }, { status: 500 });
  }

  let due = 0;
  let sent = 0;
  let skippedAlreadySent = 0;
  let failed = 0;

  for (const business of (businesses as BusinessRow[]) ?? []) {
    const timezone = getTimezoneForCountry(business.country_iso2);
    const startOfTodayLocal = startOfDayInTimezone(timezone, now);
    const msSinceLocalMidnight = now.getTime() - startOfTodayLocal.getTime();

    // Fuera de la ventana de la primera hora tras su medianoche local —
    // todavía no le toca a este negocio en esta pasada.
    if (msSinceLocalMidnight < 0 || msSinceLocalMidnight >= WINDOW_MS) continue;

    due++;

    try {
      // El reporte es del día que ACABA de cerrar (el que terminó justo
      // en esa medianoche local), no del día que recién empezó hace
      // minutos — por eso la fecha de referencia es un instante antes de
      // la medianoche local de hoy, no "now".
      const referenceForClosedDay = new Date(startOfTodayLocal.getTime() - 1);
      // `admin` en vez del cliente de sesión por defecto: este request no
      // trae cookies de ningún usuario (lo dispara Vercel Cron), así que
      // el cliente normal quedaría bloqueado por RLS en todas las tablas
      // que consulta getDailySalesSummary — ver comentario en
      // reportService.ts.
      const summary = await getDailySalesSummary(business.id, referenceForClosedDay, admin);

      if (!summary) {
        failed++;
        continue;
      }

      const alreadySent = await wasAutoReportSentToday(business.id, summary.dateIso);
      if (alreadySent) {
        skippedAlreadySent++;
        continue;
      }

      const recipient = await resolveRecipientEmail(admin, business);
      if (!recipient) {
        failed++;
        await logAutoReportSend(business.id, summary.dateIso, "-", "failed", "Sin correo de contacto ni admin con correo");
        continue;
      }

      const pdfBuffer = await renderDailySalesReportPdf(summary);
      const { error: sendError } = await sendDailyReportEmail(recipient, business.name, pdfBuffer, summary);

      if (sendError) {
        failed++;
        await logAutoReportSend(business.id, summary.dateIso, recipient, "failed", sendError);
        continue;
      }

      sent++;
      await logAutoReportSend(business.id, summary.dateIso, recipient, "sent");
    } catch (err) {
      failed++;
      console.error(`[GET /api/cron/daily-reports] error procesando negocio ${business.id}:`, err);
    }
  }

  return NextResponse.json({ due, sent, skippedAlreadySent, failed });
}
