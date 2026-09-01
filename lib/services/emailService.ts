// lib/services/emailService.ts
//
// Wrapper delgado sobre Resend — solo sabe enviar un correo, no decide a
// quién ni cuándo (eso vive en el cron de app/api/cron/daily-reports).
// El cliente de Resend se crea de forma perezosa (no en el top-level del
// módulo) para que importar este archivo nunca reviente el build si
// RESEND_API_KEY todavía no existe en el entorno — solo falla cuando de
// verdad se intenta enviar un correo sin la key configurada.
import { Resend } from "resend";
import type { DailySalesSummary } from "@/lib/services/reportService";
import { formatCurrency } from "@/lib/utils/currency";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY no está configurada");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// Cuerpo simple del correo — el detalle real (productos, logo, redes)
// vive en el PDF adjunto, esto es solo el aviso de que ya está listo.
function buildDailyReportEmailHtml(businessName: string, summary: DailySalesSummary): string {
  const total = formatCurrency(summary.totalRevenue, summary.business.countryIso2);
  return `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #111827; max-width: 480px; margin: 0 auto;">
      <h2 style="margin-bottom: 4px;">Reporte diario de ${businessName}</h2>
      <p style="color: #6b7280; margin-top: 0;">${summary.dateLabel}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Pedidos</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${summary.orderCount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">Total vendido</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700;">${total}</td>
        </tr>
      </table>
      <p style="color: #6b7280; font-size: 13px;">El detalle completo va en el PDF adjunto.</p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Generado automáticamente por AVENTHRA.</p>
    </div>
  `;
}

// Wrapper mínimo de envío — comparte el mismo criterio que el resto del
// archivo: no lanza, devuelve { error }.
async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ error: string | null }> {
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!fromAddress) {
    return { error: "RESEND_FROM_EMAIL no está configurada" };
  }
  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error("[sendEmail] error de Resend:", error);
      return { error: error.message || "No se pudo enviar el correo" };
    }
    return { error: null };
  } catch (err) {
    console.error("[sendEmail] excepción:", err);
    return { error: err instanceof Error ? err.message : "No se pudo enviar el correo" };
  }
}

function emailShell(bodyHtml: string): string {
  return `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #111827; max-width: 480px; margin: 0 auto; line-height: 1.6;">
      ${bodyHtml}
      <p style="color: #9ca3af; font-size: 12px; margin-top: 28px;">AVENTHRA</p>
    </div>
  `;
}

// Correo con el link para activar la cuenta tras pagar un plan. El link
// va SIEMPRE al correo con el que se pagó — abrirlo es la prueba de que la
// persona tiene acceso a ese correo (no hay OTP aparte). Ese mismo correo
// será su acceso con "Continuar con Google".
export async function sendRegistrationLinkEmail(
  to: string,
  data: { link: string; planName: string; expiresAt: string }
): Promise<{ error: string | null }> {
  const expira = new Date(data.expiresAt).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return sendEmail({
    to,
    subject: "Activa tu cuenta de AVENTHRA",
    html: emailShell(`
      <h2 style="margin-bottom: 4px;">¡Gracias por tu compra!</h2>
      <p>Recibimos tu pago del plan <strong>${data.planName}</strong>. Para
      activar tu cuenta, entra al siguiente enlace <strong>desde este mismo
      correo</strong> y completa los datos de tu negocio:</p>
      <p style="margin: 20px 0;">
        <a href="${data.link}" style="background: #4CC2E8; color: #000; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; display: inline-block;">Activar mi cuenta</a>
      </p>
      <p style="color: #6b7280; font-size: 13px;">Este correo (<strong>${to}</strong>)
      será tu forma de iniciar sesión con "Continuar con Google", así que
      asegúrate de tener acceso a él. El enlace vence el ${expira}.</p>
      <p style="color: #9ca3af; font-size: 12px;">Si no reconoces esta compra, ignora este mensaje.</p>
    `),
  });
}

