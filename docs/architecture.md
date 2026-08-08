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
│   ├── login/page.tsx           # login único para los 3 roles
│   └── actions.ts               # login, signInWithGoogle, logout, redirectByRole
├── auth/callback/route.ts       # canjea code de Supabase (OAuth y recuperación de password)
├── (dashboard)/
│   ├── admin/
│   │   ├── layout.tsx           # guard: role === 'admin' + mustChangePassword
│   │   ├── page.tsx             # Inicio
│   │   ├── pedidos/page.tsx
│   │   ├── catalogo/page.tsx
│   │   ├── mi-agente/page.tsx
│   │   ├── colaboradores/       # crear/gestionar colaboradores (permissions, credenciales)
│   │   ├── reportes/page.tsx
│   │   └── perfil/page.tsx
│   ├── colaborador/
│   │   ├── layout.tsx           # guard: role === 'colaborador' + mustChangePassword
│   │   └── page.tsx
│   └── superadmin/
│       ├── layout.tsx           # guard: role === 'superadmin' + mustChangePassword
│       ├── page.tsx
│       ├── negocios/page.tsx
│       ├── solicitudes/         # aprueba contact_requests, crea cuenta de admin
│       ├── agentes/page.tsx
│       └── configuracion/page.tsx
├── (marketing)/
│   ├── contacto/                # formulario público → contact_requests (INSERT libre)
│   └── sobre-nosotros/
├── cambiar-password/            # cambio FORZADO de password temporal (primer login)
├── actualizar-password/         # después del link de "olvidé mi contraseña"
└── recuperar-password/          # solicita el link de recuperación
```

Patrón fijo de cada `layout.tsx` de rol:
```typescript
const profile = await getSessionProfile();
if (!profile || profile.role !== '<rol>') redirect('/login');
if (profile.mustChangePassword) redirect('/cambiar-password');
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
- Service role (`@supabase/supabase-js` con `SUPABASE_SERVICE_ROLE_KEY`, salta RLS): SOLO para operaciones puntuales que RLS no puede permitir de forma segura sin abrir una puerta de escalación de privilegios. Ejemplos ya implementados: crear usuario de Auth + fila en `business_members` al aprobar una solicitud o crear un colaborador; apagar el flag `must_change_password` de la propia fila del usuario (no hay policy de "cada quien edita su fila" porque abriría edición de `role`/`permissions`).
- Nunca se expone la service role key al cliente/navegador. Solo dentro de archivos `"use server"`.

## Registro público

No existe signup público. Las únicas puertas de entrada son:
1. Formulario de contacto (`/contacto`) → `contact_requests` → superadmin aprueba → se crea cuenta admin.
2. Admin crea colaborador desde `/admin/colaboradores` → se crea cuenta colaborador.

Ambas usan credenciales temporales de un solo uso + `must_change_password = true`.