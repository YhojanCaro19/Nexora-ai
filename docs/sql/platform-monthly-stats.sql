-- ============================================================
-- ESTADÍSTICAS MENSUALES DE PLATAFORMA — AVENTHRA (2026-09-07)
-- ============================================================
-- Corre esto en Supabase → SQL Editor. Idempotente. Ver
-- lib/services/platformStatsService.ts y Superadmin → Estadísticas.
--
-- Un snapshot PLATAFORMA-COMPLETA por mes (no por negocio) — negocios
-- registrados (acumulado a fin de mes), negocios nuevos (altas DENTRO de
-- ese mes), pedidos, reservas, tokens y costo del agente. Se llena solo
-- (cron el día 1 de cada mes, captura el mes recién cerrado) o a mano
-- desde el panel con el botón "Capturar este mes".
--
-- El mes EN CURSO nunca vive acá — se calcula en vivo desde las tablas
-- de origen (orders, reservations, agent_usage_log, businesses) hasta
-- que se cierra y el cron (o el botón manual) lo guarda.
-- ============================================================

create table if not exists public.platform_monthly_stats (
  id                 uuid primary key default gen_random_uuid(),
  month              date not null unique,   -- primer día del mes, ej. 2026-09-01
  businesses_total   integer not null default 0,        -- acumulado a fin de mes
  businesses_new     integer not null default 0,        -- altas DENTRO de ese mes
  orders_count       integer not null default 0,
  reservations_count integer not null default 0,
  agent_tokens       bigint not null default 0,
  agent_cost_usd     numeric(12,6) not null default 0,
  captured_at        timestamptz not null default now(),
  -- false = se capturó a mano antes de que el mes terminara (con el
  -- botón "Capturar este mes") — el cron lo vuelve a capturar (y marca
  -- true) el día 1 del mes siguiente, con el mes ya completo.
  is_final           boolean not null default true
);

create index if not exists platform_monthly_stats_month_idx
  on public.platform_monthly_stats (month desc);

-- RLS: mismo criterio que platform_admin_actions / agent_usage_log — SIN
-- policy de INSERT ni SELECT, así que solo se lee/escribe con service
-- role (server-only, ver platformStatsService.ts). El superadmin no
-- consulta esta tabla desde el cliente en ningún momento.
alter table public.platform_monthly_stats enable row level security;

-- ============================================================
-- VERIFICACIÓN (opcional, solo lectura)
-- ============================================================
-- select month, businesses_total, businesses_new, orders_count,
--        reservations_count, agent_tokens, agent_cost_usd, is_final
-- from public.platform_monthly_stats
-- order by month desc;
