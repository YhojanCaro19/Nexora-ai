# Módulo Marketing IA — plan de arquitectura

> **Estado: PLAN (2026-08-28).** Nada de esto está construido todavía.
> Es la pieza más grande del producto — se hace por fases, no de una.
> Ver [[aventhra-agent-architecture-plan]] y [[aventhra-actor-logic-rule]].

## 1. Lo que se pidió (visión completa)

Un módulo que:
- Genera **estrategias** de marketing ("Mis estrategias", "Nueva estrategia")
- Genera **piezas / creativos** (copy + imágenes tipo anuncio profesional)
- Arma **campañas** con: objetivo, canal, inversión, idioma, fecha inicio/fin,
  ubicación, multimedia
- Se **conecta con Meta Ads, Google Ads y TikTok Ads** para publicar la pauta
- Trae de vuelta **analítica**: importe/inversión, ventas, cuentas alcanzadas,
  impresiones, etc.
- Un **CRM** de las ventas atribuidas a las campañas
- CTA de **"Mejorar plan"** junto a los créditos ✅ (ya está)

## 2. Reality check — las APIs de anuncios NO se conectan hoy

Esto es lo que más gente subestima. Publicar pauta real vía API requiere:

| Plataforma | Qué hace falta | Tiempo |
|---|---|---|
| **Meta Ads** | Meta Business Manager + app de Meta + **App Review** para `ads_management` + System User token | 1–4 semanas (review de Meta) |
| **Google Ads** | Google Ads Manager (MCC) + **developer token** (aplicación + aprobación) + OAuth | días–semanas |
| **TikTok Ads** | TikTok for Business developer account + app + aprobación | 1–3 semanas |

Además: **estás gastando el dinero de pauta del cliente vía API** — eso es
responsabilidad legal y financiera seria (límites de gasto, confirmaciones,
auditoría de cada peso). No es un "conectar y listo".

**Conclusión:** las conexiones a las APIs son la Fase 2+. Cada una arranca con
que el dueño abra las cuentas de developer y aplique a los accesos — eso corre
en paralelo mientras se construye la Fase 1.

## 3. Modelo de datos (propuesta)

```
marketing_strategies
  id, business_id, name, objective, audience (text),
  channels text[], language, monthly_budget_cop,
  ai_output jsonb,          -- lo que generó la IA (posicionamiento, ángulos, etc.)
  status ('draft'|'active'|'archived'), created_at, updated_at

campaigns
  id, business_id, strategy_id (nullable),
  name, objective ('awareness'|'traffic'|'leads'|'sales'|'engagement'),
  channel ('meta'|'google'|'tiktok'|'organic'),
  status ('draft'|'ready'|'published'|'running'|'paused'|'ended'|'rejected'),
  budget_total_cop, language, location jsonb,
  starts_at, ends_at,
  external_id text,          -- id en Meta/Google/TikTok una vez publicada
  external_status text,
  created_at, updated_at

campaign_creatives
  id, campaign_id, business_id,
  kind ('image'|'video'|'copy'),
  asset_path text,           -- Supabase Storage
  headline, body, cta,
  is_ai_generated bool, is_approved bool, created_at

campaign_metrics                -- se llena desde las APIs de anuncios (Fase 2+)
  id, campaign_id, business_id, metric_date,
  impressions, reach, clicks, spend_cop, conversions, revenue_cop,
  source ('meta'|'google'|'tiktok'|'manual'), synced_at

ad_accounts                     -- las conexiones OAuth (Fase 2+)
  id, business_id, provider ('meta'|'google'|'tiktok'),
  external_account_id, access_token (cifrado), refresh_token (cifrado),
  token_expires_at, scopes text[], status, connected_at
```

**CRM de ventas:** ya existe la base — `orders` + `customers`. Se agrega
`orders.campaign_id` (nullable) para atribuir una venta a una campaña, y el
módulo muestra "ventas por campaña / por canal". Un CRM más completo (pipeline,
etapas de lead) es una decisión aparte.

