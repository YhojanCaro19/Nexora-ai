-- ============================================================
-- PRE-CHECK — corre esto PRIMERO en Supabase (SQL Editor) y pásame el
-- resultado. Solo lee, no cambia nada.
-- ============================================================

select
  -- ¿Existen los helpers de RLS que usan las policies nuevas?
  (select exists(
     select 1 from pg_proc
     where proname = 'is_business_member' and pronamespace = 'public'::regnamespace
   )) as has_is_business_member,
  (select exists(
     select 1 from pg_proc
     where proname = 'is_business_admin' and pronamespace = 'public'::regnamespace
   )) as has_is_business_admin,

  -- ¿La tabla subscriptions ya tiene RLS y policies? (para saber si el
  -- script las va a agregar o si ya había algo)
  (select relrowsecurity from pg_class
   where oid = 'public.subscriptions'::regclass) as subscriptions_rls_enabled,
  (select count(*) from pg_policies
   where schemaname = 'public' and tablename = 'subscriptions') as subscriptions_policy_count,

  -- ¿Ya existe alguna de las tablas del módulo? (si sí, el script es idempotente
  -- igual, pero conviene saberlo)
  (select count(*) from information_schema.tables
   where table_schema = 'public'
     and table_name in ('plans','credit_prices','credit_wallets','credit_ledger')) as credit_tables_present,

  -- Cuántos negocios hay (para el backfill de wallets)
  (select count(*) from public.businesses) as business_count,

  -- Filas actuales en subscriptions (para saber si hay datos que cuidar)
  (select count(*) from public.subscriptions) as subscriptions_row_count;
