# Checklist — conectar las redes (WhatsApp / Messenger / Instagram) a AVENTHRA

> Compañero de `docs/channels-module-plan.md`. Esto es la lista de tareas
> para no perdernos. Se va marcando con el tiempo.
>
> Leyenda:
> **[TÚ]** = lo haces en el navegador / trámite ·
> **[JUNTOS]** = en sesión con Claude (toca `.env.local`, Vercel o código) ·
> **[CLAUDE]** = código que escribo yo ·
> **[ESPERA]** = enviado, esperando aprobación de Meta (días/semanas)
>
> Dominio: `aventhra.online` · App de Meta: `__________` (App ID, se llena en A.2)

---

## FASE 0 — Setup y trámites (empezar todo YA, corre en paralelo)

### A. Secretos y variables de entorno
- [x] **[JUNTOS]** Generar `CHANNELS_TOKEN_KEY`, `META_WEBHOOK_VERIFY_TOKEN`,
      `META_OAUTH_STATE_SECRET` en `.env.local` — *hecho 2026-09-02*
- [x] **[JUNTOS]** `.env.local`: `META_APP_ID`, `NEXT_PUBLIC_META_APP_ID`,
      `META_APP_SECRET`, `META_GRAPH_VERSION=v21.0` — *hecho 2026-09-02*
- [ ] **[JUNTOS]** `.env.local`: `META_CONFIG_ID` (falta el Paso E)
- [ ] **[JUNTOS]** `META_WEBHOOK_VERIFY_TOKEN` se rotó 2026-09-02 (quedó
      expuesto en sesión antes de estar conectado a nada — sin impacto)
- [ ] **[JUNTOS]** Replicar las 8 variables en Vercel → Project → Settings →
      Environment Variables (mismos valores que local — si no, los tokens
      cifrados no se pueden descifrar en prod)

### B. Base de datos
- [x] **[TÚ]** Supabase → Database → Backups → snapshot
- [x] **[TÚ]** Supabase → SQL Editor → correr `docs/sql/channels-module.sql`
      — *hecho 2026-09-02, 15 columnas OK*
- [x] **[TÚ]** Verificar columnas de `channel_connections` — *OK*

### C. Páginas legales + despliegue (Meta las exige SOLO para App Review)
> **2026-09-02:** `aventhra.online` está parqueado en Hostinger, la app
> NUNCA se ha desplegado (solo corre en localhost). Meta valida estas URLs
> en vivo, así que no se pueden cargar hasta que haya un deploy real.
> En **modo desarrollo** no hacen falta → se dejan vacías por ahora.
- [x] **[TÚ]** Campos de Privacidad / Condiciones / Eliminación de datos
      dejados vacíos en la app de Meta — *2026-09-02, guardado OK*
- [ ] **[FUTURO]** Primer deploy de AVENTHRA (Vercel) + conectar
      `aventhra.online` (DNS en Hostinger → Vercel)
- [ ] **[CLAUDE]** Crear rutas `/privacidad`, `/terminos`,
      `/borrado-de-datos` con borrador base
- [ ] **[TÚ]** Revisar / ajustar el contenido legal real con un abogado
- [ ] **[JUNTOS]** Confirmar que las 3 URLs cargan en producción

### D. Crear la app de Meta
- [x] **[TÚ]** App creada — tipo **Business**, App ID `1093170269890362`
- [x] **[TÚ]** App ID + App Secret en `.env.local` — *2026-09-02*
- [x] **[TÚ]** Productos agregados: **Messenger**, **Instagram** — *2026-09-02*
- [ ] **[TÚ]** Producto **WhatsApp** — pendiente (necesita portafolio
      empresarial completo; es Fase 5, no urge)
- [ ] **[TÚ]** Producto **API de marketing** — para el módulo de Marketing
      (mismo app; el código de ads es aparte)

