# Checklist — conectar TikTok Ads a AVENTHRA

> Compañero de `docs/marketing-module-plan.md` (§5 Fase 3). Mismo formato que
> `docs/google-ads-setup-checklist.md`.
>
> Leyenda:
> **[TÚ]** = lo haces en el navegador / trámite ·
> **[JUNTOS]** = en sesión con Claude (toca `.env.local`, Vercel o SQL) ·
> **[CLAUDE]** = código que escribo yo ·
> **[ESPERA]** = enviado, esperando aprobación de TikTok (días/semanas)
>
> Estado: **POSPUESTO al post-lanzamiento** (decidido 2026-09-07 — el
> usuario aún no tiene los documentos legales de la empresa que pide la
> verificación del Business Center, paso A.3 de abajo). No bloquea el
> despliegue — ver `CLAUDE.md`. El botón de TikTok en Marketing → Conexiones
> se queda en "Próximamente" hasta retomarlo. La landing pública no
> menciona TikTok en ningún lado, así que no hay nada que corregir ahí por
> ahora.
>
> Este checklist queda listo para cuando haya documentos y se retome.

---

## FASE 0 — Trámites en TikTok

### A. Business Center + cuenta de anuncios

- [ ] **[TÚ]** A.1 — Crear/entrar al **TikTok Business Center**
      ([business.tiktok.com](https://business.tiktok.com)) con la cuenta de la
      empresa, no una personal. Es el equivalente al Business Portfolio de Meta
      o al MCC de Google
- [ ] **[TÚ]** A.2 — Tener al menos una **cuenta de anuncios (Ad Account)**
      dentro del Business Center — sirve para probar
- [ ] **[TÚ]** A.3 — Verificación del negocio en el Business Center (documentos
      legales de la empresa). Igual que en Meta, es lo más lento: arrancarlo
      cuanto antes
- [ ] **[ESPERA]** Aprobación de la verificación

### B. App de desarrollador (TikTok for Business / Marketing API)

- [ ] **[TÚ]** B.1 — Entrar al portal de desarrolladores de TikTok for Business
      ([business-api.tiktok.com](https://business-api.tiktok.com)) y registrarse
      como desarrollador con la cuenta del Business Center
- [ ] **[TÚ]** B.2 — **Crear una app**. Datos que pide: nombre, descripción del
      uso, categoría, URL de la empresa, correo de contacto y las **URLs
      legales** (privacidad y términos)
      > Como en Meta, esas URLs las valida en vivo → necesitan el deploy real.
      > Ver `docs/channels-setup-checklist.md` §C.
- [ ] **[TÚ]** B.3 — **Redirect URI / Callback**, EXACTO:
      ```
      https://aventhra.online/api/auth/tiktok-ads/callback
      ```
      > TikTok exige `https` — a diferencia de Google, **no acepta
      > `localhost`**. Para probar en local hay que usar el túnel
      > (`cloudflared tunnel --url http://localhost:3000`), igual que con el
      > webhook de Meta e Instagram.
- [ ] **[TÚ]** B.4 — Pedir los **permisos/scopes de Marketing API** que
      necesitamos: leer cuentas de anuncios, gestionar campañas y leer
      reportes. TikTok los agrupa por producto al crear la app
- [ ] **[ESPERA]** **Revisión de la app por TikTok.** Hasta que la aprueben, la
      app solo funciona con las cuentas de anuncios del propio Business Center
      (equivalente al modo desarrollo de Meta / "Test accounts" de Google)
- [ ] **[TÚ]** B.5 — Guardar el **App ID** y el **App Secret** (los llaman
      `app_id` y `secret`)

### C. Variables de entorno

- [ ] **[JUNTOS]** `.env.local` (y luego Vercel, mismos valores):
      ```
      TIKTOK_ADS_APP_ID=...
      TIKTOK_ADS_APP_SECRET=...
      TIKTOK_ADS_REDIRECT_URI=https://.../api/auth/tiktok-ads/callback
      ```
      `TIKTOK_ADS_REDIRECT_URI` va explícito (no derivado de
      `NEXT_PUBLIC_APP_URL`) porque en local apunta al túnel, igual que
      `INSTAGRAM_REDIRECT_URI`.

### D. Base de datos

- [ ] Nada nuevo. `ad_accounts` ya soporta `provider='tiktok'` y las columnas
      `refresh_token` / `login_customer_id` que agregó `docs/sql/google-ads.sql`
      cubren el caso (TikTok también entrega refresh token)

### E. Si el dominio cambia
- [ ] `TIKTOK_ADS_REDIRECT_URI` en `.env.local` y en Vercel
- [ ] Redirect URI + URLs legales en la app de TikTok

---

## FASE 1 — Código (no empezado)

Mismo patrón que Meta y Google — la arquitectura ya está lista para un tercer
proveedor, así que es sobre todo copiar la forma:

- [ ] **[CLAUDE]** `lib/services/tiktokAdsOAuthService.ts` — URL de
      autorización + `state` firmado (reusa `lib/utils/oauthState.ts`, ya
      compartido con Meta y Google)
- [ ] **[CLAUDE]** `lib/services/tiktokAdsClient.ts` — canje del código de
      autorización por access token, listado de cuentas de anuncios
      autorizadas, y más adelante creación de campañas + reportes
- [ ] **[CLAUDE]** `app/api/auth/tiktok-ads/callback/route.ts`
- [ ] **[CLAUDE]** `startTikTokAdsConnectAction` + activar el botón en
      **Marketing → Conexiones** (hoy `comingSoon`)
- [ ] **[CLAUDE]** Sync de métricas en `campaign_metrics`

> **Nota honesta:** los endpoints exactos de la Marketing API de TikTok los
> fijo al construir, leyendo su documentación en ese momento — TikTok cambia de
> versión con frecuencia y su portal no es consultable sin sesión, así que no
> los dejo escritos acá para no dejar datos inventados o vencidos.

---

## FASE 2 — Prueba end-to-end

- [ ] **[JUNTOS]** Marketing → Conexiones → **Conectar** en TikTok Ads →
      autorizar → debe volver con "TikTok Ads conectado — «cuenta»"
- [ ] **[JUNTOS]** Verificar la fila de `ad_accounts` con `provider='tiktok'`
- [ ] **[TÚ]** Con la app aprobada: repetir con la cuenta de un negocio real

---

## Qué hace un CLIENTE (negocio) para conectar

> Marketing → Conexiones → **Conectar** en TikTok Ads → inicia sesión con la
> cuenta que administra su TikTok Business Center → elige su cuenta de anuncios
> → "Autorizar".

El cliente NO crea apps de TikTok ni pide revisiones. Todo eso es setup de
AVENTHRA, una sola vez.

---

## Diferencias con Meta y Google que hay que tener en la cabeza

| | Meta Ads | Google Ads | TikTok Ads |
|---|---|---|---|
| Token | largo (~60 días), sin refresh | 1 h + refresh token | access + refresh token |
| `localhost` en el redirect | sí (dev) | sí | **no** — toca túnel |
| Gate para cuentas reales | App Review | Developer token nivel Basic | Revisión de la app |
| Cuenta paraguas | Business Portfolio | Manager (MCC) | Business Center |
