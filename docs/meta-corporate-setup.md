# Checklist — dejar el Facebook / Meta de AVENTHRA como algo CORPORATIVO

> **Para hacer 2026-09-04 en adelante.** Hoy la app de Meta
> (`1093170269890362`) y el portafolio comercial "AVENTHRA" dependen SOLO
> de la cuenta personal de Facebook del fundador. Si esa cuenta se bloquea,
> se hackea o se elimina, la app queda huérfana: se pierden el App Review,
> la Business Verification y todas las conexiones de los negocios.
>
> Objetivo: que la app, la Página y el portafolio sean de la EMPRESA, con
> más de un responsable y 2FA en todo.
>
> Leyenda: **[TÚ]** = en el navegador · **[JUNTOS]** = con Claude (env/código)

---

## A. Portafolio comercial de Meta (Business Manager)

- [x] **[TÚ]** Entrar a **https://business.facebook.com/** → confirmar que
      existe el portafolio **"AVENTHRA"** (no un portafolio "personal").
      ✅ 2026-09-04: existe, separado del portafolio personal "Yhojan Andres".
- [ ] **[TÚ]** Portafolio → **Configuración del negocio → Información del
      negocio**: nombre legal, dirección, correo corporativo, sitio web.
- [ ] **[TÚ]** Portafolio → **Configuración → Dominios** → agregar y
      verificar el dominio de AVENTHRA (cuando esté el definitivo).
- [x] **[TÚ]** Confirmar que **la app de Meta pertenece a este portafolio**
      (App Dashboard → Configuración → Básico → "Portafolio comercial").
      Si dice "ninguno" o uno personal → transferirla al portafolio AVENTHRA.
      ✅ 2026-09-04: la app estaba SIN portafolio ("ninguno") → se conectó a
      "Aventhra" (ID `937577598786270`).
- [x] **(hallazgo extra, no estaba en la lista original)** La Página
      "Barbería cuti" y la cuenta de Instagram @barberiacuti vivían dentro
      del portafolio personal "Yhojan Andres" (2 páginas, 0 en Aventhra) →
      se movieron a "Aventhra" vía Cuentas → Páginas → Añadir → Solicitar
      acceso a una página existente (ID `1376816085505530`), aceptando la
      transferencia de propiedad principal desde el portafolio de origen.
      Verificado: ambas ahora muestran "Propiedad de: Aventhra".

## B. Segundo responsable (que no sea una sola persona)

- [ ] **[TÚ]** Portafolio → Configuración → **Personas** → agregar una
      segunda persona de confianza (o una cuenta de Facebook corporativa
      creada para esto) como **administrador del portafolio**.
- [ ] **[TÚ]** App Dashboard → **Roles de la aplicación → Roles** → agregar
      esa misma persona/cuenta como **Administrador de la app**.
- [ ] **[TÚ]** Página «Barbería cuti» (y cualquier Página real de AVENTHRA):
      agregar el segundo admin en **Configuración de la página → Acceso a
      la página**.
- [ ] **[TÚ]** Decidir: ¿se crea una **cuenta de Facebook corporativa**
      dedicada (ej. `soporte@aventhra…`) para ser la dueña principal, y la
      personal queda solo como respaldo? Recomendado.

## C. Seguridad de las cuentas

- [x] **[TÚ]** Activar **2FA** en TODAS las cuentas de Facebook que
      administran la app o el portafolio.
      ✅ 2026-09-04: activada con Google Authenticator (app) + SMS como
      respaldo, en la cuenta que administra "Aventhra".
- [x] **[TÚ]** Portafolio → Configuración → **Centro de seguridad** →
      revisar "Requerir autenticación en dos pasos" para todos.
      ✅ 2026-09-04: cambiado de "Nadie" a "Todos" en el portafolio Aventhra.
- [x] **[TÚ]** Guardar los códigos de recuperación en un gestor de
      contraseñas del equipo, no en un chat ni en un archivo suelto.
      ✅ 2026-09-04: guardados por el usuario en su gestor de contraseñas.
