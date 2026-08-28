# Setup — créditos, pagos (Wompi) y generación de imágenes

> **Estado: GUÍA DE CONFIGURACIÓN (2026-08-28).** El SQL de este documento
> **no se ha aplicado.** Revisar en persona antes de correr nada contra
> Supabase (regla del proyecto: explicar y confirmar antes de tocar RLS /
> schema). Ver también `docs/pricing-model.md`.

---

## 1. Generación de imágenes — ¿Gemini o OpenAI?

**Recomendación: Gemini 2.5 Flash Image ("Nano Banana").**

| | Gemini 2.5 Flash Image | OpenAI gpt-image-1.5 | OpenAI gpt-image-1-mini |
|---|---|---|---|
| Costo / imagen 1024px | ~$0,039 (~$0,02 en batch) | ~$0,04 | ~$0,005–0,02 |
| Texto dentro de la imagen | **muy bueno** (clave para creativos con texto) | bueno | flojo |
| Edición / variaciones | **nativo, multi-turno** | sí | limitado |
| Free tier para probar | sí, sin tarjeta | no | no |

Para creativos publicitarios (que casi siempre llevan texto y necesitan
variaciones) Gemini rinde mejor a un costo casi igual. OpenAI sigue siendo un
buen fallback — el código debe abstraer el proveedor (un `imageService` con
interfaz `generateImage(prompt, opts)`), así cambiar es una línea.

### Cómo obtener la API key de Gemini

