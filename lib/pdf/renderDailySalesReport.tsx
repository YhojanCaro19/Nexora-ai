// lib/pdf/renderDailySalesReport.ts
import { renderToBuffer } from "@react-pdf/renderer";
import { DailySalesReportDocument } from "./DailySalesReportDocument";
import type { DailySalesSummary } from "@/lib/services/reportService";

export async function renderDailySalesReportPdf(summary: DailySalesSummary): Promise<Buffer> {
  return renderToBuffer(<DailySalesReportDocument summary={summary} />);
}
