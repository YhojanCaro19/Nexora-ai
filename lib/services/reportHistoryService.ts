// lib/services/reportHistoryService.ts
//
// Historial de descargas del reporte diario (Reportes → Historial de
// reportes). Es un log de auditoría, solo insert + select — nunca se
// edita ni se borra una fila. Va por el cliente normal (no service role):
// `report_downloads` ya tiene policy de INSERT/SELECT para
// is_business_admin(business_id), así que el propio admin autenticado
// puede escribir su fila sin necesitar permisos elevados.
import { createClient } from "@/lib/supabase/server";

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
