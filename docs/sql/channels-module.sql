-- ============================================================
-- MÓDULO DE CANALES (WhatsApp / Messenger / Instagram) — AVENTHRA
-- ============================================================
-- Correr en Supabase → SQL Editor DESPUÉS de un snapshot (Database → Backups).
-- Idempotente: se puede volver a correr sin romper nada.
-- IMPORTANTE: el editor de Supabase corrompe el SQL multilínea, así que
-- CADA sentencia va en UNA sola línea. No reformatear.
--
-- Contexto: ver docs/channels-module-plan.md
-- Una sola tabla: las conexiones OAuth de cada negocio a sus canales de
-- Meta. El token va CIFRADO en la capa app (AES-256-GCM, lib/utils/
-- tokenCrypto.ts) — esta tabla nunca ve el token en claro.
-- ============================================================

create table if not exists public.channel_connections (id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade, channel text not null check (channel in ('messenger','instagram','whatsapp')), provider text not null default 'meta', external_id text not null, external_name text, access_token text not null, token_expires_at timestamptz, extra jsonb not null default '{}'::jsonb, webhook_subscribed boolean not null default false, status text not null default 'active' check (status in ('active','expired','revoked','error')), last_error text, connected_by uuid references auth.users(id), connected_at timestamptz not null default now(), updated_at timestamptz not null default now());

-- Una Página/número solo puede estar conectada a UN negocio (evita secuestro
-- de un canal ajeno) y es la clave con la que el webhook resuelve el negocio.
create unique index if not exists channel_connections_external_uidx on public.channel_connections (channel, external_id);
-- v1: un canal de cada tipo por negocio. Se puede relajar después.
create unique index if not exists channel_connections_business_channel_uidx on public.channel_connections (business_id, channel);
create index if not exists channel_connections_business_idx on public.channel_connections (business_id);
create index if not exists channel_connections_refresh_idx on public.channel_connections (token_expires_at) where status = 'active';

-- RLS: mismo criterio que agent_usage_log. Solo el ADMIN del negocio ve sus
-- conexiones; el token NUNCA viaja al navegador (revoke a nivel columna).
-- Escrituras: solo service role (callback de OAuth, cron de refresco).
alter table public.channel_connections enable row level security;
drop policy if exists channel_connections_admin_read on public.channel_connections;
create policy channel_connections_admin_read on public.channel_connections for select using (public.is_business_admin(business_id));
revoke select (access_token) on public.channel_connections from authenticated;
revoke select (access_token) on public.channel_connections from anon;

-- ============================================================
-- FIN. Verificación rápida (opcional):
--   select channel, count(*) from public.channel_connections group by 1;
-- ============================================================