RLS: todas scoped por `business_id`, misma regla que el resto (ver
`docs/database.md`). Los tokens de `ad_accounts` van **cifrados** y solo los
lee el backend con service role — nunca llegan al cliente.

## 4. Pantallas (bajo `/admin/marketing`)

```
/admin/marketing
  ├── Resumen            -- KPIs: inversión, ventas, cuentas alcanzadas, ROAS
  ├── Estrategias        -- lista + "Nueva estrategia" (wizard con IA)
  ├── Campañas           -- lista por estado; crear/editar campaña
  │     └── [id]         -- detalle: creativos, config de pauta, métricas
  ├── Creativos          -- biblioteca de piezas generadas (imágenes + copy)
  ├── Analítica          -- gráficas por canal / campaña / fecha
  └── Conexiones         -- conectar Meta / Google / TikTok (OAuth)
```

## 5. Fases

### Fase 1 — Generación + borradores (sin APIs externas)
*Necesita: recargar Anthropic (estrategia + copy) y Gemini (imágenes).*
- Tablas `marketing_strategies`, `campaigns`, `campaign_creatives` + RLS
- **Nueva estrategia**: wizard → IA genera posicionamiento, ángulos, mensajes
  clave, sugerencia de canales y presupuesto (tool de Claude, cobra `strategy`)
- **Creativos**: `imageService` con **plantillas de prompt tipo anuncio**
  (producto + titular + beneficios + estilo) + generación de copy (cobra
  `copy` por pieza)
- **Campaña (borrador)**: formulario completo (objetivo, canal, inversión,
  idioma, fechas, ubicación, creativos). Estado `draft` → `ready`.
- **Publicar** = por ahora exportar / copiar (el admin lo sube a mano a Meta
  Ads Manager). Cobra `campaign_publish`.
- Biblioteca de creativos + guardado en Storage

### Fase 2 — Conexión Meta Ads (primera plataforma)
*Necesita: cuenta de Meta Business + app + App Review aprobado (el dueño).*
- `ad_accounts` + flujo OAuth de Meta
- Publicar campaña real vía Marketing API (con confirmación de gasto explícita)
- `campaign_metrics` — sync diario de métricas de Meta
- Pantalla Analítica con datos reales de Meta

### Fase 3 — Google Ads + TikTok Ads
- Mismo patrón, un proveedor a la vez

### Fase 4 — CRM de ventas + atribución
- `orders.campaign_id` + atribución (UTM / pixel / manual)
- Vista "ventas por campaña", ROAS real por canal

### Fase 5 — Automatización
- La plataforma sugiere ajustes de pauta, pausa lo que no rinde, etc.

## 6. Créditos (ya seedeados en `credit_prices`)

| Acción | Créditos |
|---|---|
| `strategy` | 8 |
| `copy` (por pieza) | 2 |
| `image_standard` | 15 |
| `image_hd` | 35 |
| `campaign_publish` | 8 |
| `wa_marketing_message` | 4 |

## 7. Decisiones tomadas (2026-08-28)

- **Estrategia:** wizard con 4-6 preguntas al admin → la IA genera con eso.
- **Creativos:** la IA compone todo (imagen + textos adentro). MVP; editor de
  capas queda para después.
- **CRM:** solo ventas atribuidas a campañas — reusa `orders` + un campo de
  atribución. CRM de leads completo es otra decisión.
- **Primera API de anuncios:** Meta Ads.
- Moneda de inversión: por definir (COP vs USD).

## 8. Conexiones y publicación de pauta — cómo funciona

### El modelo: el cliente conecta SU propia cuenta ("bring your own account")

AVENTHRA **no** corre los anuncios bajo cuentas propias. El admin conecta su
cuenta de Meta/Google/TikTok vía OAuth, y AVENTHRA **orquesta** con el token
del cliente: las campañas se crean en la cuenta del cliente, y **la tarjeta
del cliente en Meta/Google paga la pauta**. AVENTHRA nunca toca el dinero de
anuncios directo. (Es lo que hacen AdCreative, Metricool, Hootsuite, etc.)

