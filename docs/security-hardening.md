# Seguridad — AVENTHRA

> Plan de hardening. Cada sección dice qué ya está resuelto, qué falta, y por qué importa.

## 0. Contexto de infraestructura (importa para las secciones de abajo)

Este proyecto corre sobre Next.js + Supabase, sin servidores propios administrados por ti — Supabase gestiona la base de datos y Vercel (u hosting similar) gestiona el runtime. Esto cambia qué controles aplican: no hay puertos propios que escanear ni servidores que parchear manualmente, pero sí hay superficie de ataque en tu capa de aplicación (server actions, RLS, sesiones) que sí es tu responsabilidad.

---

## 1. Acceso indebido vía URL / IDOR (Insecure Direct Object Reference)

**Qué es el riesgo real:** que alguien cambie un `id` en la URL o en el payload de un formulario y así acceda a datos de otro negocio o de otro usuario, sin pasar por ningún chequeo de permisos.

**Ya resuelto:** la sesión vive en una cookie `httpOnly` (Supabase Auth vía `@supabase/ssr`, flujo PKCE — ningún token en la URL ni en `localStorage`), no en la URL — no es posible "copiar" la sesión de otro con solo ver un link. `proxy.ts` (matcher `/admin` · `/superadmin` · `/colaborador`) manda a `/login` cualquier ruta del panel abierta sin sesión válida, y valida que el prefijo de la ruta coincida con el rol. RLS filtra por `business_id` en las tablas que ya cubrimos.

**Capa extra — sesión atada al dispositivo:** al iniciar sesión se guarda una cookie `httpOnly` `av_dev` con el SHA-256 del User-Agent (`lib/auth/session-guard.ts`). En cada request al panel `proxy.ts` compara esa huella con la del navegador actual; si no coincide (cookies copiadas a otro navegador/equipo) cierra la sesión de verdad (`signOut` global) y registra `session_device_mismatch` en `profile_security_events` (visible en rojo en Perfil → Historial de seguridad). Sumado al cierre automático por inactividad de 60 min, también en `proxy.ts`. Límite: un atacante que falsee su User-Agent idéntico al de la víctima pasa la huella — barrera proporcional, no anti-robo perfecto.

**Capa extra — login por pestaña:** la sesión vive en cookies (compartidas entre pestañas por diseño del navegador — no hay primitiva HTTP "por pestaña"), pero AVENTHRA exige que CADA pestaña se active. El callback de Google pone `av_tab_grant` (httpOnly, un solo uso, 2 min); `TabSessionGuard` (client, envuelve todo el panel en `DashboardShell`) lo canjea en `/api/auth/claim-tab` la primera vez y recuerda la pestaña en `sessionStorage` (por-pestaña). Un refresh mantiene el `sessionStorage` → entra. Cualquier otra pestaña (URL pegada, abrir-en-pestaña-nueva) no tiene grant ni `sessionStorage` → a `/login`. El guard no renderiza nada del panel hasta canjear, así que una pestaña no autorizada no llega a pintar contenido. Límite honesto: es enforcement del lado del cliente (no hay forma server-side de distinguir pestañas); el payload RSC de la primera carga podría leerse con devtools — pero quien tiene tus cookies válidas + tu navegador abierto ya tiene acceso de todas formas. La garantía dura ("la URL no loguea") la dan las cookies httpOnly + `proxy.ts` + `av_dev`.

---

## 8. Cabeceras de seguridad y superficie de ataque

