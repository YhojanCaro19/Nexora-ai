-- ============================================================
-- MÓDULO DE RESERVAS (mesas y turnos/citas) — AVENTHRA
-- ============================================================
-- Correr en Supabase → SQL Editor DESPUÉS de un snapshot (Database → Backups).
-- Es idempotente: se puede volver a correr sin romper nada.
--
-- Un solo sistema para mesas (restaurante) y citas (barbería / salón):
-- reservar un RECURSO (mesa o empleado) en un RANGO DE TIEMPO para un
-- cliente. "No se puede reservar dos veces lo mismo" lo garantiza Postgres
-- con un exclusion constraint (btree_gist) — imposible a nivel de base de
-- datos, sin condiciones de carrera. Ver docs/decisions.md.
-- ============================================================

create extension if not exists btree_gist;


-- ---- 1. Config de reservas por negocio ----------------------
create table if not exists public.booking_settings (
  business_id              uuid primary key references public.businesses(id) on delete cascade,
  -- 'off' = el negocio no usa reservas. Lo demás habilita el módulo.
  mode                     text not null default 'off'
                             check (mode in ('off','tables','appointments','both')),
  -- Granularidad de la grilla de horarios que se le ofrece al cliente.
  slot_minutes             integer not null default 30 check (slot_minutes between 5 and 240),
  -- Duración por defecto: cuánto se retiene una mesa, y fallback de una
  -- cita sin servicio asociado.
  default_duration_minutes integer not null default 90 check (default_duration_minutes between 5 and 600),
  -- Ventana de reserva.
  min_notice_minutes       integer not null default 60 check (min_notice_minutes >= 0),
  max_advance_days          integer not null default 60 check (max_advance_days between 1 and 365),
  updated_at               timestamptz not null default now()
);


-- ---- 2. Horario semanal (turnos partidos = varias filas/día) ----
create table if not exists public.business_hours (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),   -- 0 = domingo
  opens_at    time not null,
  closes_at   time not null,
  created_at  timestamptz not null default now(),
  check (closes_at > opens_at)
);
create index if not exists business_hours_business_idx on public.business_hours (business_id, weekday);


-- ---- 3. Recursos: empleados y mesas, unificados -------------
create table if not exists public.booking_resources (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind        text not null check (kind in ('staff','table')),
  name        text not null,                                       -- "Angie" / "Mesa 4"
  capacity    integer check (capacity is null or capacity > 0),    -- sillas (mesas); null en staff
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists booking_resources_business_idx on public.booking_resources (business_id, kind, active);


-- ---- 4. Servicios de citas: nombre + duración + precio -----
create table if not exists public.booking_services (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  name             text not null,
  duration_minutes integer not null check (duration_minutes between 5 and 600),
  price            numeric(12,2),                                  -- opcional
  active           boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists booking_services_business_idx on public.booking_services (business_id, active);


-- ---- 5. Cierres / bloqueos (festivos, empleado que no viene) ----
create table if not exists public.business_closures (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  resource_id uuid references public.booking_resources(id) on delete cascade,  -- null = todo el negocio
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists business_closures_business_idx on public.business_closures (business_id, starts_at);


-- ---- 6. Reservas ------------------------------------------------
create table if not exists public.reservations (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  kind           text not null check (kind in ('table','appointment')),
  resource_id    uuid not null references public.booking_resources(id) on delete restrict,
  customer_id    uuid references public.customers(id) on delete set null,
  customer_name  text,
  customer_phone text,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  party_size     integer check (party_size is null or party_size > 0),
  service_id     uuid references public.booking_services(id) on delete set null,
  service_name   text,                                             -- foto del nombre del servicio
  status         text not null default 'confirmed'
                   check (status in ('pending','confirmed','seated','completed','no_show','cancelled')),
  source         text not null default 'manual' check (source in ('manual','agent')),
  notes          text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists reservations_business_start_idx on public.reservations (business_id, starts_at);
create index if not exists reservations_resource_idx on public.reservations (resource_id, starts_at);
create index if not exists reservations_customer_idx on public.reservations (customer_id);

-- EL CORAZÓN: no puede haber dos reservas ACTIVAS sobre el mismo recurso
-- en rangos de tiempo que se solapan. Estados terminales (completed /
-- no_show / cancelled) no cuentan, así el horario se libera al cerrar.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reservations_no_overlap'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_no_overlap
      exclude using gist (
        resource_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      ) where (status in ('pending','confirmed','seated'));
  end if;
end $$;


-- ============================================================
-- 7. RLS — mismo patrón que `orders` / `customers`
-- ============================================================
-- Todas estas tablas las opera el panel (admin y colaborador) y el agente.
-- El agente usa service_role (se salta RLS, igual que con `orders`). Para
-- el panel: policy ALL para is_business_member(business_id) — idéntico a
-- lo que ya tienen orders/customers/conversations. El filtro fino por
-- `permissions` de colaborador no se aplica a nivel RLS en NINGUNA tabla
-- operativa hoy (ver docs/database.md, "última milla multi-tenant") — se
-- controla en la capa de server actions. Esto no lo cambia.
alter table public.booking_settings   enable row level security;
alter table public.business_hours     enable row level security;
alter table public.booking_resources  enable row level security;
alter table public.booking_services   enable row level security;
alter table public.business_closures  enable row level security;
alter table public.reservations       enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'booking_settings','business_hours','booking_resources',
    'booking_services','business_closures','reservations'
  ]
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t
        and policyname = t || '_member_all'
    ) then
      execute format(
        'create policy %I on public.%I for all
           using (public.is_business_member(business_id))
           with check (public.is_business_member(business_id))',
        t || '_member_all', t
      );
    end if;
  end loop;
end $$;


-- ============================================================
-- VERIFICACIÓN (opcional, solo lectura)
-- ============================================================
-- select tablename, policyname from pg_policies
--   where schemaname='public'
--     and tablename in ('booking_settings','business_hours','booking_resources','booking_services','business_closures','reservations');
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid='public.reservations'::regclass and contype='x';
