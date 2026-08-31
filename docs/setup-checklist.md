# Checklist de configuración — servicios externos

> **Para la sesión del 2026-08-31.** Destraba 3 bloqueadores duros de
> `CLAUDE.md`: Resend con dominio propio, saldo real en Anthropic (Claude
> API), saldo real en Gemini (imágenes).
>
> **Dominio:** `__________________` (ya comprado — completar acá).
> **DNS gestionado en:** `__________________` (registrador / Cloudflare).
>
> Leyenda: **[TÚ]** = lo hace el usuario en el navegador · **[JUNTOS]** =
> en la sesión con Claude (toca `.env.local`, Vercel o código).

---

## A. Resend — envío de correos desde el dominio

Contexto: hoy Resend está en sandbox (`onboarding@resend.dev`) y solo
puede enviar a `caroyhojan@gmail.com`. Se usa para: OTP de acciones
destructivas (vía SMTP de Supabase Auth), reporte diario de ventas, y los
correos de alta tras pago (`/registro/[token]`, `/gracias`).

### A.1 Verificar el dominio en Resend
- [ ] **[TÚ]** Resend → **Domains → Add Domain** → escribir el dominio.
      Aceptar el subdominio que sugiere para envío (ej. `send.<dominio>`) —
      así el dominio raíz no arriesga reputación.
- [ ] **[TÚ]** Copiar los registros DNS que muestra Resend y crearlos en el
      DNS del dominio, **exactos**:
  - `MX` en `send.<dominio>` → `feedback-smtp.<región>.amazonses.com` (prio 10)
  - `TXT` (SPF) en `send.<dominio>` → `v=spf1 include:amazonses.com ~all`
  - `TXT` (DKIM) en `resend._domainkey.<dominio>` → la clave `p=...` larga
  - `TXT` (DMARC) en `_dmarc.<dominio>` → `v=DMARC1; p=none; rua=mailto:dmarc@<dominio>`
  - ⚠️ Ojo con el proveedor de DNS auto-agregando el dominio al "name".
- [ ] **[TÚ]** Resend → **Verify**. Esperar (minutos a ~2 h). Estado = *Verified*.
- [ ] **[TÚ]** Resend → **Billing** → agregar tarjeta (headroom). El free
      tier alcanza para lanzar: 3.000 correos/mes, 100/día, 1 dominio.

### A.2 Direcciones a crear (una vez verificado)
- [ ] `no-reply@<dominio>` — transaccional (registro, gracias, OTP)
- [ ] `reportes@<dominio>` — reporte diario de ventas
- [ ] `hola@<dominio>` o `soporte@<dominio>` — respuestas (necesita
      buzón/forward aparte; Resend solo envía)

### A.3 Conectar a AVENTHRA
- [ ] **[JUNTOS]** `.env.local`: `RESEND_FROM_EMAIL="AVENTHRA <no-reply@<dominio>>"`
      (el código usa el string tal cual como `from`).
- [ ] **[JUNTOS]** `.env.local`: `NEXT_PUBLIC_APP_URL=https://<dominio>`
      (o `https://app.<dominio>` si el panel va en subdominio) — los links
      de los correos se arman de acá.
- [ ] **[TÚ]** **Supabase → Authentication → Emails → SMTP Settings**:
  - Host `smtp.resend.com` · Puerto `465` · User `resend`
  - Password = el `RESEND_API_KEY`
  - Sender email `no-reply@<dominio>` · Sender name `AVENTHRA`
- [ ] **[TÚ]** **Supabase → Authentication → URL Configuration**: agregar
      `https://<dominio>` a *Site URL* y a *Redirect URLs*.
- [ ] **[TÚ]** **Google Cloud → APIs & Services → Credentials → OAuth
      client**: agregar `https://<dominio>` a *Authorized JavaScript
      origins* (el redirect a `…supabase.co/auth/v1/callback` ya está).
- [ ] **[JUNTOS]** Cuando haya deploy en Vercel: replicar `RESEND_FROM_EMAIL`,
      `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL` en las env vars de producción.

### A.4 Probar (destino que NO sea `caroyhojan@gmail.com`)
- [ ] Test manual desde el dashboard de Resend → llega (revisar spam las
      primeras veces).
- [ ] Pago Wompi de prueba → llega el correo con el link de `/registro/[token]`.
- [ ] Borrar un colaborador de prueba → llega el OTP de acción destructiva.
- [ ] Disparar el cron del reporte diario → llega al correo de un negocio.
- [ ] Actualizar la memoria `aventhra-resend-sandbox-blocker` → resuelto.

