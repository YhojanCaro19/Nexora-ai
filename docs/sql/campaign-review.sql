-- ============================================================
-- REVISIÓN DE CAMPAÑA (media buyer IA) — AVENTHRA (2026-09-04)
-- ============================================================
-- Corre esto DESPUÉS de marketing-module.sql y credits-module.sql.
-- Idempotente. Ver lib/services/campaignReviewService.ts.
--
-- Guarda la opinión que la IA genera UNA sola vez, justo al publicar la
-- campaña en Meta (en pausa), para mostrarla en la pantalla de
-- "Confirmar y activar" sin tener que regenerarla cada vez que se visita.
-- ============================================================

alter table public.marketing_strategies
  add column if not exists review_result jsonb,
  add column if not exists reviewed_at   timestamptz;

-- Precio en créditos de la revisión (sobre el mismo catálogo de
-- credit_prices que ya usan 'copy', 'strategy', etc. — ver pricing-v5.sql).
insert into public.credit_prices (action_key, credits, description) values
  ('campaign_review', 30, 'Opinión del media buyer IA antes de activar una campaña')
on conflict (action_key) do update
  set credits = excluded.credits, description = excluded.description, updated_at = now();
