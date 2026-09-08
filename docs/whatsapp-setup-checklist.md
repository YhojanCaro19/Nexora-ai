# Checklist — conectar WhatsApp a AVENTHRA

> Es la **Fase 5** de `docs/channels-setup-checklist.md`, desarrollada. El
> plan técnico general está en `docs/channels-module-plan.md`.
>
> Leyenda:
> **[TÚ]** = lo haces en el navegador / trámite ·
> **[JUNTOS]** = en sesión con Claude (toca `.env.local`, Vercel o SQL) ·
> **[CLAUDE]** = código que escribo yo ·
> **[ESPERA]** = enviado, esperando aprobación de Meta (días/semanas)
>
> App de Meta: `1093170269890362` · Dominio: `aventhra.online`

Messenger e Instagram ya funcionan de punta a punta. WhatsApp usa la **misma
app de Meta** y el **mismo webhook** (`/api/webhooks/meta`), pero el alta del
número es un mundo aparte: no basta con un login, hay que registrar un número
de teléfono real contra una cuenta de WhatsApp Business (WABA).

---

## PASO 0 — La decisión que hay que cerrar primero

Hay dos caminos para que **cada negocio** conecte **su propio número**:

### Opción A — Cloud API directo + Embedded Signup *(recomendada a mediano plazo)*
AVENTHRA se registra como **Tech Provider** ante Meta y embebe el flujo de alta
de Meta en el panel. El negocio pulsa "Conectar WhatsApp", se abre el popup de
Meta, registra su número ahí mismo y vuelve conectado.

- ✅ Sin intermediario ni margen de terceros: Meta cobra sus mensajes y ya
- ✅ La mejor experiencia para el cliente (todo dentro de AVENTHRA)
- ✅ Mismo webhook y mismo `sendChannelMessage` que ya tenemos
- ❌ Exige **Business Verification** + **App Review** de
  `whatsapp_business_management` y `whatsapp_business_messaging`
- ❌ Es el camino más largo hasta el primer cliente

### Opción B — BSP (360dialog, Twilio, Gupshup, Wati…)
Un proveedor certificado hace el alta de números por nosotros; AVENTHRA habla
con la API del BSP en vez de con la de Meta.

- ✅ Se arranca en días, sin App Review de WhatsApp
- ✅ El BSP se come el soporte del alta de números
- ❌ Cobra por encima del precio de Meta (margen por mensaje o cuota mensual)
- ❌ Otro cliente HTTP y otro formato de webhook que mantener — **no** reusa
  `metaChannelService` tal cual
- ❌ Migrar después a directo significa re-onboardear a cada negocio

### Opción C — Un solo número, alta manual *(puente para el lanzamiento)*
AVENTHRA registra **su propio** número en su WABA y lo usa para los primeros
negocios (o agrega los números de ellos a mano a nuestra WABA).

- ✅ Se puede tener funcionando esta semana, sin App Review
- ✅ Sirve para grabar el screencast que pide el propio App Review
- ❌ No escala: alta manual por cada negocio, y todos comparten identidad si es
  nuestro número

- [ ] **[TÚ]** **DECIDIR.** Recomendación: **C ahora** (desbloquea la demo y el
      screencast) → **A en paralelo** (Business Verification y App Review
      corriendo desde ya, que son las semanas de espera). B solo si aparece un
      cliente que no puede esperar.

---

## PASO 1 — Prerrequisitos (valen para cualquier opción)

- [ ] **[TÚ]** **Business Verification** de Meta aprobada
      (Business Portfolio → Security Center → Start Verification, con RUT /
      cámara de comercio). Es el mismo trámite ya listado en
      `docs/channels-setup-checklist.md` §F — bloquea WhatsApp igual que
      bloquea el App Review de Messenger
- [ ] **[TÚ]** **Portafolio empresarial corporativo**, no atado a la cuenta
      personal del fundador — ver `docs/meta-corporate-setup.md`
- [ ] **[TÚ]** Primer **deploy real** con las 3 URLs legales cargando
      (`/privacidad`, `/terminos`, `/borrado-de-datos`): Meta las valida en
      vivo para el App Review
