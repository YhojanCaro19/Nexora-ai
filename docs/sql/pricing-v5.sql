-- ============================================================
-- PRECIOS v5 — cupos por plan + créditos solo para overflow (2026-08-29)
-- ============================================================
-- Corre esto tras aplicar credits-module.sql. Seguro de re-correr.
-- Ver docs/pricing-model.md §12.
--
-- Cambio de modelo: en vez de "todo créditos", cada plan trae CUPOS
-- mensuales (conversaciones del agente, campañas, imágenes). Los créditos
-- (`monthly_credits`) pasan a ser el colchón para pasarse del cupo.
-- El enforcement de cupos se conecta con Wompi (fase aparte); por ahora
-- los créditos siguen funcionando como moneda de respaldo.
-- ============================================================

alter table public.plans
  add column if not exists included_agent_conversations integer not null default 0,
  add column if not exists included_campaigns           integer not null default 0,
  add column if not exists included_images              integer not null default 0;

update public.plans set
  price_monthly_cop            = 16000000,
  price_annual_cop             = 160000000,
  included_agent_conversations = 250,
  included_campaigns           = 0,
  included_images              = 0,
  monthly_credits              = 500,
  max_businesses               = 1
where key = 'atencion';

update public.plans set
  price_monthly_cop            = 40000000,
  price_annual_cop             = 400000000,
  included_agent_conversations = 700,
  included_campaigns           = 15,
  included_images              = 60,
  monthly_credits              = 1500,
  max_businesses               = 1
where key = 'crecimiento';

update public.plans set
  price_monthly_cop            = 100000000,
  price_annual_cop             = 1000000000,
  included_agent_conversations = 2500,
  included_campaigns           = 40,
  included_images              = 200,
  monthly_credits              = 5000,
  max_businesses               = 3
where key = 'escala';

-- Costo en créditos cuando te PASAS del cupo (overflow / à la carte).
insert into public.credit_prices (action_key, credits, description) values
  ('agent_reply',          4,   'Respuesta del agente (sobre el cupo del plan)'),
  ('strategy',             250, 'Estrategia completa (sobre el cupo)'),
  ('piece',                80,  'Pieza extra de una campaña'),
  ('image_standard',       50,  'Imagen estándar (sobre el cupo)'),
  ('image_hd',             120, 'Imagen HD'),
  ('copy',                 20,  'Copy suelto'),
  ('campaign_publish',     150, 'Campaña adicional (sobre el cupo)'),
  ('wa_marketing_message', 5,   'Mensaje de marketing por WhatsApp')
on conflict (action_key) do update
  set credits = excluded.credits, description = excluded.description, updated_at = now();