`next.config.ts` → `headers()` aplica a todas las respuestas: `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'` (clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security` (2 años + preload), `Permissions-Policy` (cámara/mic/geo denegados). **Pendiente:** un CSP completo con `script-src` — necesita una pasada dedicada por el 3D (three.js), Supabase, Google OAuth y Wompi para no romper nada.

**Endpoints de desarrollo:** `/api/_dev/*` se eliminó (era `backfill-embeddings`, una migración de un solo uso). Regla: ningún endpoint `_dev` / debug se mergea a `main` — se corre local y se borra.

**Auditoría 2026-09-02 (hallazgos abiertos, no bloqueantes):**
- **Rate limiting en memoria** (`lib/utils/rateLimit.ts`): por-instancia, no global. En serverless con varias lambdas el límite efectivo se multiplica. Fix real = store compartido (Upstash Redis / tabla Postgres con `INSERT ... ON CONFLICT`). Hoy frena el caso real (ráfagas); revisar antes de escalar tráfico.
- **`getClientIp`** confía en `x-forwarded-for` (primer valor). Correcto en Vercel (lo setea el edge). Si se despliega detrás de otro proxy, ese header es falsificable → bypass de rate-limit. Documentar la dependencia de Vercel.
- **Webhook Wompi sin chequeo de frescura del `timestamp`**: un evento válido capturado se puede reenviar indefinidamente. Mitigado por: firma + reconfirmación server-to-server + idempotencia. La carrera check-then-act de `processApprovedPayment` se cerró con un `UPDATE ... WHERE status IN ('pending','expired') RETURNING` atómico (2026-09-02).
- **`conversations` / `appendConversationTurn`**: hoy el `UPDATE` filtra solo por `id` (cubierto por RLS + contexto de sesión). Cuando llegue el canal de WhatsApp (admin client, sin sesión) hay que agregar `.eq("business_id", ...)` explícito o se vuelve un IDOR.
- **`findBusinessIdByOwnerEmail`** pagina `listUsers` hasta 20×1000 por webhook aprobado — mover el email a una columna indexada antes de que la base de usuarios crezca.

**Falta auditar:** cualquier server action o ruta dinámica que reciba un `id` desde el cliente (URL, query param, o `formData`) y lo use para leer/escribir sin verificar que pertenece al `business_id` de la sesión actual. El patrón correcto siempre es:

```typescript
// MAL — confía en el id que mandó el cliente sin verificar dueño
await supabase.from("orders").update(data).eq("id", orderId);

// BIEN — el id debe pertenecer al negocio de la sesión, no solo existir
await supabase
  .from("orders")
  .update(data)
  .eq("id", orderId)
  .eq("business_id", profile.businessId);
```

Aunque RLS ya bloquearía la mayoría de estos casos a nivel de base de datos, el chequeo explícito en el server action da un mensaje de error correcto en vez de una fila silenciosamente vacía, y es una segunda capa si algún día una policy queda mal configurada.

---

## 2. Regeneración de sesión / rotación de tokens

**Ya resuelto:** Supabase Auth emite un JWT nuevo en cada login y rota el refresh token automáticamente — no hay "session fixation" clásico porque cada login genera credenciales nuevas.

**Falta — y esto conecta directo con lo que ya vivimos hoy:** cuando rotamos las 3 contraseñas comprometidas, **no invalidamos las sesiones que ya estuvieran activas con la contraseña vieja.** Cambiar la contraseña no cierra sesiones ya abiertas en otros dispositivos/navegadores. Hay que forzar eso explícitamente:

```typescript
// Cierra TODAS las sesiones activas de ese usuario, en cualquier dispositivo
await supabaseAdmin.auth.admin.signOut(userId, "global");
```

Ya expuesto como acción "Cerrar sesión en todos los dispositivos" en Perfil → Seguridad. Con "Autenticación solo con Google" ya no hay rotación de contraseñas propia — la revocación de sesiones ante un compromiso la maneja Google del lado de la cuenta.

---

## 3. Protección de server actions (tu "API" en este stack)

**Ya resuelto:** validación con Zod en el borde de cada action que revisamos, chequeo de rol/sesión al inicio de cada una, protección CSRF automática de Next.js en server actions (verifica el header `Origin` contra el dominio esperado — no requiere configuración manual, pero confirma que tu dominio de producción esté bien configurado cuando despliegues).

**Falta:** rate limiting (ver sección 5) y un chequeo sistemático de que **cada** server action nueva que se agregue siga el mismo patrón — esto ya está en tu `coding-standards.md`, pero vale la pena que se lo recuerdes a Claude Code explícitamente en cada feature nueva.

---

## 4. Autenticación de dos factores (MFA)

**Falta por completo — esto sí hay que construirlo.** Supabase Auth soporta MFA vía TOTP (Google Authenticator, Authy, etc.) de forma nativa, sin librería adicional.

Recomendación de alcance:
- **Superadmin:** MFA obligatorio, sin excepción — es la cuenta con más poder sobre toda la plataforma.
- **Admin:** MFA fuertemente recomendado, considera hacerlo obligatorio también — tiene acceso a los datos de todo su negocio.
- **Colaborador:** opcional por ahora, según cuánto acceso le haya dado el admin.

Además de MFA para el login, agrega **reautenticación puntual** ("step-up auth") para acciones sensibles específicas — pedir que confirme su contraseña actual antes de:
- Cambiar su correo de inicio de sesión.
- Cambiar su contraseña (ya lo hacemos parcialmente vía el flujo de recuperación, pero un cambio voluntario desde dentro de la sesión también debería pedirlo).
- Desactivar su propio MFA.

---

## 5. Rate limiting

**Falta por completo.** Sin esto, alguien puede hacer fuerza bruta sobre el login, saturar el formulario de contacto con solicitudes falsas, o golpear repetidamente el endpoint de recuperación de contraseña.

Dónde aplicarlo, en orden de urgencia:
1. `login` (server action) — limitar intentos por IP y por correo.
2. `requestPasswordReset` — ya tiene protección básica (no revela si el correo existe), pero sin límite de frecuencia alguien puede spamear de recuperación a una víctima.
3. `submitContactRequest` — es INSERT público sin autenticación, el más expuesto a spam/abuso.

Herramienta recomendada para este stack: **Upstash Redis + `@upstash/ratelimit`** — funciona bien en runtime serverless (Vercel), no requiere mantener un servidor propio, tiene capa gratuita suficiente para empezar.

---

## 6. "Escaneo de puertos" — no aplica tal cual, pero hay equivalente real

Como no administras servidores propios (todo corre en Supabase + Vercel), no hay puertos propios que escanear con nmap — esa práctica es para infraestructura on-premise o VMs propias. El equivalente real en tu stack es:

- **`get_advisors` del MCP de Supabase que ya conectamos** — corre chequeos de seguridad y performance sobre tu proyecto (RLS mal configurado, índices faltantes, etc.). Pídeselo a Claude Code periódicamente: *"corre get_advisors y dime qué encuentra"*.
- Revisar el dashboard de Supabase → Advisors de vez en cuando manualmente también.

---

## 7. Backups y control de versiones

**En progreso ahora mismo:** estamos comiteando todo el trabajo pendiente a git — ese es tu control de versiones y tu primer respaldo real.

**Falta configurar:**
- **Backups de la base de datos:** Supabase hace backups automáticos, pero la frecuencia y retención dependen de tu plan — confirma en el dashboard (Settings → Database → Backups) qué tienes disponible en tu plan actual, y si necesitas Point-in-Time Recovery, probablemente requiera plan de pago.
- **Ambiente de staging:** antes de tener un ambiente separado de pruebas, cualquier cambio de esquema/RLS se prueba directo contra producción (lo hemos venido haciendo con cuidado, pero no es ideal a largo plazo). Cuando el proyecto crezca, vale la pena un segundo proyecto de Supabase para desarrollo.