El modelo "agencia" (AVENTHRA corre todo bajo cuentas propias y cobra la pauta
aparte por Wompi) se descarta: te vuelve el anunciante legal, tienes que
frontear la plata, y Meta/Google te exigen ser reseller registrado.

### Setup de AVENTHRA (una vez, lo hace el dueño)

**Meta:**
1. App en developers.facebook.com → productos "Facebook Login for Business" +
   "Marketing API"
2. **Business Verification** del Business Manager de AVENTHRA
3. Solicitar **Advanced Access** para `ads_management`, `business_management`
   → **App Review** (screencast del flujo + política de privacidad). **1-4
   semanas**, puede rebotar con cambios.
4. App ID + App Secret + redirect URI de OAuth

> **Durante el review**: con "Standard Access" el API solo funciona para
> cuentas de anuncios donde los devs/testers de la app son admin. O sea:
> **se puede construir y probar todo con TU propia cuenta de Meta Ads antes
> de la aprobación.**

### Flujo de conexión del cliente (en `/admin/marketing/conexiones`)

1. Admin → "Conectar Meta Ads" → redirect a OAuth de Meta
   (`scope=ads_management,business_management,pages_show_list,pages_read_engagement`)
2. Meta muestra el consentimiento: "AVENTHRA quiere gestionar tus anuncios" →
   el cliente elige qué Business / Ad Account / Página autorizar
3. Callback → AVENTHRA canjea `code` → token corto → **token largo (60 días)**
   o mejor un **System User token** (no expira)
4. Se guarda **cifrado** en `ad_accounts`: token, `ad_account_id`, `page_id`,
   expiración. Se muestra el estado conectado.

### Publicar una campaña (cuando el admin aprueba)

Backend de AVENTHRA, con el token guardado, llama a la Marketing API de Meta:
```
POST /act_<ad_account_id>/adimages        -- sube el creativo
POST /act_<ad_account_id>/campaigns        -- objetivo, status=PAUSED
POST /act_<ad_account_id>/adsets           -- presupuesto, fechas, targeting
                                              (ubicación, idioma, intereses),
                                              optimization_goal, billing_event
POST /act_<ad_account_id>/adcreatives      -- titular, cuerpo, CTA, link, page_id
POST /act_<ad_account_id>/ads              -- une adset + creative
```
- Se crea **PAUSED**. AVENTHRA le muestra al admin el resumen exacto
  (presupuesto diario/total, duración, alcance estimado) → **el admin confirma
  el gasto** → se activa (status=ACTIVE). **La confirmación se loguea.**
- Se guarda el `external_id` (id de campaña de Meta) en `campaigns`.

### Métricas (cron diario)

```
GET /<campaign_id>/insights?fields=impressions,reach,clicks,spend,actions
```
→ se escribe en `campaign_metrics`.

### Tokens

- Token largo expira a 60 días → cron que refresca antes, o System User token.
- Si un token muere → `ad_accounts.status='expired'` + avisar al admin que
  reconecte. Nunca publicar con un token vencido.

### Google Ads / TikTok Ads (Fase 3)

Mismo patrón (OAuth + guardar token cifrado + orquestar). Diferencias:
- **Google Ads:** además del OAuth, hace falta un **developer token** de un
  Google Ads Manager (MCC) — se aplica y Google lo aprueba (días-semanas).
- **TikTok Ads:** TikTok for Business developer account + app review.

### Orden real

| Paso | Quién | Cuándo |
|---|---|---|
| Crear app de Meta + Business Verification + enviar App Review | dueño | ya, corre en paralelo |
| Construir `ad_accounts` + OAuth + publish flow (probado con tu cuenta) | dev | Fase 2 |
| Aprobación de Meta | Meta | 1-4 semanas |
| Clientes conectan sus cuentas | — | post-aprobación |

## 9. Siguiente

1. **Recargar Anthropic + Gemini** → desbloquea Fase 1 (estrategias, copy,
   creativos, campañas en borrador).
2. **Empezar la app de Meta** (dev account + Business Verification) → corre en
   paralelo, es el cuello de botella de la Fase 2.
3. Construir Fase 1 mientras Meta revisa.
