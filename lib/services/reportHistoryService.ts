// lib/services/reportHistoryService.ts
//
// Historial de descargas del reporte diario (Reportes → Historial de
// reportes). Es un log de auditoría, solo insert + select — nunca se
// edita ni se borra una fila. Va por el cliente normal (no service role):
// `report_downloads` ya tiene policy de INSERT/SELECT para
// is_business_admin(business_id), así que el propio admin autenticado
// puede escribir su fila sin necesitar permisos elevados.
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface ReportDownloadRecord {
  id: string;
  downloadedAt: string;
  reportDate: string;
}

// No debe tumbar la descarga del PDF si falla — es un log, no el
// producto. El caller decide si loguear el error y seguir.
export async function logReportDownload(
  businessId: string,
  downloadedBy: string,
  reportDate: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("report_downloads").insert({
    business_id: businessId,
    downloaded_by: downloadedBy,
    report_date: reportDate,
  });

  if (error) {
    console.error("[logReportDownload] error:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function getReportDownloadHistory(businessId: string): Promise<ReportDownloadRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_downloads")
    .select("id, downloaded_at, report_date")
    .eq("business_id", businessId)
    .order("downloaded_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[getReportDownloadHistory] error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    downloadedAt: row.downloaded_at,
    reportDate: row.report_date,
  }));
}

// ---------------------------------------------------------------------
// Envío automático a medianoche (app/api/cron/daily-reports).
//
// Deliberadamente NO reutiliza `report_downloads`: esa tabla significa
// "un admin descargó el PDF manualmente" (ver report-history-list.tsx,
// que muestra "Descargado el ..."), y un envío automático no es eso —
// nadie lo pidió, se le mandó. Mezclarlos habría hecho que el Historial
// de reportes mostrará envíos automáticos como si el admin los hubiera
// descargado él mismo. `report_email_log` es la tabla nueva (ver SQL
// entregado al usuario) para este caso, con su propia policy de SELECT
// para is_business_admin — pero sin policy de INSERT, igual que
// agent_usage_log: se escribe con service role porque el cron no corre
// con la sesión de ningún usuario.
export async function wasAutoReportSentToday(businessId: string, reportDate: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("report_email_log")
    .select("id")
    .eq("business_id", businessId)
    .eq("report_date", reportDate)
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[wasAutoReportSentToday] error:", error);
    // Ante la duda, no se asume "ya enviado" — se prefiere arriesgar un
    // reintento (el envío en sí es idempotente para el usuario: recibe
    // el mismo PDF dos veces, no pierde nada) a arriesgar no enviarlo.
    return false;
  }
  return !!data;
}

export async function logAutoReportSend(
  businessId: string,
  reportDate: string,
  sentTo: string,
  status: "sent" | "failed",
  errorMessage?: string | null
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("report_email_log").insert({
    business_id: businessId,
    report_date: reportDate,
    sent_to: sentTo,
    status,
    error_message: errorMessage ?? null,
  });

  if (error) {
    console.error("[logAutoReportSend] error:", error);
  }
}

export interface AutoReportLogEntry {
  id: string;
  businessId: string;
  businessName: string;
  reportDate: string;
  sentTo: string;
  status: "sent" | "failed";
  errorMessage: string | null;
  sentAt: string;
}

// Vista de superadmin (Plataforma → Reportes): historial de envíos
// automáticos de TODOS los negocios, no solo el propio — a diferencia de
// getReportDownloadHistory/wasAutoReportSentToday, que son por negocio.
// Va con service role a propósito: `report_email_log` solo tiene policy
// de SELECT para is_business_admin(business_id) (ve su propio negocio),
// y el superadmin no es miembro de ningún negocio — la ruta ya está
// protegida en el layout (`profile.role !== 'superadmin' -> redirect`),
// así que no hace falta una policy nueva para este caso.
export async function getAutoReportSendLog(limit = 200): Promise<AutoReportLogEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("report_email_log")
    .select("id, business_id, report_date, sent_to, status, error_message, sent_at, businesses(name)")
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getAutoReportSendLog] error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    businessName: (row.businesses as unknown as { name: string } | null)?.name ?? "Negocio eliminado",
    reportDate: row.report_date,
    sentTo: row.sent_to,
    status: row.status as "sent" | "failed",
    errorMessage: row.error_message,
    sentAt: row.sent_at,
  }));
}
