-- ============================================================
-- HISTORIAL DE SEGURIDAD PERSONAL — AVENTHRA
-- ============================================================
-- Correr en Supabase → SQL Editor DESPUÉS de un snapshot (Database → Backups).
-- Es idempotente: se puede volver a correr sin romper nada.
--
-- Contexto (Perfil → "Historial de seguridad"): línea de tiempo por
-- persona con sus propios eventos — inicios de sesión + acciones propias
-- (editó nombre/teléfono, cambió foto, cerró sesión en todos lados) +
-- accesos sensibles a datos del negocio (agregó/quitó colaboradores,
-- descargó un reporte, pidió cambiar su cuenta de acceso).
--
-- Dos tablas, mismo criterio de RLS que agent_usage_log:
--   - SIN policy de INSERT → se escribe SOLO con service role, desde
--     server actions / route handlers que ya derivan user_id y
--     business_id de getSessionProfile() (nunca de un input externo).
--   - SELECT acotado a auth.uid() = user_id → cada quien ve ÚNICAMENTE
--     su propio historial. Un colaborador NO puede leer el del admin ni
--     el de otro colaborador (no basta con ser miembro del negocio).
-- ============================================================


-- ---- 1. Eventos de seguridad propios ------------------------
create table if not exists public.profile_security_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_type  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists profile_security_events_user_created_idx
  on public.profile_security_events (user_id, created_at desc);

alter table public.profile_security_events enable row level security;

drop policy if exists profile_security_events_select_own on public.profile_security_events;
create policy profile_security_events_select_own
  on public.profile_security_events
  for select
  to authenticated
  using (auth.uid() = user_id);


-- ---- 2. Eventos de inicio de sesión ------------------------
-- Puede que ya exista (la sección "Inicios de sesión" del Perfil la usa);
-- create table if not exists la deja igual. Se incluye acá para que un
-- entorno nuevo quede completo con un solo script.
create table if not exists public.user_login_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists user_login_events_user_created_idx
  on public.user_login_events (user_id, created_at desc);

alter table public.user_login_events enable row level security;

drop policy if exists user_login_events_select_own on public.user_login_events;
create policy user_login_events_select_own
  on public.user_login_events
  for select
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================
-- VERIFICACIÓN (opcional, solo lectura)
-- ============================================================
-- select table_name, column_name, data_type from information_schema.columns
--   where table_schema = 'public'
--     and table_name in ('profile_security_events','user_login_events')
--   order by table_name, ordinal_position;
-- select schemaname, tablename, policyname, cmd, qual from pg_policies
--   where tablename in ('profile_security_events','user_login_events');
