# Módulo de Canales — conectar el agente a WhatsApp, Messenger e Instagram

> Estado: **Fase 0 / 1** (setup + fundaciones). Ninguna línea de este flujo
> está en producción todavía. El motor conversacional (`agentEngineService`)
> ya funciona pero solo sobre `channel = "test"`.

## 1. Idea central

WhatsApp, Messenger (Facebook) e Instagram DMs son **los tres productos de
Meta**. Una sola app de Meta, un solo webhook, un solo patrón de OAuth. No
son tres integraciones: es una con tres canales.

AVENTHRA registra **una** app en `developers.facebook.com` (la misma que va
a servir para Meta Ads del módulo de Marketing — ver
`docs/marketing-module-plan.md`). Cada negocio, desde su panel, autoriza a
esa app a leer y responder los mensajes de su Página / número / cuenta de
Instagram. Guardamos un **token por negocio** (cifrado). Con ese token:

```
Cliente escribe en WhatsApp / Messenger / IG
      ↓
Meta  →  POST /api/webhooks/meta      (verificar firma X-Hub-Signature-256)
      ↓
¿Qué canal? (campo `object`)  ¿Qué negocio? (external_id → channel_connections)
      ↓
getOrCreateCustomer(businessId, externalUserId, channel)
getOrCreateConversation(...)
      ↓
runAgentTurn()                        ← el motor que YA existe, casi sin tocar
      ↓
metaChannelService.sendMessage(connection, reply)   → Graph API con el token del negocio
      ↓
logAgentUsage + chargeAgentReply      ← ya existe
```

El negocio nunca nos da su contraseña y puede revocar el acceso desde
Facebook cuando quiera.

## 2. Lo que ve el negocio

Sección nueva **Mi Agente → Canales** (hermana de "Configuración" y
"Probar tu agente"):

```
Canales
 ┌─────────────────────────────────────────────────────────┐
 │ Facebook (Messenger)   ● Conectado — "Pizzería Don Luis" │
 │ Instagram              ○ No conectado      [ Conectar ]  │
 │ WhatsApp               ○ No conectado      [ Conectar ]  │
 └─────────────────────────────────────────────────────────┘
```

- **Conectar Messenger / Instagram:** popup de Facebook Login for Business →
  el negocio inicia sesión con su Facebook, elige la Página (y la cuenta de
  IG ligada a ella) → vuelve al callback → guardamos token + suscribimos el
  webhook de esa Página → la fila pasa a "Conectado".
- **Conectar WhatsApp:** Embedded Signup de Meta (popup donde registra o
  vincula su número) **o** alta vía un BSP. Decisión pendiente — ver §7.
- **Desconectar:** revoca el token y marca `status = 'revoked'`.

Solo el **admin** del negocio ve y gestiona esta sección (RLS por
`is_business_admin`). Un colaborador no.

## 3. Esquema de base de datos

SQL en `docs/sql/channels-module.sql`. Una tabla nueva:

### `channel_connections`

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid pk | |
| `business_id` | uuid FK `businesses` | on delete cascade |
| `channel` | text | `'messenger' \| 'instagram' \| 'whatsapp'` |
| `provider` | text | `'meta'` (default). Futuro: `'bsp_360dialog'`, etc. |
| `external_id` | text | Page ID (messenger) · IG user id (instagram) · `phone_number_id` (whatsapp) |
| `external_name` | text | "Pizzería Don Luis" — para la UI |
| `access_token` | text | **CIFRADO** en la capa app (AES-256-GCM). Nunca sale al cliente |
| `token_expires_at` | timestamptz | `null` = token que no expira (system user / page token de larga duración) |
| `extra` | jsonb | `waba_id`, categoría de la página, `ig_username`, `psid`… lo que cada canal necesite |
| `webhook_subscribed` | boolean | si ya suscribimos el webhook de este objeto |
| `status` | text | `'active' \| 'expired' \| 'revoked' \| 'error'` |
| `last_error` | text | último error de envío/refresh, para mostrar "reconecta tu canal" |
| `connected_by` | uuid FK `auth.users` | quién lo conectó |
| `connected_at` | timestamptz | |
| `updated_at` | timestamptz | trigger `set_updated_at` |

