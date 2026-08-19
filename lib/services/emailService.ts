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
