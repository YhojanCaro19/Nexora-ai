// app/api/cron/monthly-stats-snapshot/route.ts
//
// Cierra y guarda las estadísticas del mes recién terminado en
// `platform_monthly_stats` (ver platformStatsService.ts). Vercel Cron
// llama esta ruta cada hora (ver vercel.json); acá se decide si hoy es
// el día 1 del mes (UTC) y si ese mes anterior ya quedó capturado como
// `is_final` — si ya se hizo, se salta. Mismo esquema que
// marketing-metrics: cron horario, gating interno por fecha.
//
// Es solo un respaldo permanente por si algún día hace falta archivar o
// purgar las tablas de origen — Estadísticas ya no depende de esto para
// mostrar nada, siempre calcula en vivo. Corre en producción (los crons
// no corren en local, ver CLAUDE.md).
import { NextResponse } from "next/server";
import { monthIsSaved, snapshotMonth } from "@/lib/services/platformStatsService";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const now = new Date();
  if (now.getUTCDate() !== 1) {
    return NextResponse.json({ skipped: "no es día 1 (UTC)" });
  }

  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const monthKey = `${prevMonthStart.getUTCFullYear()}-${String(prevMonthStart.getUTCMonth() + 1).padStart(2, "0")}`;

  if (await monthIsSaved(monthKey)) {
    return NextResponse.json({ skipped: `${monthKey} ya estaba capturado` });
  }

  const result = await snapshotMonth(prevMonthStart, true);
  if (result.error) {
    console.error("[cron/monthly-stats-snapshot] error:", result.error);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ captured: monthKey });
}