**Constraints**
- `unique (channel, external_id)` — una Página/número solo puede estar
  conectada a UN negocio (evita que otro negocio secuestre un canal ajeno).
  Es también la clave con la que el webhook resuelve `external_id → negocio`.
- `unique (business_id, channel)` — v1: un canal de cada tipo por negocio.
  Se puede relajar después si un negocio tiene varias Páginas.

**RLS** — mismo criterio que `agent_usage_log`:
- RLS activada.
- Policy `SELECT` solo para `is_business_admin(business_id)`.
- `revoke select (access_token)` a `authenticated` y `anon` → el token
  **nunca** viaja al navegador, ni siquiera para el admin.
- Sin policy de `INSERT/UPDATE/DELETE`: solo el service role escribe
  (callback de OAuth y cron de refresco corren server-side).

### `customers` — sin cambio de esquema por ahora

Messenger e Instagram no dan un teléfono: dan un **PSID / IGSID** (id
opaco, scoped a nuestra app). Se guarda en la columna `customers.phone`
como "id externo del usuario en ese canal" (el nombre `phone` queda
impreciso para esos canales pero la clave `business_id + phone + channel`
sigue siendo única y correcta). WhatsApp sí da E.164 real. Si más adelante
molesta, se agrega `customers.external_user_id` — no es necesario para v1.

## 4. Piezas de backend a construir

### 4.1 Cifrado de tokens — `lib/utils/tokenCrypto.ts`
`encryptToken(plain)` / `decryptToken(payload)` con AES-256-GCM (módulo
`crypto` de Node, sin dependencia nueva). Llave en `CHANNELS_TOKEN_KEY`
(32 bytes en base64). Formato guardado: `iv:authTag:ciphertext` en base64.
Se usa **solo** en código server (`"use server"` / route handlers / cron).

### 4.2 Cliente de Graph API — `lib/services/metaGraphClient.ts`
Wrapper fino sobre `fetch` a `https://graph.facebook.com/{version}`.
Version fija en `META_GRAPH_VERSION` (default `v21.0`). Maneja: canje de
`code → token`, extensión a token largo, `debug_token`, suscripción de
webhook (`POST /{page-id}/subscribed_apps`), y envío de mensajes.

### 4.3 Servicio de canales — `lib/services/channelConnectionService.ts`
- `listConnections(businessId)` → estado para la UI (sin token).
- `saveConnection(...)` → upsert desde el callback (service role).
- `getConnectionByExternalId(channel, externalId)` → para el webhook.
- `markConnectionError(id, msg)` / `revokeConnection(id)`.
- `decryptFor(connection)` → devuelve el token en claro, solo server.

### 4.4 Envío saliente — `lib/services/metaChannelService.ts`
`sendMessage(connection, text)`. Un método, tres formas de body según
`connection.channel`:

| Canal | Endpoint | Body (resumido) |
|---|---|---|
| Messenger | `POST /{PAGE_ID}/messages` | `{ recipient:{id:PSID}, messaging_type:"RESPONSE", message:{text} }` |
| Instagram | `POST /{IG_ID}/messages` | `{ recipient:{id:IGSID}, message:{text} }` |
| WhatsApp | `POST /{PHONE_NUMBER_ID}/messages` | `{ messaging_product:"whatsapp", to:E164, type:"text", text:{body} }` |

Auth: Messenger/IG con el page token en query o header; WhatsApp con
`Authorization: Bearer {token}`.

