-- ============================================================
-- MÓDULO DE CRÉDITOS Y SUSCRIPCIONES — AVENTHRA
-- ============================================================
-- Correr en Supabase → SQL Editor, DESPUÉS de:
--   1. 00-precheck.sql (y confirmar que has_is_business_member = true
--      y has_is_business_admin = true)
--   2. La migración de agent_usage_log (setup doc §3a)
--   3. Un snapshot de la DB (Database → Backups)
--
-- Es idempotente: se puede correr de nuevo sin romper nada.
-- Ver docs/pricing-model.md para el porqué de los números.
-- ============================================================


-- ---- 1. Catálogo de planes ---------------------------------------
create table if not exists public.plans (
  id                uuid primary key default gen_random_uuid(),
  key               text not null unique,            -- 'atencion' | 'crecimiento' | 'escala'
  name              text not null,
  price_monthly_cop bigint not null,                 -- centavos COP (Wompi cobra en COP)
  price_annual_cop  bigint not null,
  monthly_credits   integer not null,
  max_businesses    integer not null default 1,
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);


-- ---- 2. Precio en créditos de cada acción -----------------------
create table if not exists public.credit_prices (
  action_key  text primary key,   -- 'agent_reply' | 'copy' | 'strategy' | 'image_standard' | 'image_hd' | 'campaign_publish' | 'wa_marketing_message'
  credits     integer not null check (credits >= 0),
  description text,
  updated_at  timestamptz not null default now()
);


-- ---- 3. Wallet por negocio (saldo rápido; el ledger es la verdad) ----
create table if not exists public.credit_wallets (
  business_id    uuid primary key references public.businesses(id) on delete cascade,
  plan_balance   integer not null default 0 check (plan_balance >= 0),   -- vence cada ciclo
  topup_balance  integer not null default 0 check (topup_balance >= 0),  -- packs, no vencen
  plan_renews_at timestamptz,
  updated_at     timestamptz not null default now()
);


-- ---- 4. Ledger append-only (auditoría e historial) -------------
create table if not exists public.credit_ledger (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  delta         integer not null,                            -- + acredita, - descuenta
  bucket        text not null check (bucket in ('plan','topup')),
  reason        text not null,                                -- 'agent_reply' | 'cycle_grant' | 'cycle_expire' | 'topup_purchase' | 'manual_adjust' ...
  ref_type      text,                                         -- 'conversation' | 'campaign' | 'wompi_transaction' | null
  ref_id        text,
  balance_after integer not null,
  created_at    timestamptz not null default now()
);
create index if not exists credit_ledger_business_created_idx
  on public.credit_ledger (business_id, created_at desc);


-- ---- 5. Extender `subscriptions` (ya existe, ya tiene RLS + 3 policies) ----
-- Solo se le agregan columnas. Su RLS y sus policies NO se tocan.
alter table public.subscriptions
  add column if not exists plan_id         uuid references public.plans(id),
  add column if not exists billing_period  text,               -- 'monthly' | 'annual'
  add column if not exists wompi_reference text;

-- Un solo registro de suscripción por negocio (si no existía ya el constraint)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_business_id_key'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_business_id_key unique (business_id);
  end if;
end $$;


