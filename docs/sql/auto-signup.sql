-- ============================================================
-- ALTA DE CUENTAS AUTOMÁTICA POR PAGO (Wompi) — AVENTHRA
-- ============================================================
-- Correr en Supabase → SQL Editor DESPUÉS de:
--   1. docs/sql/00-precheck.sql
--   2. docs/sql/credits-module.sql   (tablas plans, credit_wallets, funciones grant_credits / reset_plan_credits)
--   3. docs/sql/pricing-v5.sql        (cupos por plan + credit_prices v5)
--   4. Un snapshot de la DB (Database → Backups)
--
-- Es idempotente: se puede volver a correr sin romper nada.
-- Ver docs/decisions.md — "Alta de cuentas por pago" y el plan
-- .claude/plans/refactored-herding-simon.md
--
-- NO toca la tabla `subscriptions` (su schema base no está confirmado): el
-- estado del plado de un negocio vive en `credit_wallets` (saldo +
-- plan_renews_at + plan_key). Enganchar `subscriptions` es una tarea aparte.
-- ============================================================


-- ---- 1. Intentos de compra (checkout) --------------------------
-- Una fila por click en "Comprar", creada ANTES de mandar al cliente a
-- Wompi. Ata la transacción de Wompi (por `reference`) a un plan concreto.
create table if not exists public.checkout_sessions (
  id                   uuid primary key default gen_random_uuid(),
  reference            text not null unique,          -- la que se envía a Wompi: 'AVX-<random>'
  plan_id              uuid references public.plans(id),
  plan_key             text not null,                 -- copia estable ('atencion' | 'crecimiento' | 'escala')
  billing_period       text not null check (billing_period in ('monthly','annual')),
  amount_in_cents      bigint not null check (amount_in_cents > 0),
  status               text not null default 'pending'
                         check (status in ('pending','paid','expired')),
  wompi_transaction_id text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists checkout_sessions_status_created_idx
  on public.checkout_sessions (status, created_at desc);


-- ---- 2. Registros pendientes ----------------------------------
-- Un pago aprobado (o un alta manual del superadmin) que todavía no
-- completó su formulario de registro. El token del link se guarda SOLO
-- hasheado (SHA-256) — el token crudo vive únicamente en el correo/URL.
create table if not exists public.pending_registrations (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null,
  token_hash           text not null unique,
  plan_id              uuid references public.plans(id),
  plan_key             text not null,
  billing_period       text not null check (billing_period in ('monthly','annual')),
  checkout_session_id  uuid references public.checkout_sessions(id) on delete set null,
  wompi_transaction_id text unique,                   -- idempotencia del webhook
  source               text not null default 'payment'
                         check (source in ('payment','manual')),
  status               text not null default 'pending'
                         check (status in ('pending','completed','expired')),
  business_id          uuid references public.businesses(id) on delete set null,
  created_by           uuid references auth.users(id), -- superadmin, solo cuando source = 'manual'
  expires_at           timestamptz not null default (now() + interval '30 days'),
  completed_at         timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists pending_registrations_status_expires_idx
  on public.pending_registrations (status, expires_at);
create index if not exists pending_registrations_email_idx
  on public.pending_registrations (lower(email));


-- ---- 3. Plan vigente del negocio en el wallet -----------------
-- Para saber qué plan renovar cuando llega un pago de un correo que YA es
-- dueño de un negocio. No se crea tabla nueva: son 2 columnas sobre el
-- wallet que ya existe (credits-module.sql).
alter table public.credit_wallets
  add column if not exists plan_key       text,
  add column if not exists billing_period text;


-- ---- 4. RLS: ninguna policy — solo service_role las toca ------
-- El webhook y el endpoint de registro usan createAdminClient() (service
-- role, salta RLS). Ningún usuario final (anon / authenticated) puede leer
-- ni escribir estas tablas: sin policy = denegado por defecto.
alter table public.checkout_sessions      enable row level security;
alter table public.pending_registrations  enable row level security;


-- ============================================================
-- VERIFICACIÓN (opcional, solo lectura)
-- ============================================================
-- select * from public.checkout_sessions order by created_at desc limit 5;
-- select id, email, plan_key, source, status, expires_at
--   from public.pending_registrations order by created_at desc limit 5;
-- select column_name from information_schema.columns
--   where table_name = 'credit_wallets' and table_schema = 'public';
