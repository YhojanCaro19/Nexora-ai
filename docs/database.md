# Base de datos — AVENTHRA (Supabase / PostgreSQL)

> Todas las tablas tienen `rowsecurity = true`. RLS es la línea de defensa principal, no una opción.

## Tablas principales

### `businesses`
El tenant. Cada fila es un negocio.
- `owner_id` → referencia al admin dueño

### `business_members`
Tabla puente usuario ↔ negocio ↔ rol. Aquí viven **admin** y **colaborador** (no superadmin).

| columna | tipo | notas |
|---|---|---|
| `id` | uuid | PK |
| `business_id` | uuid | FK a `businesses`, NOT NULL |
| `user_id` | uuid | FK a `auth.users`, NOT NULL |
| `role` | text | CHECK: solo `'admin'` o `'colaborador'` |
| `full_name` | text | nombre mostrado (prioriza sobre metadata de auth) |
| `phone` | text | |
| `permissions` | jsonb | array de módulos, ej. `["pedidos"]`. Default `[]` |
| `must_change_password` | boolean | default `false`. `true` al crear cuenta nueva |
| `created_by` | uuid | quién creó esta fila (admin que invitó al colaborador) |
| `is_active` | boolean | default `true` |
| `created_at` | timestamptz | |

**El default de `role` debe ser `'colaborador'`** (se corrigió un desajuste donde el default era `'staff'`, valor que el CHECK constraint rechazaba).

### `platform_admins`
Superadmins. Fuera del esquema multi-tenant — no tienen `business_id`.
- `user_id` → referencia a `auth.users`

### `contact_requests`
Solicitudes públicas de alta de negocio (formulario `/contacto`).
- `full_name`, `business_name`, `email`, `phone`, `message`, `status` (`new` | `approved`), `created_at`
- Al aprobar, el superadmin usa `createAccountFromRequest()` (service role) para crear el `business` + la cuenta admin en `business_members`.

### `business_access_requests`
Distinta de `contact_requests` — confirmar con el equipo el caso de uso exacto antes de asumir que son intercambiables.

### Tablas operativas (todas con `business_id`, scoped por tenant)
`orders`, `reservations`, `customers`, `products`, `conversations`, `agent_configs`, `subscriptions`.

## Funciones RLS reutilizables (ya existen, usarlas siempre en vez de repetir SQL)

- `is_platform_admin()` — true si el usuario está en `platform_admins`
- `is_business_admin(business_id)` — true si el usuario es admin de ese negocio
- `is_business_member(business_id)` — true si el usuario es admin O colaborador activo de ese negocio

## Estado de las políticas RLS

Ya cubierto correctamente: aislamiento entre negocios (un negocio nunca ve datos de otro). **Pendiente, no lo des por hecho:** ninguna política de `orders`, `reservations`, `customers`, `conversations` filtra todavía por `permissions` — hoy cualquier `is_business_member` (admin o colaborador) puede operar esas tablas sin importar su array de `permissions`. Antes de dar por segura la última milla de multi-tenant, revisar si ya se implementó el patrón:

```sql
-- patrón objetivo, verificar si ya existe antes de asumir
exists (
  select 1 from business_members
  where user_id = auth.uid() and business_id = <tabla>.business_id
  and permissions @> '["<modulo>"]'::jsonb
)
```

## Reglas al modificar el esquema

- Nunca agregar una policy de "cada quien edita su propia fila" en `business_members` — permitiría a un colaborador reescribir su propio `role` o `permissions`. Para escrituras puntuales sobre la propia fila (ej. apagar `must_change_password`), usar service role desde un server action, tocando solo la columna necesaria.
- Toda tabla nueva con datos de negocio debe llevar `business_id NOT NULL` y su policy de RLS correspondiente desde el primer commit, no después.