- [ ] **[TÚ]** Un **número de teléfono** que:
      - pueda recibir SMS o llamada para el código de verificación
      - **NO** esté registrado hoy en la app de WhatsApp ni WhatsApp Business.
        Si lo está, hay que **borrar esa cuenta desde la app** primero (se
        pierde el historial de chats — no uses tu número personal)

---

## PASO 2 — Producto WhatsApp en la app de Meta

- [ ] **[TÚ]** App de Meta → **Agregar producto → WhatsApp**
- [ ] **[TÚ]** Se crea (o se elige) una **WABA** — WhatsApp Business Account —
      dentro del portafolio empresarial
- [ ] **[TÚ]** **API Setup**: agregar el número, recibir el código, verificarlo
- [ ] **[TÚ]** Anotar el **Phone Number ID** y el **WhatsApp Business Account ID**
      (los muestra la misma pantalla; NO son el número de teléfono)
- [ ] **[TÚ]** Definir el **perfil del negocio** (foto, descripción, horario) —
      es lo que ve el cliente al abrir el chat

---

## PASO 3 — Token permanente (System User)

El token que muestra la pantalla de API Setup dura **24 h**: sirve para un curl
de prueba, no para producción.

- [ ] **[TÚ]** Business Settings → **Usuarios → Usuarios del sistema** →
      crear uno (rol **Admin**)
- [ ] **[TÚ]** Asignarle activos: la **app** y la **WABA**, con control total
- [ ] **[TÚ]** **Generar token** con los permisos `whatsapp_business_messaging`
      y `whatsapp_business_management`, y **caducidad: Nunca**
- [ ] **[JUNTOS]** Guardarlo — *no lo pegues en el chat ni lo dejes abierto en
      una captura*. Ver el incidente de secretos expuestos en
      `docs/channels-setup-checklist.md`

---

## PASO 4 — Variables de entorno

- [ ] **[JUNTOS]** `.env.local` (y luego Vercel, mismos valores):
      ```
      WHATSAPP_PHONE_NUMBER_ID=...      # el de AVENTHRA (opción C)
      WHATSAPP_BUSINESS_ACCOUNT_ID=...
      WHATSAPP_SYSTEM_USER_TOKEN=...    # el permanente del Paso 3
      ```
      > Para las opciones A y B esto NO hace falta por negocio: cada negocio
      > guarda su propio token cifrado en `channel_connections`, igual que hoy
      > guardamos el de su Página de Facebook. Estas variables son solo para el
      > número propio de AVENTHRA.

`CHANNELS_TOKEN_KEY`, `META_APP_SECRET` y `META_WEBHOOK_VERIFY_TOKEN` ya están
configuradas y sirven tal cual.

---

## PASO 5 — Webhook

- [ ] **[TÚ]** App de Meta → **WhatsApp → Configuración → Webhook**:
      - Callback URL: `https://aventhra.online/api/webhooks/meta`
        (en local, la URL del túnel `cloudflared` — cambia en cada reinicio)
      - Verify token: el mismo `META_WEBHOOK_VERIFY_TOKEN` de siempre
      - Suscribir el campo **`messages`**
- [x] **[CLAUDE]** Enrutado de `object: "whatsapp_business_account"` en
      `app/api/webhooks/meta/route.ts`: `handleWhatsApp` resuelve
      `phone_number_id → negocio`, saca el nombre del cliente de `contacts`,
      aplica dedupe y rate limit, y llama al agente. **Ya está escrito** —
      nunca se ha podido probar porque falta el número
- [ ] **[JUNTOS]** Mandar un mensaje al número → el agente responde

> La verificación de firma `X-Hub-Signature-256`, el 200 inmediato con
> `after()` y el envío por WhatsApp en `sendChannelMessage`
> (`messaging_product: "whatsapp"`) ya están. Lo único que falta del lado del
> código es el alta del número (botón de conectar) y las plantillas.

---

## PASO 6 — Plantillas (mensajes fuera de la ventana de 24 h)

