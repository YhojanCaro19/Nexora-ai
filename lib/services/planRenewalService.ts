// lib/services/planRenewalService.ts
//
// Recordatorio de vencimiento de mensualidad — negocios cuyo
// `credit_wallets.plan_renews_at` está a pocos días, para avisarles por
// correo antes de que llegue la fecha. Ver
// app/api/cron/plan-renewal-reminders/route.ts y
// docs/sql/plan-renewal-reminders.sql.
//
// El dedupe usa `renewal_reminder_sent_for`: guarda el `plan_renews_at`
// sobre el que YA se avisó, así que si el negocio renueva de verdad y esa
// fecha cambia, el aviso puede volver a dispararse para el ciclo nuevo —
// nunca se manda dos veces para el MISMO vencimiento.
import { createAdminClient } from "@/lib/supabase/server";

/** Umbral por defecto: avisa cuando falten 5 días o menos (o ya venció). */
export const RENEWAL_WARNING_DAYS = 5;

export interface DueRenewal {
  businessId: string;
  businessName: string;
  ownerEmail: string;
  planRenewsAt: string;
}

/**
 * Negocios cuyo vencimiento cae dentro de `withinDays` (o ya pasó) y que
 * todavía no recibieron el aviso para ESE vencimiento puntual.
 */
export async function getBusinessesDueForReminder(withinDays = RENEWAL_WARNING_DAYS): Promise<DueRenewal[]> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("credit_wallets")
    .select("business_id, plan_renews_at, renewal_reminder_sent_for, businesses(name, owner_id)")
    .not("plan_renews_at", "is", null)
    .lte("plan_renews_at", cutoff);

  if (error) {
    console.error("[getBusinessesDueForReminder] error:", error.message);
    return [];
  }

  type Row = { business_id: string; plan_renews_at: string; renewal_reminder_sent_for: string | null; businesses: { name: string; owner_id: string } | null };
  const due = (data as unknown as Row[]).filter((r) => r.renewal_reminder_sent_for !== r.plan_renews_at && r.businesses);

  if (due.length === 0) return [];

  const results: DueRenewal[] = [];
  await Promise.all(
    due.map(async (row) => {
      const { data: authUser } = await admin.auth.admin.getUserById(row.businesses!.owner_id);
      if (!authUser.user?.email) return;
      results.push({
        businessId: row.business_id,
        businessName: row.businesses!.name,
        ownerEmail: authUser.user.email,
        planRenewsAt: row.plan_renews_at,
      });
    })
  );
  return results;
}

/** Marca que ya se avisó de ESTE vencimiento puntual — no bloquea el envío si falla. */
export async function markRenewalReminderSent(businessId: string, planRenewsAt: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("credit_wallets")
    .update({ renewal_reminder_sent_for: planRenewsAt })
    .eq("business_id", businessId);
  if (error) console.error("[markRenewalReminderSent] error:", error.message);
}
