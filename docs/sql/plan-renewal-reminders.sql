-- ============================================================
-- RECORDATORIO DE VENCIMIENTO DE MENSUALIDAD — AVENTHRA (2026-09-07)
-- ============================================================
-- Corre esto en Supabase → SQL Editor. Idempotente. Ver
-- lib/services/planRenewalService.ts y app/api/cron/plan-renewal-reminders.
--
-- El "día de pago" de cada negocio YA existe — `credit_wallets.plan_renews_at`
-- (se fija al pagar el plan, ver registrationService.applyPlanToBusiness).
-- No hace falta una columna nueva para eso, ya está guardado.
--
-- Lo único que falta es una forma de no mandar el mismo recordatorio dos
-- veces en el mismo ciclo: esta columna guarda el `plan_renews_at` sobre
-- el que YA se avisó. Cuando el negocio renueve de verdad y
-- `plan_renews_at` cambie a una fecha nueva, deja de coincidir y el aviso
-- puede volver a dispararse para el ciclo siguiente.
-- ============================================================

alter table public.credit_wallets
  add column if not exists renewal_reminder_sent_for timestamptz;

comment on column public.credit_wallets.renewal_reminder_sent_for is
  'Valor de plan_renews_at sobre el que ya se envió el recordatorio de vencimiento — evita reenviarlo en el mismo ciclo.';

-- ============================================================
-- VERIFICACIÓN (opcional, solo lectura)
-- ============================================================
-- select business_id, plan_renews_at, renewal_reminder_sent_for
-- from public.credit_wallets
-- order by plan_renews_at asc nulls last;