// Confirmación de que la cuenta quedó lista y cómo entrar.
export async function sendAccountReadyEmail(
  to: string,
  data: { businessName: string }
): Promise<{ error: string | null }> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/login`;
  return sendEmail({
    to,
    subject: `Tu cuenta de AVENTHRA para ${data.businessName} está lista`,
    html: emailShell(`
      <h2 style="margin-bottom: 4px;">Tu cuenta está lista</h2>
      <p>Ya creamos la cuenta de <strong>${data.businessName}</strong>. Entra
      cuando quieras:</p>
      <p style="margin: 20px 0;">
        <a href="${loginUrl}" style="background: #4CC2E8; color: #000; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; display: inline-block;">Iniciar sesión</a>
      </p>
      <p style="color: #6b7280; font-size: 13px;">Usa "Continuar con Google" con el correo <strong>${to}</strong>.</p>
    `),
  });
}

// Aviso al correo ACTUAL de que alguien pidió cambiar la cuenta de acceso
// — así el dueño real se entera aunque la solicitud la haya hecho otra
// persona con acceso al panel.
export async function sendAccountChangeRequestedEmail(
  to: string,
  data: { requestedEmail: string }
): Promise<{ error: string | null }> {
  return sendEmail({
    to,
    subject: "Solicitud de cambio de cuenta de acceso — AVENTHRA",
    html: emailShell(`
      <h2 style="margin-bottom: 4px;">Recibimos una solicitud de cambio</h2>
      <p>Se pidió cambiar la cuenta de acceso de <strong>${to}</strong> a
      <strong>${data.requestedEmail}</strong>.</p>
      <p>Nuestro equipo va a verificar la identidad antes de aplicar el
      cambio. No tienes que hacer nada más por ahora.</p>
      <p style="color: #6b7280; font-size: 13px;">Si <strong>no</strong> fuiste
      tú, escríbenos de inmediato: es posible que alguien más tenga acceso a
      tu panel.</p>
    `),
  });
}

// Resultado de la solicitud — aprobada (a los dos correos) o rechazada (al
// correo actual).
export async function sendAccountChangeResolvedEmail(
  to: string,
  data: { approved: boolean; newEmail: string; note: string | null }
): Promise<{ error: string | null }> {
  const noteHtml = data.note
    ? `<p style="color: #6b7280; font-size: 13px;">Nota del equipo: ${data.note}</p>`
    : "";
  if (data.approved) {
    return sendEmail({
      to,
      subject: "Tu cuenta de acceso de AVENTHRA cambió",
      html: emailShell(`
        <h2 style="margin-bottom: 4px;">Cambio de cuenta aplicado</h2>
        <p>La cuenta de acceso ahora es <strong>${data.newEmail}</strong>.
        Desde ahora se inicia sesión con "Continuar con Google" usando ese
        correo.</p>
        ${noteHtml}
        <p style="color: #6b7280; font-size: 13px;">Si no reconoces este
        cambio, escríbenos de inmediato.</p>
      `),
    });
  }
  return sendEmail({
    to,
    subject: "Solicitud de cambio de cuenta — no aprobada",
    html: emailShell(`
      <h2 style="margin-bottom: 4px;">No pudimos aprobar el cambio</h2>
      <p>La solicitud para cambiar la cuenta de acceso a
      <strong>${data.newEmail}</strong> no fue aprobada.</p>
      ${noteHtml}
      <p style="color: #6b7280; font-size: 13px;">Puedes volver a
      solicitarlo desde tu perfil.</p>
    `),
  });
}

// No lanza — cualquier falla (key faltante, from sin verificar, Resend
// caído) se devuelve como { error } para que el caller decida si
// reintenta en la siguiente pasada del cron, nunca tumba el proceso.
export async function sendDailyReportEmail(
  to: string,
  businessName: string,
  pdfBuffer: Buffer,
  summary: DailySalesSummary
): Promise<{ error: string | null }> {
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!fromAddress) {
    return { error: "RESEND_FROM_EMAIL no está configurada" };
  }

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject: `Reporte diario de ${businessName} — ${summary.dateLabel}`,
      html: buildDailyReportEmailHtml(businessName, summary),
      attachments: [
        {
          filename: `reporte-${summary.dateIso}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error("[sendDailyReportEmail] error de Resend:", error);
      return { error: error.message || "No se pudo enviar el correo" };
    }
    return { error: null };
  } catch (err) {
    console.error("[sendDailyReportEmail] excepción:", err);
    return { error: err instanceof Error ? err.message : "No se pudo enviar el correo" };
  }
}
