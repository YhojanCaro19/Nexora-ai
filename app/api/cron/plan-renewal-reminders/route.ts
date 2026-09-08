// app/api/cron/plan-renewal-reminders/route.ts
//
// Avisa por correo a los negocios cuya mensualidad está por vencer (o ya
// venció) — ver planRenewalService.ts. Corre cada hora (vercel.json);
// cada negocio recibe el correo UNA sola vez por vencimiento (dedupe con
// `credit_wallets.renewal_reminder_sent_for`, no por fecha del cron).
//
// Mismo esquema de protección que los demás crons: exige
// `Authorization: Bearer $CRON_SECRET`.
import { NextResponse } from "next/server";
import { getBusinessesDueForReminder, markRenewalReminderSent } from "@/lib/services/planRenewalService";
import { sendPlanRenewalReminderEmail } from "@/lib/services/emailService";
import { formatShortDateTime } from "@/lib/utils/date";

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

  const due = await getBusinessesDueForReminder();
  let sent = 0;
  let failed = 0;

  for (const business of due) {
    const overdue = new Date(business.planRenewsAt).getTime() < Date.now();
    const result = await sendPlanRenewalReminderEmail(business.ownerEmail, {
      businessName: business.businessName,
      renewsAtLabel: formatShortDateTime(business.planRenewsAt),
      overdue,
    });
    if (result.error) {
      failed++;
      console.error(`[cron/plan-renewal-reminders] falló para ${business.businessId}:`, result.error);
      continue;
    }
    await markRenewalReminderSent(business.businessId, business.planRenewsAt);
    sent++;
  }

  return NextResponse.json({ checked: due.length, sent, failed });
}