WhatsApp solo deja escribir libre dentro de las **24 h** desde el último
mensaje del cliente. Fuera de eso hay que usar una **plantilla aprobada**.
Nos afecta directo: el cron de recordatorio de reservas manda el aviso ~1 día
antes, o sea casi siempre fuera de la ventana.

- [ ] **[TÚ]** WhatsApp Manager → **Plantillas de mensajes** → crear
      `recordatorio_reserva`, categoría **Utility**, con variables para
      negocio / servicio / fecha / hora
- [ ] **[ESPERA]** Aprobación de la plantilla (minutos a horas, normalmente)
- [ ] **[CLAUDE]** `sendChannelMessage` con soporte de plantilla para WhatsApp
      (hoy solo manda `type: "text"`; `opts.tag` es el mecanismo de
      **Messenger** y WhatsApp lo ignora — necesita el body `type: "template"`)
- [ ] **[CLAUDE]** El cron `/api/cron/reservation-reminders` usa la plantilla
      cuando el canal es WhatsApp y está fuera de ventana. Hoy, si no puede
      enviar, cae al hilo del CRM — funciona, pero el cliente no se entera
- [ ] **[JUNTOS]** Revisar el costo por plantilla vigente en la lista de precios
      de Meta para el país y meterlo en el modelo de créditos
      (`docs/pricing-model.md` ya tiene `wa_marketing_message` = 4 créditos —
      hay que confirmar que cubre el costo real)

---

## PASO 7 — App Review (solo opción A)

- [ ] **[TÚ]** Grabar screencast del flujo completo: un negocio entra a
      AVENTHRA, conecta su WhatsApp, un cliente escribe, el agente responde
- [ ] **[TÚ]** Enviar App Review: `whatsapp_business_messaging` +
      `whatsapp_business_management`
- [ ] **[ESPERA]** Aprobación (1–4 semanas)
- [ ] **[TÚ]** Solicitar el acceso a **Embedded Signup** (Tech Provider)
- [ ] **[CLAUDE]** Botón "Conectar WhatsApp" con el popup de Embedded Signup
      en **Perfil → Conectar redes**, y guardar el `phone_number_id` + token
      de cada negocio en `channel_connections`
      > ⚠️ Implementar directo sobre **Embedded Signup v4**: la v2 queda
      > descontinuada el **15 de octubre de 2026**
- [ ] **[TÚ]** App de Meta a modo **Live**

---

## Qué hace un CLIENTE (negocio) para conectar

**Con la opción A (Embedded Signup), en producción:**

> Perfil → Conectar redes → **Conectar** en WhatsApp → se abre el popup de Meta
> → inicia sesión con su Facebook → elige o crea su portafolio empresarial →
> escribe su número → recibe el código por SMS → lo pega → listo. ~3 minutos.

El cliente NO crea apps de Meta, NO configura webhooks, NO genera tokens.

**Con la opción C (puente):** el negocio nos da su número y nosotros hacemos el
alta a mano. Es aceptable para los primeros clientes; no para escalar.

---

## Estado actual (2026-09-07)

Del lado del **código** WhatsApp está más avanzado de lo que parece — el
bloqueo real es de trámites y del alta del número:

| Pieza | Estado |
|---|---|
| Webhook entrante (`whatsapp_business_account` → agente) | ✅ escrito, sin probar |
| Envío de texto (`sendChannelMessage`) | ✅ escrito, sin probar |
| Firma, dedupe, rate limit, 200 inmediato | ✅ compartidos con Messenger/IG |
| Botón "Conectar" en Perfil → Conectar redes | ❌ dice "Próximamente" |
| Plantillas (fuera de la ventana de 24 h) | ❌ falta |
| Producto WhatsApp en la app de Meta | ❌ no agregado |
| Decisión BSP vs directo | ❌ abierta (Paso 0) |

**Camino más corto a "el agente responde por WhatsApp":**
Paso 1 (número limpio) → Paso 2 → Paso 3 → Paso 4 → Paso 5. Eso ya da un
WhatsApp vivo con el número de AVENTHRA, sin App Review. Todo lo demás
(Embedded Signup, plantillas) es para abrirlo a negocios reales.
