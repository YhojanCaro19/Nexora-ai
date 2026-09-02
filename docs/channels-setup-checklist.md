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
- [ ] **[JUNTOS]** Agregar a `.env.local` cuando exista la app de Meta:
      `META_APP_ID`, `NEXT_PUBLIC_META_APP_ID`, `META_APP_SECRET`,
      `META_CONFIG_ID`, `META_GRAPH_VERSION=v21.0`
- [ ] **[JUNTOS]** Replicar las 8 variables en Vercel → Project → Settings →
      Environment Variables (mismos valores que local — si no, los tokens
      cifrados no se pueden descifrar en prod)

### B. Base de datos
- [ ] **[TÚ]** Supabase → Database → Backups → snapshot
- [ ] **[TÚ]** Supabase → SQL Editor → correr `docs/sql/channels-module.sql`
- [ ] **[TÚ]** Verificar: `select column_name from information_schema.columns
      where table_name = 'channel_connections';` → pasar el resultado a Claude

### C. Páginas legales (Meta las exige para la app)
- [ ] **[CLAUDE]** Crear rutas públicas `/privacidad`, `/terminos`,
      `/borrado-de-datos` bajo `app/(experience)` con borrador base
- [ ] **[TÚ]** Revisar / ajustar el contenido legal real (qué datos se
      guardan de los clientes, cuánto tiempo, cómo se piden que se borren) —
      idealmente con un abogado
- [ ] **[JUNTOS]** Desplegar y confirmar que las 3 URLs cargan en producción

### D. Crear la app de Meta
- [ ] **[TÚ]** `developers.facebook.com` → My Apps → Create App → tipo
      **Business** → nombre `AVENTHRA` → crear Business Portfolio "AVENTHRA"
- [ ] **[TÚ]** App settings → Basic: App domains `aventhra.online`, las 3
      URLs legales, categoría, ícono 1024×1024
- [ ] **[TÚ]** Anotar **App ID** y **App Secret** (App ID → a Claude;
      App Secret → directo a `.env.local`, no al chat)
- [ ] **[TÚ]** Add Product: **Messenger**, **Instagram**, **WhatsApp**,
      **Facebook Login for Business**

### E. Facebook Login for Business (el popup de "Conectar")
- [ ] **[TÚ]** FL for Business → Configurations → Create configuration.
      Permisos: `pages_show_list`, `pages_messaging`,
      `pages_manage_metadata`, `instagram_basic`,
      `instagram_manage_messages`, `business_management`
- [ ] **[TÚ]** Anotar el **Configuration ID** → a Claude
- [ ] **[TÚ]** FL for Business → Settings → Valid OAuth Redirect URIs:
      `https://aventhra.online/api/auth/meta/callback` y
      `http://localhost:3000/api/auth/meta/callback`

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

- [ ] **[CLAUDE]** `lib/utils/tokenCrypto.ts` — cifrar/descifrar tokens
      (AES-256-GCM, sin dependencia nueva)
- [ ] **[CLAUDE]** `lib/services/metaGraphClient.ts` — wrapper de Graph API
      (canje de code, token largo, debug_token, suscribir webhook, enviar)
- [ ] **[CLAUDE]** `lib/services/channelConnectionService.ts` — CRUD de
      `channel_connections` (service role, nunca expone el token al cliente)
- [ ] **[CLAUDE]** `lib/services/metaChannelService.ts` — `sendMessage()`
      con las 3 formas de body (Messenger / IG / WhatsApp)
- [ ] **[JUNTOS]** Probar envío con `curl` + un token de prueba de la
      cuenta propia

---

## FASE 2 — Conexión + UI (empezar por Messenger)

- [ ] **[CLAUDE]** Server action que arma la URL de FL for Business y hace
      `redirect()` (con `state` firmado, CSRF)
- [ ] **[CLAUDE]** `app/api/auth/meta/callback/route.ts` — canjea code,
      guarda `channel_connections`, suscribe el webhook
- [ ] **[CLAUDE]** Pantalla **Mi Agente → Canales** (estado por canal,
      botón Conectar / Desconectar, mobile-first, títulos centrados)
- [ ] **[TÚ]** Conectar tu propia Página de Facebook de prueba → verificar
      que aparece "Conectado"

---

## FASE 3 — Webhook + agente respondiendo (Messenger end-to-end)

- [ ] **[CLAUDE]** `app/api/webhooks/meta/route.ts` — GET handshake +
      POST con verificación de firma `X-Hub-Signature-256`
- [ ] **[CLAUDE]** Enrutado por `body.object` (page / instagram /
      whatsapp_business_account) + resolución `external_id → negocio`
- [ ] **[CLAUDE]** Agregar parámetro `channel` a `runAgentTurn`
      (default `"test"`, no rompe "Probar tu agente")
- [ ] **[CLAUDE]** Ignorar echos / delivery / read / no-texto
- [ ] **[TÚ]** Meta → Messenger → Webhooks: Callback URL
      `https://aventhra.online/api/webhooks/meta`, Verify Token =
      `META_WEBHOOK_VERIFY_TOKEN`, suscribir campo `messages`
- [ ] **[TÚ]** Escribirle a tu Página de prueba desde otra cuenta →
      confirmar que el agente responde
- [ ] **[CLAUDE]** Confirmar que `logAgentUsage` + `chargeAgentReply`
      registran el turno

---

## FASE 4 — Instagram

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
- [ ] **[CLAUDE]** Cron de recordatorio: enviar como plantilla aprobada
      (no como mensaje libre — regla de las 24 h)
- [ ] **[TÚ]** Mensaje de prueba al número → el agente responde

---

## FASE 6 — Robustez

- [ ] **[CLAUDE]** Cron de salud de tokens: refrescar antes de vencer;
      si un envío da 401/190 → `status = 'error'`
- [ ] **[CLAUDE]** UI: banner "reconecta tu canal de X" cuando
      `status = 'error' | 'expired'`
- [ ] **[CLAUDE]** Rate limiting del webhook + respuesta 200 inmediata
      (procesar en segundo plano)
- [ ] **[CLAUDE]** Manejo de la ventana de 24 h en Messenger/IG
      (message tags)

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

**2026-09-02** — Plan y SQL escritos. Secretos propios generados en
`.env.local`. Siguiente: correr el SQL (B) y crear la app de Meta (D).
