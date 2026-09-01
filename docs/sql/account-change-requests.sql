-- ============================================================
-- SOLICITUDES DE CAMBIO DE CUENTA DE ACCESO (Google) — AVENTHRA
-- ============================================================
-- Correr en Supabase → SQL Editor DESPUÉS de un snapshot (Database → Backups).
-- Es idempotente: se puede volver a correr sin romper nada.
--
-- Contexto (ver docs/decisions.md — "Cambio de cuenta de acceso"):
-- el login es 100% "Continuar con Google", así que el correo registrado ES
-- la cuenta de acceso. El usuario NO puede cambiarlo solo: crea una
-- solicitud, el superadmin la verifica por fuera (llama al teléfono del
-- registro) y hace el cambio a mano. Máximo 1 vez al año por persona.
-- ============================================================


-- ---- 1. Tabla de solicitudes ---------------------------------
create table if not exists public.account_change_requests (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  requested_by     uuid not null references auth.users(id) on delete cascade,
  -- Foto del rol al momento de pedir (para la lista del superadmin);
  -- el usuario puede dejar de ser miembro antes de que se resuelva.
  member_role      text not null,
  current_email    text not null,
  requested_email  text not null,
  reason           text not null,
  -- Teléfono que puso en el registro — foto al crear la solicitud, es
  -- por donde el superadmin verifica identidad antes de aprobar.
  contact_phone    text,
  status           text not null default 'pending'
                     check (status in ('pending','approved','rejected','cancelled')),
  resolved_by      uuid references auth.users(id),
  resolved_at      timestamptz,
  resolution_note  text,
  created_at       timestamptz not null default now()
);

-- Una sola solicitud PENDIENTE por persona a la vez (un colaborador no
-- queda bloqueado porque el admin tenga una abierta, y viceversa).
create unique index if not exists account_change_requests_one_pending_per_user
  on public.account_change_requests (requested_by)
  where status = 'pending';

create index if not exists account_change_requests_status_created_idx
  on public.account_change_requests (status, created_at desc);

create index if not exists account_change_requests_business_idx
  on public.account_change_requests (business_id);


-- ---- 2. RLS: ninguna policy — solo service_role -------------
-- Igual que public.pending_registrations (docs/sql/auto-signup.sql §4):
-- estas filas SOLO se tocan con createAdminClient() desde server actions
-- que ya derivan business_id / user_id de getSessionProfile(). Ningún
-- cliente anon / authenticated puede leerlas ni escribirlas.
alter table public.account_change_requests enable row level security;


-- ---- 3. Marca de "último cambio de cuenta de acceso" --------
-- Sobre business_members (cada persona, incluido el admin dueño, tiene
-- una fila acá). El límite de 1 vez al año se chequea contra esta fecha.
alter table public.business_members
  add column if not exists access_email_changed_at timestamptz;


-- ============================================================
-- VERIFICACIÓN (opcional, solo lectura)
-- ============================================================
-- select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'account_change_requests'
--   order by ordinal_position;
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.account_change_requests'::regclass;
-- select 'business_members.access_email_changed_at' as col,
--   exists(select 1 from information_schema.columns
--     where table_schema='public' and table_name='business_members'
--       and column_name='access_email_changed_at') as present;
