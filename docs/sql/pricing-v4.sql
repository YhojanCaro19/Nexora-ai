-- ============================================================
-- PRECIOS v4 — cobrar el entregable (2026-08-28)
-- ============================================================
-- Corre esto SOLO si confirmas la v4 (ver docs/pricing-model.md §11).
-- El seed inicial usó `on conflict do nothing`, así que esto es lo que
-- realmente cambia los precios en la DB. Seguro de re-correr.
-- ============================================================

-- Costo en créditos por acción
insert into public.credit_prices (action_key, credits, description) values
  ('agent_reply',          3,   'Una respuesta del agente a un cliente'),
  ('strategy',             250, 'Estrategia completa (wizard + IA)'),
  ('piece',                200, 'Pieza lista para anuncio (imagen + copy)'),
  ('image_standard',       40,  'Imagen suelta estándar (Gemini)'),
  ('image_hd',             90,  'Imagen suelta HD'),
  ('copy',                 15,  'Copy suelto'),
  ('campaign_publish',     100, 'Lanzar una campaña a Meta/Google/TikTok'),
  ('wa_marketing_message', 5,   'Enviar un mensaje de marketing por WhatsApp')
on conflict (action_key) do update
  set credits = excluded.credits,
      description = excluded.description,
      updated_at = now();

-- Créditos incluidos por plan (v4)
update public.plans set monthly_credits = 3000  where key = 'atencion';
update public.plans set monthly_credits = 10000 where key = 'crecimiento';
update public.plans set monthly_credits = 30000 where key = 'escala';
