# Seguridad — AVENTHRA

> Plan de hardening. Cada sección dice qué ya está resuelto, qué falta, y por qué importa.

## 0. Contexto de infraestructura (importa para las secciones de abajo)

Este proyecto corre sobre Next.js + Supabase, sin servidores propios administrados por ti — Supabase gestiona la base de datos y Vercel (u hosting similar) gestiona el runtime. Esto cambia qué controles aplican: no hay puertos propios que escanear ni servidores que parchear manualmente, pero sí hay superficie de ataque en tu capa de aplicación (server actions, RLS, sesiones) que sí es tu responsabilidad.

---

## 1. Acceso indebido vía URL / IDOR (Insecure Direct Object Reference)

**Qué es el riesgo real:** que alguien cambie un `id` en la URL o en el payload de un formulario y así acceda a datos de otro negocio o de otro usuario, sin pasar por ningún chequeo de permisos.

**Ya resuelto:** la sesión vive en una cookie `httpOnly` (Supabase Auth vía `@supabase/ssr`), no en la URL — no es posible "copiar" la sesión de otro con solo ver un link. RLS filtra por `business_id` en las tablas que ya cubrimos.

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

Esto debería correr automáticamente cada vez que se rota una contraseña por seguridad (no en un cambio voluntario normal del usuario, ahí no hace falta) — agregarlo a `passwordService.ts` o donde centralicemos la lógica de rotación forzada.

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