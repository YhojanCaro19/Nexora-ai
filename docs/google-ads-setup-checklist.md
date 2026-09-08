# Checklist — conectar Google Ads a AVENTHRA

> Compañero de `docs/marketing-module-plan.md`. Mismo formato que
> `docs/channels-setup-checklist.md`.
>
> Leyenda:
> **[TÚ]** = lo haces en el navegador / trámite ·
> **[JUNTOS]** = en sesión con Claude (toca `.env.local`, Vercel o SQL) ·
> **[CLAUDE]** = código que escribo yo ·
> **[ESPERA]** = enviado, esperando aprobación de Google (días/semanas)
>
> Dominio: `aventhra.online` · Client ID: `__________` (se llena en A.4)

**Ojo:** el Google OAuth que ya usa AVENTHRA (el botón "Continuar con Google"
del login) es un proyecto/credencial **distinto** — lo administra Supabase y su
scope es solo identidad, no anuncios. Para Google Ads hace falta un client OAuth
propio, con el scope `adwords`.

---

## FASE 0 — Trámites en las consolas de Google

### A. Google Cloud — proyecto + API + credenciales OAuth

- [x] **[TÚ]** A.1 — [console.cloud.google.com](https://console.cloud.google.com):
      proyecto creado (o reusado)
- [x] **[TÚ]** A.2 — **APIs & Services → Library** → **"Google Ads API"** → **Enable**
- [ ] **[TÚ]** A.3 — **Pantalla de consentimiento OAuth**. Google le cambió el
      nombre: hoy puede vivir bajo **"Google Auth Platform"** (menú ☰) o en
      **APIs & Services → OAuth consent screen / Branding**. Si al entrar te pide
      crear la "marca" (nombre de la app, correo de soporte), es ahí — llénala
      primero. Dentro:
      - Tipo: **External**
      - Nombre de la app, correo de soporte, logo (opcional)
      - **Scopes** → agregar `https://www.googleapis.com/auth/adwords`
      - **Test users** → tu propio correo de Google (el que administra la cuenta
        de Google Ads). Mientras la app esté en **Testing** solo esos correos
        pueden completar el login. Alcanza para construir y probar; no hace falta
        publicarla ni pedir verificación todavía.
        ⚠️ En modo Testing el **refresh token caduca a los 7 días** → toca
        reconectar. Se arregla solo cuando la app pase a **In production**.
- [ ] **[TÚ]** A.4 — **APIs & Services → Credentials → Create Credentials →
      OAuth client ID**:
      - Tipo: **Web application**
      - Nombre: "Aventhra — Google Ads"
      - **Authorized redirect URIs**, EXACTO (los dos):
        ```
        https://aventhra.online/api/auth/google-ads/callback
        http://localhost:3000/api/auth/google-ads/callback
        ```
        (Google sí acepta `localhost`, a diferencia de Instagram)
      - Guardar el **Client ID** y el **Client Secret**

### B. Google Ads — cuenta Manager (MCC) + Developer Token

- [ ] **[TÚ]** B.5 — Crear cuenta **Manager (MCC)** en
      [ads.google.com/home/tools/manager-accounts](https://ads.google.com/home/tools/manager-accounts)
      si no tienes una. Es la cuenta "paraguas" desde la que se administra el
      developer token
- [ ] **[TÚ]** B.6 — Dentro del MCC: **Tools & Settings (llave inglesa) → Setup →
      API Center**
- [ ] **[TÚ]** B.7 — Solicitar el **Developer Token**. Sale al instante con
      acceso de nivel **"Test accounts"**: sirve para probar el flujo completo,
      pero SOLO contra cuentas de Google Ads de prueba (sin gasto real)
- [ ] **[TÚ]** B.8 — En el mismo API Center, **solicitar acceso Basic** (el que
      funciona con cuentas reales de tus clientes). Google pide una descripción
      del uso — algo como: *"Aventhra es una plataforma SaaS donde cada negocio
      conecta su propia cuenta de Google Ads para publicar sus propias
      campañas."*
- [ ] **[ESPERA]** Aprobación del acceso Basic (días a un par de semanas, lo
      revisa una persona)

### C. Lo que me pasas cuando lo tengas

No hace falta esperar el acceso Basic: con la sección A + el developer token de
nivel "Test accounts" ya se prueba de punta a punta.

- [ ] **[JUNTOS]** `.env.local` (y luego Vercel, mismos valores):
      ```
      GOOGLE_ADS_CLIENT_ID=...
      GOOGLE_ADS_CLIENT_SECRET=...
      GOOGLE_ADS_DEVELOPER_TOKEN=...
      GOOGLE_ADS_LOGIN_CUSTOMER_ID=1234567890   # Customer ID del MCC, solo dígitos
      # opcional — solo si Google saca una versión nueva de la API:
      # GOOGLE_ADS_API_VERSION=v25
      ```
      Sin las 3 primeras, el botón de Google en Conexiones se queda en
      "Próximamente" (`isGoogleAdsConfigured()`).

### D. Base de datos

- [ ] **[TÚ]** Supabase → SQL Editor → correr `docs/sql/google-ads.sql`
      (agrega `refresh_token` y `login_customer_id` a `ad_accounts`;
      idempotente). Meta no usa refresh token, Google sí — su access token
      dura 1 hora

### E. Si el dominio cambia
- [ ] `NEXT_PUBLIC_APP_URL` en `.env.local` y en Vercel
- [ ] Google Cloud → Credentials → el client OAuth → **Authorized redirect URIs**
      (`<dominio>/api/auth/google-ads/callback`)

---

## FASE 1 — Código (hecho, 2026-09-07)

- [x] **[CLAUDE]** `lib/utils/oauthState.ts` — firma del `state` (HMAC + TTL)
      extraída de `metaOAuthService` y compartida por Meta y Google
- [x] **[CLAUDE]** `lib/services/googleAdsOAuthService.ts` — URL de
      consentimiento con `access_type=offline` + `prompt=consent` (sin eso
      Google no da refresh token), `state` firmado, `isGoogleAdsConfigured()`
- [x] **[CLAUDE]** `lib/services/googleAdsClient.ts` — canje de code,
      refresco del access token, `customers:listAccessibleCustomers`,
      detalle de cada cuenta (`googleAds:search`). Sin SDK nuevo, solo `fetch`
- [x] **[CLAUDE]** `app/api/auth/google-ads/callback/route.ts` — verifica
      `state` + sesión, canjea tokens, descarta cuentas **Manager** (desde un
      MCC no se pauta) y guarda la primera cuenta operativa. `listAccessibleCustomers`
      solo da las cuentas de nivel superior (casi siempre el Manager) —
      cuando lo es, `listChildAccounts` (recurso `customer_client`) baja un
      nivel a buscar una cuenta operativa colgada de ese Manager
      *(bug real encontrado y corregido 2026-09-07, probando con la cuenta
      de prueba "barberpro")*
- [x] **[CLAUDE]** `adAccountService` — guarda los dos tokens cifrados y
      **renueva solo** el access token de Google cuando vence (margen de 5 min);
      si el refresh falla, marca la conexión `expired` y pide reconectar
- [x] **[CLAUDE]** `startGoogleAdsConnectAction` + botón real en
      **Marketing → Conexiones** (mensajes de error propios de Google)
- [ ] **[PENDIENTE]** Selector de cuenta cuando el admin tiene varias
      (hoy conecta la primera operativa) — mismo pendiente que en Meta
- [ ] **[PENDIENTE]** Publicar campañas en Google Ads (hoy solo se conecta la
      cuenta). Ver "Decisión pendiente" abajo
- [ ] **[PENDIENTE]** Sync de métricas de Google en `campaign_metrics`
      (hoy el cron `marketing-metrics` solo trae Meta)

---

## FASE 2 — Prueba end-to-end (COMPLETA, 2026-09-07)

- [x] **[TÚ]** Manager de prueba **"Yhojan"** (`300-320-8552`) + cuenta
      cliente de prueba **"barberpro"** (`948-381-6070`) creados
- [x] **[JUNTOS]** Marketing → Conexiones → **Conectar** en Google Ads →
      login con `caroyhojan@gmail.com` → "Permitir" → volvió con
      **"Google Ads conectado — «barberpro»"** ✅
- [ ] **[TÚ]** Con acceso **Basic** aprobado: repetir contra una cuenta real
      (Manager real AVENTHRA `414-627-0131`)

---

## Qué hace un CLIENTE (negocio) para conectar

Nada de lo de arriba. Una vez AVENTHRA está en producción y el acceso Basic
aprobado:

> Marketing → Conexiones → **Conectar** en Google Ads → inicia sesión con el
> Google que administra su cuenta de Ads → "Permitir". ~30 s.

El cliente NO crea proyectos en Google Cloud, NO pide developer tokens, NO
toca redirect URIs. Todo eso es setup de AVENTHRA, una sola vez.

---

## Decisión pendiente (no bloquea la conexión)

Qué tipo de campaña crear cuando se publique de verdad. Google **no tiene** un
equivalente directo al "Click-to-Messenger" de Meta, que es el formato con el
que la estrategia de AVENTHRA lleva gente al agente. Opciones a evaluar cuando
estemos cerca del acceso Basic:

- **Búsqueda** con extensión/recurso de mensaje o llamada → el lead llega por
  teléfono/WhatsApp, no al agente.
- **Performance Max / Demand Gen** → conversión en un landing propio, y de ahí
  al WhatsApp del negocio (el FAB o un `wa.me` con mensaje precargado).
- Campaña que apunte a un `wa.me/<numero>` del negocio → el agente responde por
  WhatsApp (depende de la Fase 5 de canales, ver
  `docs/whatsapp-setup-checklist.md`).

La tercera es la que mejor cierra el círculo con el resto del producto.