### E. Facebook Login (el popup de "Conectar")
> **Cambio 2026-09-02:** se usa **Facebook Login clásico**, NO "for
> Business". Hace lo mismo para nuestro caso (un negocio conecta su Página)
> sin Config ID ni "acceso avanzado a public_profile". Migrar a "for
> Business" solo si hace falta el flujo multi-negocio de Tech Provider.
- [x] **[TÚ]** "Obtener acceso avanzado" para `public_profile` — *2026-09-02*
- [x] **[TÚ]** URI de redireccionamiento de OAuth válido:
      `https://aventhra.online/api/auth/meta/callback`
      (localhost se permite solo en dev, no se añade) — *2026-09-02*
- [ ] **[TÚ]** Producto "Inicio de sesión con Facebook para empresas":
      ya NO hace falta configurarlo (se usa el clásico)

### D-bis. Si el dominio cambia (el usuario cree que lo hará)
> Rehacer **todo** lo que dependa del dominio antes de desplegar. Lista
> completa en `CLAUDE.md` → "Antes de desplegar". Lo de canales:
- [ ] `NEXT_PUBLIC_APP_URL` en `.env.local` y en Vercel
- [ ] App de Meta → App domains + URLs legales
- [ ] App de Meta → **URI de redireccionamiento de OAuth válidos**
      (`<dominio>/api/auth/meta/callback`)
- [ ] App de Meta → URL del webhook (`<dominio>/api/webhooks/meta`) +
      reverificar el handshake
- [ ] Resend: verificar el dominio nuevo + `RESEND_FROM_EMAIL` + DNS

### F. Business Verification (lo más lento — arrancar cuanto antes)
- [ ] **[TÚ]** Business Portfolio → Security Center → Start Verification
- [ ] **[TÚ]** Subir documentos legales de la empresa (RUT / cámara de
      comercio / factura de servicios a nombre del negocio)
- [ ] **[ESPERA]** Aprobación de Meta (días–semanas)

### G. Decisiones a cerrar
- [ ] **[TÚ]** WhatsApp: ¿BSP (360dialog / Twilio) o directo (Embedded
      Signup)? — recomendación: BSP para arrancar
- [ ] **[TÚ]** Recordatorio de reserva por WhatsApp con plantillas
      pre-aprobadas desde el inicio — recomendación: sí

---

## FASE 1 — Fundaciones de código (Claude, probado con curl)

- [x] **[CLAUDE]** `lib/utils/tokenCrypto.ts` — cifrar/descifrar tokens
      (AES-256-GCM). Round-trip verificado con la llave real
- [x] **[CLAUDE]** `lib/types/channel.ts` — tipos/labels de los 3 canales
- [x] **[CLAUDE]** `lib/services/metaGraphClient.ts` — wrapper de Graph API
      (canje de code, token largo, debug_token, suscribir webhook)
- [x] **[CLAUDE]** `lib/services/channelConnectionService.ts` — CRUD de
      `channel_connections` (service role, nunca expone el token al cliente)
- [x] **[CLAUDE]** `lib/services/metaChannelService.ts` — `sendChannelMessage()`
      con las 3 formas de body (Messenger / IG / WhatsApp)
- [ ] **[JUNTOS]** Probar envío con `curl` + un token de prueba de la
      cuenta propia *(se hace junto con la prueba de Fase 2)*

---

## FASE 2 — Conexión + UI (empezar por Messenger)

- [x] **[CLAUDE]** `lib/services/metaOAuthService.ts` — `state` firmado
      (HMAC) + arma la URL del diálogo de OAuth (Login clásico)
- [x] **[CLAUDE]** `startMetaConnectAction` + `disconnectChannelAction` en
      `app/(dashboard)/admin/perfil/actions.ts`
- [x] **[CLAUDE]** `app/api/auth/meta/callback/route.ts` — verifica state +
      sesión, canjea code → token largo, lista Páginas, guarda Messenger
      (+ Instagram si la Página tiene IG ligada), intenta suscribir webhook
- [x] **[CLAUDE]** Sección **Perfil → "Conectar redes"** (admin-only;
      estado por canal, Conectar / Desconectar, banners de resultado,
      mobile-first). *Se movió de Mi Agente a Perfil a pedido del usuario
      (2026-09-02).* tsc + eslint limpios
