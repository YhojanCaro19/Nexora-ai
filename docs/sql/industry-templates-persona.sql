-- ============================================================
-- PERSONA COMPLETA EN LAS PLANTILLAS DE INDUSTRIA — AVENTHRA (2026-09-08)
-- ============================================================
-- Corre esto en Supabase → SQL Editor. Idempotente.
--
-- Mi Agente (admin) ya tiene modo de emojis (enum, no booleano), trato al
-- cliente (tú/usted) e "cuándo escalar a una persona" desde hace un
-- tiempo (Lote 1) — pero `industry_agent_templates` se quedó atrás: solo
-- tenía el booleano viejo `use_emojis`. Por eso, al crear un negocio
-- nuevo, `registrationService.ts` tenía que ADIVINAR el modo de emojis a
-- partir de ese booleano ("use_emojis ? 'pocos' : 'ninguno'"), y trato al
-- cliente / disparadores de escalamiento quedaban siempre en blanco.
--
-- Esto agrega las columnas que faltaban — `use_emojis` se deja en la
-- tabla sin tocar (nadie la borra), simplemente el código deja de leerla.
-- ============================================================

alter table public.industry_agent_templates
  add column if not exists emoji_mode         text,
  add column if not exists emoji_set          text,
  add column if not exists address_form       text,
  add column if not exists escalation_triggers jsonb,
  add column if not exists language           text;

comment on column public.industry_agent_templates.emoji_mode is
  'ninguno | pocos | personalizado — mismo enum que agent_configs.emoji_mode.';
comment on column public.industry_agent_templates.address_form is
  'auto | tu | usted — mismo enum que agent_configs.address_form.';
comment on column public.industry_agent_templates.escalation_triggers is
  'Array de keys de ESCALATION_TRIGGERS (lib/config/escalationTriggers.ts).';

-- ============================================================
-- VERIFICACIÓN (opcional, solo lectura)
-- ============================================================
-- select industry_type, emoji_mode, address_form, escalation_triggers, language
-- from public.industry_agent_templates
-- order by industry_type;