### 4.5 OAuth callback — `app/api/auth/meta/callback/route.ts`
Recibe `?code=…&state=…`. Valida `state` (CSRF, firmado con un secreto y
atado a la sesión). Canjea `code` → token corto → token largo. Lista las
Páginas / cuentas IG / WABAs que el negocio autorizó. Escribe
`channel_connections` (service role). Suscribe el webhook de cada objeto.
Redirige a `/admin/mi-agente/canales?connected=messenger`.

El **inicio** del flujo es una server action que arma la URL de Facebook
Login for Business con `client_id`, `redirect_uri`, `config_id`, `state` y
hace `redirect()`.

### 4.6 Webhook único — `app/api/webhooks/meta/route.ts`
- **GET**: handshake. Query `hub.mode=subscribe`, `hub.verify_token`,
  `hub.challenge`. Si `hub.verify_token === META_WEBHOOK_VERIFY_TOKEN` →
  responder el `challenge` en texto plano. Si no → 403.
- **POST**: mensaje entrante.
  1. Leer el **raw body** y verificar `X-Hub-Signature-256`
     (`sha256=` + HMAC-SHA256(rawBody, APP_SECRET), comparación
     `timingSafeEqual`). Igual que `app/api/webhooks/wompi/route.ts`.
  2. Responder **200 de inmediato** y procesar en segundo plano
     (Meta reintenta y penaliza si tardamos > ~5 s).
  3. Enrutar por `body.object`:
     - `page` → Messenger. `entry[].messaging[]`: `sender.id` = PSID,
       `message.text`. `recipient.id` = Page ID → negocio.
     - `instagram` → IG. Misma forma. `recipient.id` = IG id → negocio.
     - `whatsapp_business_account` → `entry[].changes[].value`:
       `messages[]`, `metadata.phone_number_id` → negocio, `messages[].from`
       = E.164, `messages[].text.body`.
  4. Ignorar echos, `delivery`, `read`, `message_reactions`, mensajes del
     propio negocio, y todo lo que no sea texto entrante (v1 solo texto).
  5. `getOrCreateCustomer` → `getOrCreateConversation` → `runAgentTurn` →
     `metaChannelService.sendMessage`.

### 4.7 Enganche con el motor
`agentEngineService.runAgentTurn` hoy tiene `TEST_CHANNEL` hardcodeado
(`lib/services/agentEngineService.ts:50`, `:68`, `:78`). Se agrega un
parámetro `channel` (default `"test"` para no romper "Probar tu agente").
Nada más del motor cambia — `customers`/`conversations` ya son multi-canal
(`docs/database.md:56`).

### 4.8 Salud de tokens — cron
Extender un cron existente (o `/api/cron/token-refresh`): antes de que un
`token_expires_at` venza, refrescar. Si un envío devuelve 401/190 →
`status = 'error'` + avisar al admin ("reconecta tu canal de WhatsApp").
Nunca intentar responder con un token muerto.

### 4.9 Regla de las 24 horas
En los tres canales el agente responde libre **dentro de 24 h** del último
mensaje del cliente. Fuera de esa ventana:
- WhatsApp → hace falta una **plantilla pre-aprobada**.
- Messenger/IG → **message tags** específicos (p. ej.
  `HUMAN_AGENT`, `POST_PURCHASE_UPDATE`) o queda bloqueado.

Esto afecta al **recordatorio de reserva** del cron: debe salir como
plantilla WhatsApp aprobada, no como mensaje normal. Se diseña con
plantillas desde el principio (ver §7-B).

## 5. Variables de entorno nuevas

`.env.local` (dev) y Project Settings → Environment Variables en Vercel
(prod). Ninguna se comitea.