- [x] **[TÚ]** Página de Facebook de prueba creada («Barbería cuti»)
- [x] **[TÚ]** Conectado desde Perfil → Conectar redes → **funcionó**
      *(2026-09-02: OAuth + token largo + cifrado + guardado + RLS, todo OK)*
- [ ] **[PENDIENTE]** Selector de Página cuando la cuenta tiene varias
      (hoy conecta la primera)

---

## FASE 3 — Webhook + agente respondiendo (Messenger end-to-end)

> **Sin deploy:** el webhook necesita una URL pública HTTPS (Meta no llama a
> `localhost`). Para probar sin desplegar → túnel temporal durante la
> sesión: `cloudflared tunnel --url http://localhost:3000` o
> `ngrok http 3000`. Se registra esa URL como Callback y se cambia por la
> real cuando AVENTHRA por fin se despliegue. El flujo de "Conectar"
> (Fase 2) SÍ funciona en localhost.


- [x] **[CLAUDE]** `app/api/webhooks/meta/route.ts` — GET handshake +
      POST con verificación de firma `X-Hub-Signature-256`, enrutado por
      `body.object`, resolución `external_id → negocio`, ignora echos /
      no-texto, dedupe en memoria por id de mensaje
- [x] **[CLAUDE]** Parámetro `channel` + `opts.serviceRole` en `runAgentTurn`
      — el webhook corre sin sesión, con service role todo el turno (el
      `db?` opcional se agregó a ~10 funciones del motor)
- [x] **[TÚ]** Túnel `cloudflared` + webhook de Messenger configurado y
      verificado + Página «Barbería cuti» suscrita a `messages`
- [x] **[TÚ + CLAUDE]** Mensaje de prueba → **el agente respondió** con la
      config real del negocio *(2026-09-02, Messenger vivo end-to-end)* 🎉
- [x] **[TÚ + CLAUDE]** El agente **creó una reserva real** desde Messenger
      («Corte con barba» con Andres, jueves 3 sep 09:30) → visible en el
      módulo de Reservas con `source: agent`, y confirmó en el chat.
      *(2026-09-02 — loop completo: red social → IA → acción → panel → cliente)*
- [ ] **[CLAUDE/JUNTOS]** Confirmar en la DB que `agent_usage_log` +
      `conversations` registran el turno del canal `messenger`
- [x] **[CLAUDE]** El `POST` tardaba ~10 s → **resuelto en Fase 6**:
      responde 200 al instante y procesa con `after()`.

---

## FASE 4 — Instagram

> El código ya está: el webhook enruta `object: "instagram"` igual que
> `page`, y la conexión de IG se guarda sola al conectar Messenger si la
> Página tiene una cuenta de IG ligada. Solo falta la parte de config.
- [ ] **[TÚ]** Cuenta de IG en modo Business/Creator, ligada a la Página
- [ ] **[TÚ]** Meta → Instagram → Webhooks: suscribir `messages`
- [ ] **[CLAUDE]** Confirmar enrutado `object: "instagram"` en el webhook
- [ ] **[TÚ]** DM de prueba a la cuenta de IG → el agente responde

---

## FASE 5 — WhatsApp

*(pasos concretos dependen de la decisión BSP vs directo — G)*
- [ ] **[TÚ]** Alta del número (Embedded Signup o panel del BSP)
- [ ] **[CLAUDE]** Flujo de conexión de WhatsApp en **Mi Agente → Canales**
- [ ] **[CLAUDE]** Enrutado `object: "whatsapp_business_account"` +
      `phone_number_id → negocio`
- [ ] **[TÚ]** Crear y aprobar plantilla del **recordatorio de reserva**
      (WhatsApp fuera de la ventana de 24 h necesita plantilla — hoy el
      cron cae al hilo del CRM en ese caso, ver Fase 6)
- [ ] **[TÚ]** Mensaje de prueba al número → el agente responde

---

