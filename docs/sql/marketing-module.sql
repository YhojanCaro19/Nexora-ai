-- ============================================================
-- MÓDULO MARKETING IA — Fase 1 — AVENTHRA
-- ============================================================
-- Correr en Supabase → SQL Editor DESPUÉS de credits-module.sql.
-- Idempotente. Ver docs/marketing-module-plan.md.
--
-- Modelo (según referencia SaleADS): la ESTRATEGIA es la unidad principal
-- — tiene objetivo, canal, inversión, fechas, ubicación, y genera PIEZAS
-- (imágenes + copys) que se aprueban antes de lanzar. No hay tabla
-- "campaigns" separada: la estrategia ES la campaña.
--
-- RLS: todo scoped por business_id, solo el admin del negocio
-- (is_business_admin). Escrituras por el cliente normal (sesión del admin).
-- ============================================================


-- ---- Estrategias --------------------------------------------
create table if not exists public.marketing_strategies (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,

  name             text not null,
  goal             text,                              -- lo que el admin escribió que quiere lograr
  objective        text check (objective in ('awareness','traffic','leads','sales','engagement')),
  provider         text check (provider in ('meta','google','tiktok','organic')),
  channel          text,                              -- etiqueta de canal: 'Instagram' | 'Facebook' | 'WhatsApp' | 'TikTok' | 'Google' ...

  budget_amount    bigint,                            -- monto en la moneda de abajo
  budget_currency  text not null default 'COP' check (budget_currency in ('COP','USD')),
  budget_period    text not null default 'daily' check (budget_period in ('daily','total')),

  language         text not null default 'es',
  location         jsonb,                             -- { label, country, cities[], radius_km }
  starts_at        date,
  ends_at          date,

  wizard_answers   jsonb not null default '{}',       -- respuestas del wizard "Nueva estrategia"
  ai_strategy      jsonb,                             -- lo que generó la IA: posicionamiento, ángulos, plan de canal

  status           text not null default 'draft'
                     check (status in ('draft','ready','active','paused','ended','archived','rejected')),

  external_id      text,                              -- id de campaña en Meta/Google/TikTok (Fase 2)
  external_status  text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists marketing_strategies_business_idx
  on public.marketing_strategies (business_id, created_at desc);


-- ---- Piezas (creativos: imagen + copy) ---------------------
create table if not exists public.marketing_pieces (
  id               uuid primary key default gen_random_uuid(),
  strategy_id      uuid not null references public.marketing_strategies(id) on delete cascade,
  business_id      uuid not null references public.businesses(id) on delete cascade,

  kind             text not null default 'ad' check (kind in ('ad','image','copy')),
  image_path       text,                              -- Supabase Storage
  headline         text,
  body             text,
  cta              text,

  status           text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_ai_generated  boolean not null default true,
  external_ad_id   text,                              -- id del anuncio en Meta (Fase 2)

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists marketing_pieces_strategy_idx
  on public.marketing_pieces (strategy_id, created_at desc);


-- ---- Métricas de la estrategia (se llenan desde las APIs de anuncios) ----
create table if not exists public.strategy_metrics (
  id           uuid primary key default gen_random_uuid(),
  strategy_id  uuid not null references public.marketing_strategies(id) on delete cascade,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  metric_date  date not null,
  spend_cop    bigint not null default 0,
  sales_count  integer not null default 0,
  revenue_cop  bigint not null default 0,
  impressions  bigint not null default 0,
  reach        bigint not null default 0,
  clicks       bigint not null default 0,
  source       text not null default 'manual' check (source in ('meta','google','tiktok','manual')),
  synced_at    timestamptz not null default now(),
  unique (strategy_id, metric_date, source)
);
create index if not exists strategy_metrics_business_idx
  on public.strategy_metrics (business_id, metric_date desc);


-- ---- Atribución de ventas (CRM = ventas por estrategia) ---
alter table public.orders
  add column if not exists strategy_id uuid references public.marketing_strategies(id) on delete set null;


-- ---- RLS -------------------------------------------------
alter table public.marketing_strategies enable row level security;
alter table public.marketing_pieces     enable row level security;
alter table public.strategy_metrics     enable row level security;

drop policy if exists strategies_all on public.marketing_strategies;
drop policy if exists pieces_all     on public.marketing_pieces;
drop policy if exists metrics_read   on public.strategy_metrics;

create policy strategies_all on public.marketing_strategies
  for all using (public.is_business_admin(business_id))
  with check (public.is_business_admin(business_id));

create policy pieces_all on public.marketing_pieces
  for all using (public.is_business_admin(business_id))
  with check (public.is_business_admin(business_id));

-- Las métricas las escribe el backend (service role / cron); el admin solo lee.
create policy metrics_read on public.strategy_metrics
  for select using (public.is_business_admin(business_id));


-- ============================================================
-- STORAGE — bucket para las imágenes de las piezas
-- ============================================================
insert into storage.buckets (id, name, public)
values ('marketing', 'marketing', true)
on conflict (id) do nothing;

-- Lectura pública (las piezas se muestran en el panel y luego en los
-- anuncios). Escritura/borrado solo del admin del negocio dueño de la
-- carpeta — la ruta es `<business_id>/...`.
drop policy if exists marketing_read   on storage.objects;
drop policy if exists marketing_write  on storage.objects;
drop policy if exists marketing_delete on storage.objects;

create policy marketing_read on storage.objects
  for select using (bucket_id = 'marketing');

create policy marketing_write on storage.objects
  for insert with check (
    bucket_id = 'marketing'
    and public.is_business_admin((storage.foldername(name))[1]::uuid)
  );

create policy marketing_delete on storage.objects
  for delete using (
    bucket_id = 'marketing'
    and public.is_business_admin((storage.foldername(name))[1]::uuid)
  );