| Var | Qué es | Secreta |
|---|---|---|
| `META_APP_ID` | App ID de la app de Meta | no (pública) |
| `NEXT_PUBLIC_META_APP_ID` | mismo valor, para el SDK JS del popup | no |
| `META_APP_SECRET` | App Secret | **sí** |
| `META_CONFIG_ID` | id de la "configuración" de Facebook Login for Business | no |
| `META_WEBHOOK_VERIFY_TOKEN` | string aleatorio que inventamos (handshake del webhook) | **sí** |
| `META_GRAPH_VERSION` | `v21.0` (opcional, default en código) | no |
| `CHANNELS_TOKEN_KEY` | 32 bytes base64 — cifra `access_token` en la DB | **sí** |
| `META_OAUTH_STATE_SECRET` | firma el `state` del OAuth (CSRF) | **sí** |

Generar los secretos propios (no de Meta):
```
openssl rand -base64 32   # CHANNELS_TOKEN_KEY
openssl rand -hex 32      # META_WEBHOOK_VERIFY_TOKEN
openssl rand -hex 32      # META_OAUTH_STATE_SECRET
```

## 6. Lo que hay que hacer en Meta (trámite — empezar YA, es lo lento)

Ver el paso a paso detallado en la conversación / `docs/setup-checklist.md`.
Resumen de dependencias:

| Requisito | Para qué | Tiempo aprox. |
|---|---|---|
| Páginas legales publicadas (Privacidad + Términos + Borrado de datos) en `aventhra.online` | Requisito de la app de Meta | — (lo construimos) |
| App de Meta tipo "Business" creada | Contenedor de todo | minutos |
| Business Verification del portafolio de Meta de AVENTHRA | Casi todos los permisos | días–semanas |
| Facebook Login for Business + "configuración" con permisos | Popup de conexión | minutos |
| App Review: `pages_messaging`, `pages_manage_metadata`, `pages_show_list` | Messenger para negocios reales | 1–4 semanas |
| App Review: `instagram_basic`, `instagram_manage_messages` | IG DMs | 1–4 semanas |
| WhatsApp: Tech Provider (Embedded Signup) **o** BSP | Onboarding de números | variable |

**Todo se construye y prueba en modo desarrollo con la cuenta propia
antes de que Meta apruebe nada.** El App Review solo hace falta para
abrirlo a terceros.

## 7. Decisiones pendientes

**A) WhatsApp: directo con Meta (Embedded Signup, somos Tech Provider) o
por un BSP (360dialog / Twilio / Gupshup)?**
- Directo: más control, más barato por mensaje, más trabajo.
- BSP: salimos semanas antes, ellos manejan la relación con Meta y el
  onboarding; cuesta algo más por mensaje.
- Recomendación: **BSP para arrancar**, evaluar migración a directo con
  volumen. Messenger/IG van siempre directo.

**B) Recordatorio de reserva y ventana de 24 h.** Diseñar el cron con
plantillas WhatsApp aprobadas desde el inicio (vs. asumir mensaje libre).
Recomendación: sí, plantillas desde el principio.

## 8. Orden de construcción

- **Fase 0** (en paralelo, ahora): páginas legales, crear app de Meta,
  arrancar Business Verification, elegir camino de WhatsApp.
- **Fase 1**: `channels-module.sql` + `tokenCrypto` + `metaGraphClient` +
  `channelConnectionService` + `metaChannelService`. Probado con curl y la
  cuenta propia.
- **Fase 2**: server action de inicio + `/api/auth/meta/callback` +
  pantalla **Mi Agente → Canales**. Empezar por **Messenger** (el más
  simple).
- **Fase 3**: `/api/webhooks/meta` (GET handshake + POST con firma) +
  enrutado + enganche a `runAgentTurn`. Messenger de punta a punta.
- **Fase 4**: sumar **Instagram** (mismo webhook, mismo flujo).
- **Fase 5**: **WhatsApp** (Embedded Signup o BSP) + plantillas para el
  recordatorio de reserva.
- **Fase 6**: cron de salud de tokens, estados de error en la UI, rate
  limiting del webhook.
- **Fase 7**: App Review de cada permiso → abrir a negocios reales.
