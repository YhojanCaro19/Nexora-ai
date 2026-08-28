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

> ⚠️ **Revisar antes de correr.** El SQL vive en archivos aparte para
> copiar/pegar limpio:
> - `docs/sql/00-precheck.sql` — corre primero, pásame el resultado
> - `docs/sql/credits-module.sql` — el módulo completo (idempotente)
>
> Orden: 1) precheck → 2) migración §3a → 3) snapshot (Database → Backups)
> → 4) `credits-module.sql`.

**Qué crea** (detalle en `docs/sql/credits-module.sql`):

| Objeto | Para qué |
|---|---|
| `plans` | catálogo (precio COP, créditos/mes, máx. negocios) |
| `credit_prices` | costo en créditos de cada acción — config editable |
| `credit_wallets` | saldo por negocio (`plan_balance` vence, `topup_balance` no) |
| `credit_ledger` | historial append-only, auditoría |
| `subscriptions` | +`plan_id`, +`billing_period`, +`wompi_reference`, +unique(business_id) |
| trigger `on_business_created_credit_wallet` | wallet 0/0 automático por negocio + backfill |
| `deduct_credits()` | descuento atómico (`for update`); gasta plan→packs; devuelve NULL si no alcanza |
| `grant_credits()` / `reset_plan_credits()` | acreditar / renovar ciclo |
| RLS | negocio ve su saldo (`is_business_member`) e historial (`is_business_admin`); escritura solo por las funciones (`service_role`) |

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