---

## B. Anthropic (Claude API) — recargar saldo prepago

> Esto es **console.anthropic.com → Billing → créditos prepago**, que
> alimenta `ANTHROPIC_API_KEY` (agente conversacional + generación de
> estrategias + copy de anuncios). **NO** es la suscripción de Claude.ai
> (Pro/Max) ni el plan de Claude Code — son 3 cosas separadas.

- [ ] **[TÚ]** Entrar a **console.anthropic.com** con la cuenta de AVENTHRA.
- [ ] **[TÚ]** Arriba a la izquierda: confirmar que es la **Organization**
      correcta (no una personal).
- [ ] **[TÚ]** **Billing → Add payment method** → tarjeta.
- [ ] **[TÚ]** **Buy credits** → cargar **US$20–40** para probar de punta a
      punta (los créditos no vencen).
- [ ] **[TÚ]** Activar **Auto-reload**: cuando el saldo baje de ~US$10,
      recargar ~US$30, con tope mensual.
- [ ] **[TÚ]** **Settings → Limits**: límite de gasto mensual + alertas por
      correo (ej. alerta a US$25, corte a US$100 mientras se prueba).
- [ ] **[TÚ]** **Settings → API Keys**: confirmar que la key de `.env.local`
      (`ANTHROPIC_API_KEY`) es de esta organización. Si no → crear una nueva
      ("AVENTHRA dev") y pasarla.
- [ ] **[JUNTOS]** Actualizar `ANTHROPIC_API_KEY` en `.env.local` si cambió.
      (Producción: key distinta en Vercel, más adelante.)
- [ ] **[JUNTOS]** Probar: abrir el agente de un negocio de prueba, mandar
      un mensaje, confirmar respuesta y que `agentUsageService` registra el
      costo en tokens.
- [ ] **[JUNTOS]** Medir el costo real por respuesta → **fijar los precios
      de créditos definitivos** (hoy son provisionales, ver memoria
      `aventhra-credits-system` y `docs/pricing-model.md`).

---

## C. Gemini (imágenes) — habilitar facturación en Google Cloud

> La key `GOOGLE_GENAI_API_KEY` es de la **Gemini Developer API** (AI
> Studio), contra `generativelanguage.googleapis.com`, modelo
> `gemini-2.5-flash-image` ("Nano Banana"). El free tier tiene límites
> bajos; para probar en serio hay que pasar al tier pago = habilitar
> billing en el proyecto de Google Cloud dueño de la key.

- [ ] **[TÚ]** **aistudio.google.com → Get API key**: ver a qué **proyecto
      de Google Cloud** está atada la key de `.env.local`.
- [ ] **[TÚ]** **console.cloud.google.com** → seleccionar ese proyecto.
- [ ] **[TÚ]** **Billing → Link a billing account** (crear una si no hay) →
      agregar tarjeta. Eso pasa el proyecto al **tier pago** automáticamente.
- [ ] **[TÚ]** **APIs & Services**: confirmar que **"Generative Language
      API"** está *Enabled*.
- [ ] **[TÚ]** **Billing → Budgets & alerts → Create budget**: ese proyecto,
      ~US$30/mes, alertas a 50/90/100% por correo. (El budget avisa, no
      corta. Para corte duro: APIs & Services → esa API → Quotas → bajar.)
- [ ] **[JUNTOS]** Probar: Marketing → generar imagen → confirmar que cae en
      el bucket `marketing-images` y que `imageService` devuelve
      `provider: "gemini"`.
- [ ] **[TÚ]** (Opcional) Fallback OpenAI (`OPENAI_API_KEY`, `gpt-image-1`,
      se activa con `IMAGE_PROVIDER=openai`): recargar en
      platform.openai.com → Billing → add funds + auto-recharge. No hace
      falta si Gemini es el primario.

**Costo de referencia:** `gemini-2.5-flash-image` ≈ **US$0,039 / imagen**
(≈ 250 imágenes por US$10).

---

## Al terminar

- [ ] `.env.local` con los 4 valores reales: `RESEND_FROM_EMAIL`,
      `NEXT_PUBLIC_APP_URL`, `ANTHROPIC_API_KEY`, `GOOGLE_GENAI_API_KEY`.
- [ ] Confirmar que `.env.local` sigue en `.gitignore` (no comitear).
- [ ] Actualizar `CLAUDE.md` (bloqueadores duros) y las memorias
      correspondientes con lo que quedó resuelto.
- [ ] Anotar los saldos cargados y los presupuestos configurados.
