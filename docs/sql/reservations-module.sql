-- ============================================================
-- MÓDULO DE RESERVAS (mesas y turnos/citas) — AVENTHRA
-- ============================================================
-- Correr en Supabase → SQL Editor DESPUÉS de un snapshot (Database → Backups).
-- Idempotente. IMPORTANTE: el editor de Supabase corrompe el SQL multilínea,
-- así que CADA sentencia va en UNA sola línea. No reformatear.
--
-- Un solo sistema para mesas (restaurante) y citas (barbería/salón):
-- reservar un RECURSO (mesa o empleado) en un rango de tiempo. El "no doble
-- reserva" lo garantiza el exclusion constraint de Postgres (btree_gist).
-- Si ya existía una tabla `reservations` stub, borrarla antes:
--   drop table if exists public.reservations cascade;
-- ============================================================

create extension if not exists btree_gist;

create table if not exists public.booking_settings (business_id uuid primary key references public.businesses(id) on delete cascade, mode text not null default 'off' check (mode in ('off','tables','appointments','both')), slot_minutes integer not null default 30 check (slot_minutes between 5 and 240), default_duration_minutes integer not null default 90 check (default_duration_minutes between 5 and 600), min_notice_minutes integer not null default 60 check (min_notice_minutes >= 0), max_advance_days integer not null default 60 check (max_advance_days between 1 and 365), updated_at timestamptz not null default now());

create table if not exists public.business_hours (id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade, weekday smallint not null check (weekday between 0 and 6), opens_at time not null, closes_at time not null, created_at timestamptz not null default now(), check (closes_at > opens_at));
create index if not exists business_hours_business_idx on public.business_hours (business_id, weekday);

create table if not exists public.booking_resources (id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade, kind text not null check (kind in ('staff','table')), name text not null, capacity integer check (capacity is null or capacity > 0), active boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now());
create index if not exists booking_resources_business_idx on public.booking_resources (business_id, kind, active);

create table if not exists public.booking_services (id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade, name text not null, duration_minutes integer not null check (duration_minutes between 5 and 600), price numeric(12,2), active boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now());
create index if not exists booking_services_business_idx on public.booking_services (business_id, active);

create table if not exists public.business_closures (id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade, resource_id uuid references public.booking_resources(id) on delete cascade, starts_at timestamptz not null, ends_at timestamptz not null, reason text, created_at timestamptz not null default now(), check (ends_at > starts_at));
create index if not exists business_closures_business_idx on public.business_closures (business_id, starts_at);

create table if not exists public.reservations (id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade, kind text not null check (kind in ('table','appointment')), resource_id uuid not null references public.booking_resources(id) on delete restrict, customer_id uuid references public.customers(id) on delete set null, customer_name text, customer_phone text, starts_at timestamptz not null, ends_at timestamptz not null, party_size integer check (party_size is null or party_size > 0), service_id uuid references public.booking_services(id) on delete set null, service_name text, status text not null default 'confirmed' check (status in ('pending','confirmed','seated','completed','no_show','cancelled')), source text not null default 'manual' check (source in ('manual','agent')), notes text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (ends_at > starts_at));
create index if not exists reservations_business_start_idx on public.reservations (business_id, starts_at);
create index if not exists reservations_resource_idx on public.reservations (resource_id, starts_at);
create index if not exists reservations_customer_idx on public.reservations (customer_id);

-- El corazón: no dos reservas activas sobre el mismo recurso en rangos que se solapan.
alter table public.reservations drop constraint if exists reservations_no_overlap;
alter table public.reservations add constraint reservations_no_overlap exclude using gist (resource_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (status in ('pending','confirmed','seated'));

-- RLS: mismo patrón que orders/customers. El agente usa service_role (salta RLS).
alter table public.booking_settings enable row level security;
alter table public.business_hours enable row level security;
alter table public.booking_resources enable row level security;
alter table public.booking_services enable row level security;
alter table public.business_closures enable row level security;
alter table public.reservations enable row level security;

drop policy if exists booking_settings_member_all on public.booking_settings;
create policy booking_settings_member_all on public.booking_settings for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
drop policy if exists business_hours_member_all on public.business_hours;
create policy business_hours_member_all on public.business_hours for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
drop policy if exists booking_resources_member_all on public.booking_resources;
create policy booking_resources_member_all on public.booking_resources for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
drop policy if exists booking_services_member_all on public.booking_services;
create policy booking_services_member_all on public.booking_services for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
drop policy if exists business_closures_member_all on public.business_closures;
create policy business_closures_member_all on public.business_closures for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
drop policy if exists reservations_member_all on public.reservations;
create policy reservations_member_all on public.reservations for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

-- ---- 8. Recordatorio de confirmación (1 día antes) ---------
-- El cron /api/cron/reservation-reminders marca esta columna cuando manda
-- el mensaje de confirmación al cliente.
alter table public.reservations add column if not exists reminder_sent_at timestamptz;
create index if not exists reservations_reminder_due_idx on public.reservations (starts_at) where (reminder_sent_at is null and status in ('pending','confirmed','seated'));

-- VERIFICACIÓN (opcional): debe salir 1 fila.
-- select conname from pg_constraint where conrelid='public.reservations'::regclass and contype='x';