- [x] **(verificado)** La tarjeta "Se ha añadido un administrador
      alternativo" del Centro de seguridad se investigó: en Personas solo
      aparecen 2 entradas, ambas del mismo dueño — "Yhojan Caro (tú)"
      (activo, tu perfil real) y "Yhojan Andres @barberiacuti" (inactivo,
      residuo automático de conectar Instagram, no una persona distinta).
      No hay acceso ajeno. Sigue sin existir un segundo admin humano de
      respaldo real — eso es justamente la Sección B, que decidiste
      posponer.

## D. Token de servidor a servidor (System User)

- [ ] **[JUNTOS]** Evaluar cambiar los tokens del agente por un **System
      User token** del portafolio (no expira, no depende de la sesión de
      una persona). Hoy usamos tokens de Página / de Instagram Login por
      negocio — para las llamadas propias de AVENTHRA un System User es más
      robusto. Ver si aplica o no según el flujo final.

## E. Secretos — ROTAR (expuestos en una captura el 2026-09-03)

- [ ] **[TÚ]** `OPENAI_API_KEY` → platform.openai.com → API keys → revocar
      y crear otra. **Prioridad alta** (factura real).
- [ ] **[TÚ]** `GOOGLE_GENAI_API_KEY` → aistudio.google.com → API keys →
      igual. **Prioridad alta**.
- [ ] **[TÚ]** `META_APP_SECRET` → developers.facebook.com → app →
      Configuración → Básico → **"Restablecer"** la clave secreta.
- [ ] **[JUNTOS]** `META_OAUTH_STATE_SECRET` → regenerar (`openssl rand
      -hex 32`), actualizar `.env.local` + Vercel.
- [ ] **[JUNTOS]** `INSTAGRAM_APP_SECRET` → App → Instagram → login
      empresarial → restablecer.
- [ ] **[JUNTOS]** `CHANNELS_TOKEN_KEY` → **ojo:** al rotarla, los tokens
      de canal ya cifrados quedan ilegibles → cada negocio tiene que
      reconectar. Hoy solo hay conexiones de prueba, así que se puede.
- [ ] **[JUNTOS]** Después de rotar: `.env.local` actualizado + reiniciar
      `npm run dev`; y replicar en Vercel cuando exista el deploy.
- [ ] **[TODOS]** Regla: **cerrar `.env.local` antes de mandar cualquier
      captura de pantalla.**

## F. Verificación de negocio y App Review (arrancar cuanto antes)

- [ ] **[TÚ]** Portafolio → **Centro de seguridad → Iniciar verificación
      del negocio** → subir documentos legales de AVENTHRA (RUT / cámara de
      comercio / factura de servicios a nombre de la empresa). Tarda
      semanas — es el cuello de botella real.
- [ ] **[TÚ]** App Review de los permisos de mensajería (`pages_messaging`,
      `pages_manage_metadata`, `instagram_business_manage_messages`, etc.):
      grabar screencast del flujo + enviar. 1–4 semanas por permiso.
- [ ] **[TÚ]** Cuando todo esté aprobado → pasar la app a modo **Live**.
      Ahí cualquier negocio conecta en 1 minuto y el agente responde a
      cualquier DM (sin testers, sin restricción de "solicitudes").

---

## Contexto rápido (para retomar sin esta sesión)

- **Estado del módulo de Canales:** Messenger vivo de punta a punta
  (mensaje real → agente → crea reservas). Instagram conectado
  (@barberiacuti); el webhook de DMs reales lo bloquea el **modo
  desarrollo** de Meta, no el código — funciona en producción. Ver
  `docs/channels-setup-checklist.md` y `docs/channels-module-plan.md`.
- **Un cliente real** que quiera conectar: Perfil → Conectar redes →
  "Conectar" → login con su Facebook/Instagram → "Permitir". ~30 s–1 min.
  NO crea apps, NO configura webhooks, NO es tester. Todo eso es setup de
  AVENTHRA una sola vez.
- **Si cambia el dominio:** NO se rehace la app. Solo se actualizan ~6
  campos de URL (redirect URIs de Facebook y de Instagram, webhooks, App
  domains, URLs legales) + `NEXT_PUBLIC_APP_URL` e `INSTAGRAM_REDIRECT_URI`
  en env. Lista completa en `CLAUDE.md` → "Antes de desplegar" y en
  `docs/channels-setup-checklist.md` sección D-bis.
- **App de Meta:** `1093170269890362`. Instagram App ID: `1735186794432899`.
