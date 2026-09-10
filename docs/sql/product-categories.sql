-- product-categories.sql
--
-- Categorías de producto por negocio. Se crean/gestionan aparte (acordeón
-- "Categorías" en el Catálogo + "＋ Nueva categoría" en el formulario de
-- producto). `products.category` sigue guardando el NOMBRE de la categoría
-- —no se migró a FK— para no tocar el agente, el CSV ni los filtros.

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create unique index if not exists product_categories_biz_name_uidx
  on public.product_categories (business_id, lower(trim(name)));

alter table public.product_categories enable row level security;
drop policy if exists product_categories_member_all on public.product_categories;
create policy product_categories_member_all on public.product_categories
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