## FASE 6 — Robustez

- [x] **[CLAUDE]** Respuesta 200 inmediata + procesado con `after()` +
      rate limit por remitente (15/min) — *2026-09-02*
- [x] **[CLAUDE]** Cron `/api/cron/channel-token-health` (cada hora,
      trabajo real cada ~24h): `debug_token` → si el token murió,
      `status = 'error'`. En vercel.json (necesita Vercel Pro)
- [x] **[CLAUDE]** UI: conexión en `error`/`expired` muestra botón
      **"Reconectar"** en Perfil → Conectar redes
- [x] **[CLAUDE]** Recordatorios de reserva ESCALONADOS y con envío real
      por el canal (`/api/cron/reservation-reminders`, *2026-09-03*):
        · mismo día → ~1 h antes (tick :00 anterior)
        · mañana o más → la tarde anterior (desde las 6 pm local), o sea
          el día antes
        · 1 recordatorio por reserva (`reminder_sent_at`)
      Envía por Messenger/IG/WhatsApp vía `sendChannelMessage`. Fuera de la
      ventana de 24 h de Messenger usa el tag `CONFIRMED_EVENT_UPDATE`. Si
      el envío falla igual (IG sin tag, WhatsApp sin plantilla, token
      muerto, cliente sin conversación) → cae al hilo del CRM y marca
      `reminder_sent_at` de todos modos.
- [x] **[CLAUDE]** Ventana de 24 h en Messenger: `sendChannelMessage`
      acepta `opts.tag` (message tag) — retrocompatible, default `RESPONSE`.
      IG y WhatsApp fuera de ventana → todavía sin solución propia (IG no
      tiene tag equivalente; WhatsApp necesita plantilla — Fase 5).
- [ ] **[CLAUDE/FUTURO]** Dedupe de mensajes en un store durable (hoy es
      en memoria, best-effort) — para cuando corra en varias instancias

---

## FASE 7 — App Review (abrir a negocios reales)

- [ ] **[TÚ]** Grabar screencast del flujo completo por cada permiso
- [ ] **[TÚ]** Enviar App Review: `pages_messaging`,
      `pages_manage_metadata`, `pages_show_list`
- [ ] **[TÚ]** Enviar App Review: `instagram_basic`,
      `instagram_manage_messages`
- [ ] **[ESPERA]** Aprobación (1–4 semanas por permiso)
- [ ] **[TÚ]** Cambiar la app de Meta a modo **Live**
- [ ] **[JUNTOS]** Prueba final con un negocio real distinto al tuyo

---

## Estado actual

**2026-09-02 (cierre de sesión)** — Fases 1, 2, 3 y **6 completas**.
Messenger vivo de punta a punta: mensaje real → agente responde con la
config del negocio → **crea reservas reales** visibles en el panel.

Además esta sesión:
- El cliente guarda su **nombre** (perfil de Messenger/IG vía Graph,
  `contacts` en WhatsApp).
- **Clientes → detalle** muestra sección "Reservas y citas" ("1 cita" /
  "1 reserva" según el tipo).
- Instagram tiene su propio botón "Conectar".
- Logos de marca reales en Perfil → Conectar redes.
- Se quitó la nota de "desglose como Anthropic" del consumo del agente.

**Mañana / siguiente:**
1. **Fase 4 (Instagram)** — el código ya está; falta [TÚ]: cuenta IG
   Business ligada a la Página + suscribir el webhook de IG + DM de prueba.
2. **Probar reservas end-to-end otra vez** (con el fix de client anidado)
   y verificar nombre + cita en Clientes.
3. **Fase 5 (WhatsApp)** — decidir BSP vs directo (§7-A).
4. Ventana de 24 h (message tags) antes de recordatorios salientes.
5. Business Verification de Meta (empezar ya, semanas de espera).
6. Deploy + páginas legales (C) — cuando el resto esté maduro.

**Recordar:** el túnel `cloudflared` da URL nueva al reiniciar → repegar
la Callback URL en Meta (Messenger → webhooks) cada vez.
