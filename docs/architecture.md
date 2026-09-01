# Arquitectura — AVENTHRA

> Documento autoritativo. Si hay conflicto con otro doc, este gana (junto a decisions.md).

## Modelo del sistema

SaaS multi-tenant. Cada negocio (`business`) es un tenant aislado. Tres roles:

- **superadmin** — dueño de la plataforma Aventhra. Ve todos los negocios, aprueba solicitudes de alta, gestiona agentes de IA y configuración global. No pertenece a ningún negocio (`business_id = null`).
- **admin** — dueño de un negocio. Ve y opera solo los datos de su propio `business_id`. Puede crear colaboradores.
- **colaborador** — empleado de un negocio, creado por su admin. Ve solo los módulos que su admin le asignó vía `permissions`, y solo datos de ese mismo `business_id`.

## Rutas (App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx           # login único para los 3 roles — solo botón "Continuar con Google"
│   └── actions.ts               # signInWithGoogle, logout
├── auth/callback/route.ts       # canjea el code de Google OAuth; correo sin acceso → /solicitar-acceso
├── (dashboard)/
│   ├── admin/
│   │   ├── layout.tsx           # guard: role === 'admin'
│   │   ├── page.tsx             # Inicio
│   │   ├── pedidos/page.tsx
│   │   ├── catalogo/page.tsx
│   │   ├── mi-agente/page.tsx
│   │   ├── colaboradores/       # crear/gestionar colaboradores (permissions, credenciales)
│   │   ├── reportes/page.tsx
│   │   └── perfil/page.tsx
│   ├── colaborador/
│   │   ├── layout.tsx           # guard: role === 'colaborador'
│   │   └── page.tsx
│   └── superadmin/
│       ├── layout.tsx           # guard: role === 'superadmin'
│       ├── page.tsx
│       ├── negocios/page.tsx
│       ├── solicitudes/         # aprueba contact_requests, crea cuenta de admin
│       ├── agentes/page.tsx
│       └── configuracion/page.tsx
├── (marketing)/
│   ├── contacto/                # formulario público → contact_requests (INSERT libre)
│   ├── solicitar-acceso/        # correo de Google sin acceso a la plataforma
│   └── sobre-nosotros/
```

Patrón fijo de cada `layout.tsx` de rol:
```typescript
const profile = await getSessionProfile();
if (!profile || profile.role !== '<rol>') redirect('/login');
```

## Sesión y autenticación

`lib/auth/get-session.ts` expone `getSessionProfile()` (cacheado con `cache()` de React), única fuente de verdad sobre quién es el usuario:

```typescript
interface SessionProfile {
  userId: string;
  fullName: string;
  role: 'superadmin' | 'admin' | 'colaborador';
  businessId: string | null;   // null solo para superadmin
  permissions: string[];        // solo relevante para colaborador
  mustChangePassword: boolean;
}
```

Resuelve el rol así: primero busca en `platform_admins` (→ superadmin), si no está ahí busca en `business_members` (→ admin o colaborador según la columna `role`).

## Regla de oro sobre permisos de colaborador

`permissions` (array de strings, ej. `["pedidos", "catalogo"]`) define qué módulos puede ver/usar un colaborador. **Nunca confiar solo en ocultar el sidebar.** El enforcement real vive en RLS (ver database.md) y se refuerza con checks explícitos en cada server action que toque datos de negocio.

## Cuándo usar service role vs cliente normal

- Cliente normal (`@/lib/supabase/server`, sujeto a RLS): para cualquier lectura/escritura que un usuario hace sobre sus propios datos permitidos por política.
- Service role (`@supabase/supabase-js` con `SUPABASE_SERVICE_ROLE_KEY`, salta RLS): SOLO para operaciones puntuales que RLS no puede permitir de forma segura sin abrir una puerta de escalación de privilegios. Ejemplo ya implementado: crear usuario de Auth (sin contraseña) + fila en `business_members` al aprobar una solicitud o crear un colaborador (no hay policy de "cada quien edita su fila" porque abriría edición de `role`/`permissions`).
- Nunca se expone la service role key al cliente/navegador. Solo dentro de archivos `"use server"`.

## Registro público

No existe signup público. Las únicas puertas de entrada son:
1. Formulario de contacto (`/contacto`) → `contact_requests` → superadmin aprueba → se crea cuenta admin.
2. Admin crea colaborador desde `/admin/colaboradores` → se crea cuenta colaborador.

Ambas crean el usuario de Auth con el correo registrado y **sin contraseña**. La persona entra con "Continuar con Google" usando ese mismo correo (ver `decisions.md` — "Autenticación solo con Google").

## Motor conversacional del agente

`lib/services/agentEngineService.ts` (`runAgentTurn`) — un solo agente por negocio, **sin orquestación multi-agente** (decisión explícita, ver `decisions.md`). Corre sobre Claude (`claude-sonnet-5` por defecto — balance costo/calidad, el costo por mensaje se multiplica por cada negocio cliente) vía el Tool Runner del SDK de Anthropic (`client.beta.messages.toolRunner`).

**System prompt en dos capas** (nunca se mezclan al revés):
1. Base fija, no editable — reglas de negocio (nunca inventar datos, nunca groserías/ilegal, nunca salirse del rol de agente de ese negocio).
2. Personalización del admin (`agent_configs`: `personality`, `restrictions`, `system_prompt_extra`, `use_emojis`, `response_length`, `language`, `priority_products`) — se agrega ENCIMA de la base, nunca la reemplaza (ver `decisions.md`, "Personalización del agente").

**Tools:** del catálogo en `lib/config/agentTools.ts` (`AGENT_TOOLS`), tienen motor real hoy (`SUPPORTED_TOOL_KEYS`): `catalogo_productos` (RAG + SQL exacto según el caso), `tomar_pedido` (`orderService.createOrder`), `responder_faq` (lee `agent_configs.faq_text`), y `reservar_mesa` / `agendar_cita` (módulo Reservas — el motor expone `consultar_disponibilidad`, `reservar`, `consultar_mis_reservas`, `cancelar_reserva` cuando además `booking_settings.mode != 'off'`). `recordatorios` depende del scheduler saliente (WhatsApp) — si un admin la prende, el motor la ignora en vez de ofrecerle al modelo una tool que no puede cumplir.

**Sin streaming, a propósito** — el destino final (WhatsApp) recibe un mensaje completo por llamada, no texto incremental, así que el motor corre igual desde el canal de prueba interno hasta producción, sin comportamiento distinto entre ambos.

**Memoria y canales:** `customers`/`conversations` ya existían en Supabase con diseño multi-canal (columna `channel`) antes de que el motor las usara — el canal de prueba interno (Mi Agente → "Probar tu agente") usa `channel = "test"`, separado del futuro canal `"whatsapp"`.

**Uso/costo:** cada turno se loguea en `agent_usage_log` (tokens de entrada/salida, modelo, por `business_id`) — desde el día uno, aunque todavía no se cobre por uso.