-- ---- 6. Wallet automático para cada negocio -------------------
create or replace function public.create_credit_wallet_for_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_wallets (business_id)
  values (new.id)
  on conflict (business_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_business_created_credit_wallet on public.businesses;
create trigger on_business_created_credit_wallet
  after insert on public.businesses
  for each row execute function public.create_credit_wallet_for_business();

-- Backfill: wallet 0/0 para los negocios que ya existen
insert into public.credit_wallets (business_id)
select id from public.businesses
on conflict (business_id) do nothing;


-- ---- 7. Funciones de créditos (SECURITY DEFINER, solo service_role) ----

-- Descuenta créditos de forma atómica. Gasta primero el saldo del plan
-- (que vence), luego el de packs.
--   → devuelve el nuevo saldo total si alcanza
--   → devuelve NULL si NO alcanza (no toca nada)
--   → lanza excepción solo en estados imposibles (wallet inexistente, monto negativo)
create or replace function public.deduct_credits(
  p_business_id uuid,
  p_amount      integer,
  p_reason      text,
  p_ref_type    text default null,
  p_ref_id      text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan       integer;
  v_topup      integer;
  v_from_plan  integer;
  v_from_topup integer;
begin
  if p_amount < 0 then
    raise exception 'deduct_credits: monto negativo (%)', p_amount;
  end if;

  select plan_balance, topup_balance into v_plan, v_topup
  from public.credit_wallets
  where business_id = p_business_id
  for update;

  if not found then
    raise exception 'deduct_credits: el negocio % no tiene wallet', p_business_id;
  end if;

  if p_amount = 0 then
    return v_plan + v_topup;
  end if;

  if v_plan + v_topup < p_amount then
    return null;  -- saldo insuficiente: no se descuenta nada
  end if;

  v_from_plan  := least(v_plan, p_amount);
  v_from_topup := p_amount - v_from_plan;

  update public.credit_wallets
  set plan_balance  = plan_balance  - v_from_plan,
      topup_balance = topup_balance - v_from_topup,
      updated_at    = now()
  where business_id = p_business_id;

  if v_from_plan > 0 then
    insert into public.credit_ledger
      (business_id, delta, bucket, reason, ref_type, ref_id, balance_after)
    values
      (p_business_id, -v_from_plan, 'plan', p_reason, p_ref_type, p_ref_id,
       (v_plan - v_from_plan) + v_topup);
  end if;
  if v_from_topup > 0 then
    insert into public.credit_ledger
      (business_id, delta, bucket, reason, ref_type, ref_id, balance_after)
    values
      (p_business_id, -v_from_topup, 'topup', p_reason, p_ref_type, p_ref_id,
       (v_plan - v_from_plan) + (v_topup - v_from_topup));
  end if;

  return (v_plan - v_from_plan) + (v_topup - v_from_topup);
end;
$$;


-- Acredita créditos (compra de plan/pack, ajuste manual). Devuelve el saldo total.
create or replace function public.grant_credits(
  p_business_id uuid,
  p_amount      integer,
  p_bucket      text,               -- 'plan' | 'topup'
  p_reason      text,
  p_ref_type    text default null,
  p_ref_id      text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_total integer;
begin
  if p_amount <= 0 then
    raise exception 'grant_credits: monto debe ser positivo (%)', p_amount;
  end if;
  if p_bucket not in ('plan','topup') then
    raise exception 'grant_credits: bucket inválido (%)', p_bucket;
  end if;

  insert into public.credit_wallets (business_id, plan_balance, topup_balance)
  values (
    p_business_id,
    case when p_bucket = 'plan'  then p_amount else 0 end,
    case when p_bucket = 'topup' then p_amount else 0 end
  )
  on conflict (business_id) do update
  set plan_balance  = public.credit_wallets.plan_balance
        + case when p_bucket = 'plan'  then p_amount else 0 end,
      topup_balance = public.credit_wallets.topup_balance
        + case when p_bucket = 'topup' then p_amount else 0 end,
      updated_at    = now();

  select plan_balance + topup_balance into v_total
  from public.credit_wallets where business_id = p_business_id;

  insert into public.credit_ledger
    (business_id, delta, bucket, reason, ref_type, ref_id, balance_after)
  values (p_business_id, p_amount, p_bucket, p_reason, p_ref_type, p_ref_id, v_total);

  return v_total;
end;
$$;


-- Renovación de ciclo: lo que sobró del plan se pierde, entran los nuevos.
-- Los créditos de packs (topup) NO se tocan.
create or replace function public.reset_plan_credits(
  p_business_id uuid,
  p_new_amount  integer,
  p_renews_at   timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_plan integer;
  v_topup    integer;
begin
  if p_new_amount < 0 then
    raise exception 'reset_plan_credits: monto negativo (%)', p_new_amount;
  end if;

  insert into public.credit_wallets (business_id, plan_balance, topup_balance, plan_renews_at)
  values (p_business_id, 0, 0, p_renews_at)
  on conflict (business_id) do nothing;

  select plan_balance, topup_balance into v_old_plan, v_topup
  from public.credit_wallets
  where business_id = p_business_id
  for update;

  update public.credit_wallets
  set plan_balance   = p_new_amount,
      plan_renews_at = p_renews_at,
      updated_at     = now()
  where business_id = p_business_id;

  if v_old_plan > 0 then
    insert into public.credit_ledger (business_id, delta, bucket, reason, balance_after)
    values (p_business_id, -v_old_plan, 'plan', 'cycle_expire', v_topup);
  end if;
  insert into public.credit_ledger (business_id, delta, bucket, reason, balance_after)
  values (p_business_id, p_new_amount, 'plan', 'cycle_grant', p_new_amount + v_topup);
end;
$$;


-- ---- 8. Permisos: solo service_role ejecuta las funciones -----
revoke all on function public.deduct_credits(uuid,integer,text,text,text)     from public, anon, authenticated;
revoke all on function public.grant_credits(uuid,integer,text,text,text,text)  from public, anon, authenticated;
revoke all on function public.reset_plan_credits(uuid,integer,timestamptz)     from public, anon, authenticated;
grant execute on function public.deduct_credits(uuid,integer,text,text,text)     to service_role;
grant execute on function public.grant_credits(uuid,integer,text,text,text,text)  to service_role;
grant execute on function public.reset_plan_credits(uuid,integer,timestamptz)     to service_role;


-- ---- 9. RLS (solo tablas nuevas — subscriptions NO se toca) ----
alter table public.plans          enable row level security;
alter table public.credit_prices  enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_ledger  enable row level security;

drop policy if exists plans_read  on public.plans;
drop policy if exists prices_read on public.credit_prices;
drop policy if exists wallet_read on public.credit_wallets;
drop policy if exists ledger_read on public.credit_ledger;

-- plans y credit_prices: lectura pública (la landing/precios los mostrarán)
create policy plans_read  on public.plans         for select using (true);
create policy prices_read on public.credit_prices for select using (true);

-- wallet: el negocio ve su propio saldo
create policy wallet_read on public.credit_wallets for select
  using (public.is_business_member(business_id));

-- ledger: solo el admin del negocio ve su historial
create policy ledger_read on public.credit_ledger for select
  using (public.is_business_admin(business_id));

-- Sin políticas de INSERT/UPDATE/DELETE para usuarios en estas tablas:
-- todo pasa por las funciones SECURITY DEFINER (service_role).


-- ---- 10. SEED (solo primera vez — `do nothing` no pisa cambios manuales) ----
insert into public.credit_prices (action_key, credits, description) values
  ('agent_reply',          4,  'Una respuesta del agente a un cliente'),
  ('copy',                 2,  'Generar un texto / copy'),
  ('strategy',             8,  'Generar una estrategia de marketing'),
  ('image_standard',      15,  'Generar una imagen estándar (Gemini)'),
  ('image_hd',            35,  'Generar una imagen HD'),
  ('campaign_publish',     8,  'Publicar / lanzar una campaña'),
  ('wa_marketing_message', 4,  'Enviar un mensaje de marketing por WhatsApp')
on conflict (action_key) do nothing;

-- Precios en centavos COP — AJUSTAR a la TRM real + colchón 10–15%.
-- (TRM ~4.000: $39 ≈ 160.000 COP = 16.000.000 centavos). Anual = ×10 meses.
insert into public.plans (key, name, price_monthly_cop, price_annual_cop, monthly_credits, max_businesses, sort_order) values
  ('atencion',    'Atención',      16000000,   160000000,  7000, 1, 1),
  ('crecimiento', 'Crecimiento',   40000000,   400000000, 20000, 1, 2),
  ('escala',      'Escala',       100000000,  1000000000, 55000, 3, 3)
on conflict (key) do nothing;


-- ============================================================
-- CÓMO PROBAR (opcional, en el SQL Editor)
-- ============================================================
-- Darle créditos a un negocio de prueba:
--   select public.grant_credits('<business-uuid>', 7000, 'plan', 'manual_test');
-- Ver su saldo:
--   select * from public.credit_wallets where business_id = '<business-uuid>';
-- Descontar (simula una respuesta del agente):
--   select public.deduct_credits('<business-uuid>', 4, 'agent_reply', 'conversation', '<conv-uuid>');
-- Ver el historial:
--   select * from public.credit_ledger where business_id = '<business-uuid>' order by created_at desc;