1. Entra a **[aistudio.google.com](https://aistudio.google.com)** con tu cuenta
   de Google.
2. Barra lateral → **"Get API key"** → **"Create API key"**. Queda asociada a un
   proyecto de Google Cloud (se crea uno si no tienes).
3. El free tier funciona sin tarjeta (rate-limited) — sirve para desarrollo.
4. Para producción: en el mismo proyecto de Google Cloud, **habilita la
   facturación** (Billing). El pago es por token consumido.
   Fuente: [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing).

> Tarifa de imagen: $30 por 1M tokens de salida; una imagen 1024px = 1.290
> tokens ≈ **$0,039**. Batch ≈ $0,0195.

### Variables de entorno (a `.env.local`, NUNCA al repo)

```bash
GOOGLE_GENAI_API_KEY=AIza...            # de Google AI Studio
IMAGE_PROVIDER=gemini                   # 'gemini' | 'openai'  (para el switch en imageService)
# Si dejas OpenAI como fallback:
OPENAI_API_KEY=sk-...
```

`.gitignore` ya cubre `.env*` — verificado.

---

## 2. Pasarela de pago — Wompi

Wompi es la pasarela de Grupo Bancolombia. **Solo Colombia, solo COP.** Los
montos van **en centavos** (`amount_in_cents`). Fuentes:
[docs.wompi.co](https://docs.wompi.co/),
[ambientes y llaves](https://docs.wompi.co/en/docs/colombia/ambientes-y-llaves/),
[eventos](https://docs.wompi.co/en/docs/colombia/eventos/).

### Cómo obtener las llaves

1. Regístrate en **[comercios.wompi.co](https://comercios.wompi.co)**.
2. El **Sandbox está disponible de inmediato**, sin verificación. Producción
   requiere verificar el negocio (RUT, cuenta bancaria, documentos legales).
3. En el panel, cada ambiente (Sandbox / Producción) tiene **4 llaves**:

| Llave | Prefijo Sandbox | Prefijo Producción | Para qué |
|---|---|---|---|
| Pública | `pub_test_` | `pub_prod_` | frontend / widget de checkout |
| Privada | `prv_test_` | `prv_prod_` | llamadas server-to-server a la API |
| Eventos | `test_events_` | `prod_events_` | **validar la firma de los webhooks** |
| Integridad | `test_integrity_` | `prod_integrity_` | firmar la transacción al crearla desde el front |

### Base URLs

| Ambiente | URL |
|---|---|
| Sandbox | `https://sandbox.wompi.co/v1` |
| Producción | `https://production.wompi.co/v1` |

### Webhook (eventos)

- En el panel de Wompi, por cada ambiente, configuras una **URL de eventos**.
  Ej: `https://aventhra.com/api/webhooks/wompi`.
- Wompi manda `POST` cuando cambia una transacción. Si no respondes `200`,
  reintenta hasta 3 veces en 24 h.
- **Hay que validar la firma** de cada evento con la llave de eventos (SHA256
  del payload + timestamp + secret). Sin esto, cualquiera puede falsificar un
  "pago confirmado".

### Variables de entorno

```bash
WOMPI_ENV=sandbox                       # 'sandbox' | 'production'
WOMPI_PUBLIC_KEY=pub_test_...
WOMPI_PRIVATE_KEY=prv_test_...
WOMPI_EVENTS_SECRET=test_events_...
WOMPI_INTEGRITY_SECRET=test_integrity_...
```

### Cosas a tener en cuenta

- **Moneda:** ingresos en COP, costos de IA en USD. Guardamos los precios de
  los planes en centavos COP en la tabla `plans` y los ajustamos a la TRM +
  un colchón de 10–15%. Si el peso se devalúa, se suben los precios COP.
- **Métodos de pago en Colombia:** tarjeta, PSE, Nequi, Bancolombia. El widget
  de Wompi los muestra todos.
- **Suscripciones recurrentes:** Wompi soporta *fuentes de pago* (tokenización
  de tarjeta) para cobrar el plan cada mes sin que el cliente vuelva a pagar
  manualmente. Es un flujo aparte del pago único — lo integramos después del
  pago único simple.

---

## 3a. Migración pequeña — `agent_usage_log` (segura, aplicar ya)

Necesaria para el fix de conteo de tokens del agente (commit 2026-08-28).
Solo agrega 2 columnas con default 0 — no toca datos ni RLS.

```sql
alter table public.agent_usage_log
  add column if not exists cache_read_input_tokens     integer not null default 0,
  add column if not exists cache_creation_input_tokens integer not null default 0;
```

> El código nuevo ya está desplegado y `logAgentUsage` traga sus propios
> errores — si esta migración no se ha corrido, el agente sigue respondiendo
> pero el registro de uso falla en silencio hasta que se apliquen las columnas.

---

## 3b. SQL de Supabase — módulo de créditos

> ⚠️ **NO APLICAR TODAVÍA.** Revisar en persona antes de correrlo. Schema de
> `subscriptions` ya confirmado (2026-08-28) → se extiende esa tabla, no se
> crea una nueva.

Usa `is_business_member()` / `is_business_admin()` que ya existen en el proyecto.

```sql
-- ============================================================
-- MÓDULO DE CRÉDITOS Y SUSCRIPCIONES — AVENTHRA
-- Revisar antes de aplicar. Hacer backup / snapshot primero.
-- ============================================================

-- 1. Catálogo de planes -----------------------------------------------
create table if not exists public.plans (
  id                 uuid primary key default gen_random_uuid(),
  key                text not null unique,          -- 'atencion' | 'crecimiento' | 'escala'
  name               text not null,
  price_monthly_cop  integer not null,              -- centavos COP (Wompi cobra en COP)
  price_annual_cop   integer not null,
  monthly_credits    integer not null,
  max_businesses     integer not null default 1,
  is_active          boolean not null default true,
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now()
);

-- 2. Precio en créditos de cada acción -------------------------------
create table if not exists public.credit_prices (
  action_key   text primary key,   -- 'agent_reply' | 'copy' | 'strategy' | 'image_standard' | 'image_hd' | 'campaign_publish' | 'wa_marketing_message'
  credits      integer not null check (credits >= 0),
  description  text,
  updated_at   timestamptz not null default now()
);

-- 3. Wallet por negocio (saldo cacheado; el ledger es la fuente de verdad)
create table if not exists public.credit_wallets (
  business_id     uuid primary key references public.businesses(id) on delete cascade,
  plan_balance    integer not null default 0 check (plan_balance >= 0),
  topup_balance   integer not null default 0 check (topup_balance >= 0),
  plan_renews_at  timestamptz,
  updated_at      timestamptz not null default now()
);

-- 4. Ledger append-only (auditoría e historial) ---------------------
create table if not exists public.credit_ledger (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  delta         integer not null,                  -- + acredita, - descuenta
  bucket        text not null check (bucket in ('plan','topup')),
  reason        text not null,                     -- 'agent_reply' | 'monthly_grant' | 'monthly_expire' | 'topup_purchase' | 'manual_adjust' ...
  ref_type      text,                              -- 'conversation' | 'campaign' | 'wompi_transaction' | null
  ref_id        text,
  balance_after integer not null,
  created_at    timestamptz not null default now()
);
create index if not exists credit_ledger_business_created_idx
  on public.credit_ledger (business_id, created_at desc);

-- 5. Suscripción activa por negocio --------------------------------
-- La tabla `subscriptions` YA EXISTE (id, business_id, status text 'active',
-- plan text, next_payment_date date, created_at, updated_at). Nada del
-- código la usa hoy. Se EXTIENDE en vez de crear una tabla nueva:
alter table public.subscriptions
  add column if not exists plan_id        uuid references public.plans(id),
  add column if not exists billing_period text,   -- 'monthly' | 'annual'
  add column if not exists wompi_reference text;

-- Un solo registro de suscripción por negocio (si no existe ya el constraint).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_business_id_key'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions add constraint subscriptions_business_id_key unique (business_id);
  end if;
end $$;

-- `next_payment_date` (ya existe) hace de fin de ciclo / fecha de renovación.
-- `status` (ya existe) admite 'active' | 'past_due' | 'canceled' — sin CHECK
-- para no chocar con datos existentes; lo valida la app.
-- `plan` (texto, legado) se deja hasta que `plan_id` esté poblado en todos.

-- ============================================================
-- FUNCIONES (SECURITY DEFINER — solo las llama el backend con service role)
-- ============================================================

-- Descuenta créditos atómicamente. Gasta primero el saldo del plan
-- (vence cada mes), luego el de packs. Excepción si no alcanza.
create or replace function public.deduct_credits(
  p_business_id uuid,
  p_amount      integer,
  p_reason      text,
  p_ref_type    text default null,
  p_ref_id      text default null
) returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_plan integer; v_topup integer;
  v_from_plan integer; v_from_topup integer;
begin
  if p_amount <= 0 then raise exception 'monto debe ser positivo'; end if;

  select plan_balance, topup_balance into v_plan, v_topup
  from public.credit_wallets where business_id = p_business_id for update;

  if not found then
    raise exception 'wallet no existe para el negocio %', p_business_id;
  end if;

  if v_plan + v_topup < p_amount then
    raise exception 'creditos insuficientes: hay %, se necesitan %',
      v_plan + v_topup, p_amount using errcode = 'P0001';
  end if;

  v_from_plan  := least(v_plan, p_amount);
  v_from_topup := p_amount - v_from_plan;

  update public.credit_wallets
  set plan_balance  = plan_balance  - v_from_plan,
      topup_balance = topup_balance - v_from_topup,
      updated_at    = now()
  where business_id = p_business_id;

  if v_from_plan > 0 then
    insert into public.credit_ledger(business_id, delta, bucket, reason, ref_type, ref_id, balance_after)
    values (p_business_id, -v_from_plan, 'plan', p_reason, p_ref_type, p_ref_id,
            (v_plan - v_from_plan) + v_topup);
  end if;
  if v_from_topup > 0 then
    insert into public.credit_ledger(business_id, delta, bucket, reason, ref_type, ref_id, balance_after)
    values (p_business_id, -v_from_topup, 'topup', p_reason, p_ref_type, p_ref_id,
            (v_plan - v_from_plan) + (v_topup - v_from_topup));
  end if;

  return (v_plan - v_from_plan) + (v_topup - v_from_topup);
end;
$$;

-- Acredita créditos (compra de pack, ajuste manual, grant mensual).
create or replace function public.grant_credits(
  p_business_id uuid,
  p_amount      integer,
  p_bucket      text,            -- 'plan' | 'topup'
  p_reason      text,
  p_ref_type    text default null,
  p_ref_id      text default null
) returns integer
language plpgsql security definer set search_path = public
as $$
declare v_total integer;
begin
  if p_amount <= 0 then raise exception 'monto debe ser positivo'; end if;
  if p_bucket not in ('plan','topup') then raise exception 'bucket invalido'; end if;

  insert into public.credit_wallets(business_id, plan_balance, topup_balance)
  values (p_business_id,
          case when p_bucket = 'plan'  then p_amount else 0 end,
          case when p_bucket = 'topup' then p_amount else 0 end)
  on conflict (business_id) do update
  set plan_balance  = public.credit_wallets.plan_balance  + case when p_bucket = 'plan'  then p_amount else 0 end,
      topup_balance = public.credit_wallets.topup_balance + case when p_bucket = 'topup' then p_amount else 0 end,
      updated_at    = now();

  select plan_balance + topup_balance into v_total
  from public.credit_wallets where business_id = p_business_id;

  insert into public.credit_ledger(business_id, delta, bucket, reason, ref_type, ref_id, balance_after)
  values (p_business_id, p_amount, p_bucket, p_reason, p_ref_type, p_ref_id, v_total);

  return v_total;
end;
$$;

-- Renovación mensual: lo que sobró del plan se pierde, entran los nuevos.
-- Los créditos de packs (topup) NO se tocan.
create or replace function public.reset_plan_credits(
  p_business_id uuid,
  p_new_amount  integer,
  p_renews_at   timestamptz
) returns void
language plpgsql security definer set search_path = public
as $$
declare v_old_plan integer; v_topup integer;
begin
  select plan_balance, topup_balance into v_old_plan, v_topup
  from public.credit_wallets where business_id = p_business_id for update;

  if not found then
    insert into public.credit_wallets(business_id, plan_balance, topup_balance, plan_renews_at)
    values (p_business_id, p_new_amount, 0, p_renews_at);
    insert into public.credit_ledger(business_id, delta, bucket, reason, balance_after)
    values (p_business_id, p_new_amount, 'plan', 'monthly_grant', p_new_amount);
    return;
  end if;

  update public.credit_wallets
  set plan_balance = p_new_amount, plan_renews_at = p_renews_at, updated_at = now()
  where business_id = p_business_id;

  if v_old_plan > 0 then
    insert into public.credit_ledger(business_id, delta, bucket, reason, balance_after)
    values (p_business_id, -v_old_plan, 'plan', 'monthly_expire', v_topup);
  end if;
  insert into public.credit_ledger(business_id, delta, bucket, reason, balance_after)
  values (p_business_id, p_new_amount, 'plan', 'monthly_grant', p_new_amount + v_topup);
end;
$$;

-- ============================================================
-- PERMISOS Y RLS
-- ============================================================

revoke all on function public.deduct_credits(uuid,integer,text,text,text)          from public, anon, authenticated;
revoke all on function public.grant_credits(uuid,integer,text,text,text,text)       from public, anon, authenticated;
revoke all on function public.reset_plan_credits(uuid,integer,timestamptz)          from public, anon, authenticated;
grant execute on function public.deduct_credits(uuid,integer,text,text,text)        to service_role;
grant execute on function public.grant_credits(uuid,integer,text,text,text,text)    to service_role;
grant execute on function public.reset_plan_credits(uuid,integer,timestamptz)       to service_role;

alter table public.plans          enable row level security;
alter table public.credit_prices  enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_ledger  enable row level security;
alter table public.subscriptions  enable row level security;

-- plans y credit_prices: lectura pública (la landing muestra precios)
create policy plans_read  on public.plans         for select using (true);
create policy prices_read on public.credit_prices for select using (true);

-- wallet: el negocio ve su saldo
create policy wallet_read on public.credit_wallets for select
  using (public.is_business_member(business_id));

-- ledger: solo el admin del negocio ve su historial
create policy ledger_read on public.credit_ledger for select
  using (public.is_business_admin(business_id));

-- suscripción: el negocio ve la suya (revisar si ya tenía RLS/policies antes)
create policy sub_read on public.subscriptions for select
  using (public.is_business_member(business_id));

-- Sin políticas de INSERT/UPDATE/DELETE para usuarios: todo pasa por las
-- funciones SECURITY DEFINER (service role).

-- ============================================================
-- SEED
-- ============================================================

-- Precios en créditos (v3, 2026-08-28). Ver docs/pricing-model.md §5.
insert into public.credit_prices(action_key, credits, description) values
  ('agent_reply',          4,  'Una respuesta del agente a un cliente'),
  ('copy',                 2,  'Generar un texto / copy'),
  ('strategy',             8,  'Generar una estrategia de marketing'),
  ('image_standard',      15,  'Generar una imagen estándar (Gemini)'),
  ('image_hd',            35,  'Generar una imagen HD'),
  ('campaign_publish',     8,  'Publicar / lanzar una campaña'),
  ('wa_marketing_message', 4,  'Enviar un mensaje de marketing por WhatsApp')
on conflict (action_key) do nothing;

-- Precios en centavos COP — AJUSTAR a la TRM del día + colchón 10–15%.
-- Ejemplo con TRM ~4.000: $39 ≈ 160.000 COP = 16.000.000 centavos.
-- Anual = ×10 meses (2 gratis).
insert into public.plans(key, name, price_monthly_cop, price_annual_cop, monthly_credits, max_businesses, sort_order) values
  ('atencion',    'Atención',     16000000,  160000000,  7000, 1, 1),
  ('crecimiento', 'Crecimiento',  40000000,  400000000, 20000, 1, 2),
  ('escala',      'Escala',      100000000, 1000000000, 55000, 3, 3)
on conflict (key) do nothing;
```

### Notas de diseño

- **El ledger es la auditoría**; `credit_wallets` es el saldo rápido. Si algún
  día se sospecha descuadre, `sum(delta)` del ledger reconstruye el saldo real.
- **`deduct_credits` usa `for update`** → dos requests concurrentes del mismo
  negocio se serializan, no hay doble gasto.
- **Se gasta primero el saldo del plan** (que vence) y luego el de packs
  (que no) — favorece al cliente.
- Las funciones son `SECURITY DEFINER` y solo `service_role` puede ejecutarlas
  → un usuario nunca puede acreditarse créditos a sí mismo.

---

## 4. Orden de construcción (después de aplicar el SQL)

| # | Pieza | Riesgo | Notas |
|---|---|---|---|
| 1 | `imageService` con proveedor abstraído (Gemini + fallback OpenAI) | bajo | env `IMAGE_PROVIDER`. Sin esto no hay marketing. |
| 2 | `creditService` (wrappers de `deduct_credits` / `grant_credits` / lectura de saldo) con service role | bajo | un solo punto que descuenta. |
| 3 | Enganchar `deduct_credits('agent_reply')` en `runAgentTurn` **después** de responder | medio | si falla el descuento, no romper la respuesta; loguear y cobrar diferido. |
| 4 | **Prompt caching en `agentEngineService`** (palanca #1 del pricing) | medio | separar base + tools (cacheable) de la personalización. |
| 5 | Corregir el conteo de tokens en `agent_usage_log` (hoy subcuenta las iteraciones del toolRunner) | bajo | sumar el `usage` de cada iteración, no solo `finalMessage`. |
| 6 | Panel de saldo/consumo para el admin (`/(dashboard)/admin/...`) | bajo | patrón existente: layout valida rol, page consulta. |
| 7 | Checkout Wompi — **pago único** primero (plan mensual) | **alto** | firma de integridad, `amount_in_cents`, referencia única por negocio. |
| 8 | Webhook `/api/webhooks/wompi` — validar firma, idempotencia, `grant_credits` + crear/renovar la fila de `subscriptions` | **alto** | nunca acreditar sin validar la firma del evento. |
| 9 | Packs extra (top-ups) — mismo checkout, `grant_credits(bucket='topup')` | medio | |
| 10 | Cron mensual → `reset_plan_credits` para cada suscripción activa | medio | Supabase cron / edge function. |
| 11 | Cobro recurrente con fuente de pago tokenizada | alto | último — el pago manual mensual funciona mientras tanto. |

**Hoy se puede hacer sin riesgo:** 1, 2, 6 y aplicar el SQL (paso 0) tras
revisarlo. Los pasos 7–8 (dinero real entrando) los hacemos con calma y
probando todo en Sandbox primero.
