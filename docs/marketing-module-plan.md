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

## 7. Decisiones abiertas (para arrancar Fase 1)

- [ ] ¿El wizard de estrategia hace preguntas al admin, o infiere todo del
      negocio (catálogo, industria) y el admin solo ajusta?
- [ ] ¿Los creativos los compone la IA entera (texto dentro de la imagen), o
      la IA hace el fondo/producto y AVENTHRA superpone titular + testimonios
      con plantillas? (la 2da da más control y consistencia de marca)
- [ ] ¿El "CRM" es solo ventas atribuidas a campañas, o un CRM de leads
      completo (etapas, seguimiento)? — cambia mucho el alcance
- [ ] ¿Primera plataforma de anuncios a integrar: Meta? (es la más común para
      PYMEs en LatAm)
- [ ] Moneda de la inversión de pauta: COP (Wompi/mercado local) vs USD
