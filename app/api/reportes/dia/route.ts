// app/api/reportes/dia/route.ts
//
// Descarga bajo demanda del reporte de HOY — el envío automático a
// medianoche es un paso aparte, todavía pendiente. Cada descarga exitosa
// queda registrada en report_downloads (ver Reportes → Historial de
// reportes).
import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { getDailySalesSummary } from "@/lib/services/reportService";
import { renderDailySalesReportPdf } from "@/lib/pdf/renderDailySalesReport";
import { logReportDownload } from "@/lib/services/reportHistoryService";
import { checkRateLimit } from "@/lib/utils/rateLimit";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const limit = checkRateLimit(`reporte-dia:${profile.userId}`, 10, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Demasiadas descargas seguidas. Espera ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const summary = await getDailySalesSummary(profile.businessId);
  if (!summary) {
    return NextResponse.json({ error: "No se pudo generar el reporte" }, { status: 500 });
  }

  const pdfBuffer = await renderDailySalesReportPdf(summary);
  const fileDate = summary.dateLabel.replace(/\s+/g, "-");

  // El PDF ya se generó bien — si el log falla no tiene sentido negarle
  // la descarga al admin por eso, solo se pierde ese renglón del
  // historial.
  const { error: logError } = await logReportDownload(profile.businessId, profile.userId, summary.dateIso);
  if (logError) {
    console.error("[GET /api/reportes/dia] no se pudo registrar la descarga:", logError);
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${fileDate}.pdf"`,
    },
  });
}
