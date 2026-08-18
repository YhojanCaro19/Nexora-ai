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
`orders`, `reservations`, `customers`, `products`, `conversations`, `agent_configs`, `subscriptions`, `agent_usage_log`, `report_downloads`.

### `customers`
Un cliente identificado por `business_id + phone + channel` — el mismo número puede ser un hilo distinto en cada canal (WhatsApp, el canal de prueba interno del agente, etc.).

| columna | tipo | notas |
|---|---|---|
| `id` | uuid | PK |
| `business_id` | uuid | FK a `businesses`, NOT NULL |
| `name` | text | nullable |
| `phone` | text | |
| `channel` | text | ej. `"test"` (canal de prueba interno), `"whatsapp"` (futuro) |
| `created_at` | timestamptz | |

Sin constraint UNIQUE sobre `(business_id, phone, channel)` todavía — `getOrCreateCustomer()` (`lib/services/customerService.ts`) resuelve get-or-create a mano. RLS: policy `ALL` para `is_business_member(business_id)`.

### `conversations`
Una fila por HILO de conversación (`business_id + customer_id + channel`), no una fila por mensaje — todos los turnos viven en la columna `messages` (jsonb, array de `{role, content, at}`).

| columna | tipo | notas |
|---|---|---|
| `id` | uuid | PK |
| `business_id` | uuid | FK a `businesses`, NOT NULL |
| `customer_id` | uuid | FK a `customers` |
| `channel` | text | mismo valor que el `channel` del cliente |
| `messages` | jsonb | array de turnos, se reescribe completo en cada turno nuevo |
| `created_at` / `updated_at` | timestamptz | |

RLS: policy `ALL` para `is_business_member(business_id)`. Gestión vía `lib/services/conversationService.ts`.

### `products` — columnas agregadas para RAG
Además de las columnas base (`name`, `description`, `price`, `stock`, `active`, `image_url`), tiene:

| columna | tipo | notas |
|---|---|---|
| `embedding` | `vector(1024)` | nullable — `null` hasta que se genere. Ver sección RAG más abajo. |

### `agent_configs`
Tiene más columnas de las que expone la UI de Mi Agente hoy (solo `name`/`personality`/`enabled_tools` son editables desde pantalla) — el resto ya existen en la base y el motor del agente ya las lee (`lib/services/agentConfigService.ts`):

| columna | tipo | notas |
|---|---|---|
| `business_id` | uuid | PK/FK |
| `name` | text | |
| `personality` | text | |
| `enabled_tools` | jsonb array | keys validadas contra `lib/config/agentTools.ts` |
| `system_prompt_extra` | text | instrucción libre adicional, sin UI todavía |
| `use_emojis` | boolean | sin UI todavía |
| `response_length` | text | sin UI todavía |
| `language` | text | sin UI todavía |
| `priority_products` | jsonb array | ids de producto a destacar, sin UI todavía |
| `restrictions` | text | sin UI todavía |
| `faq_text` | text | fuente de la tool `responder_faq` |
| `updated_at` | timestamptz | |

### `agent_usage_log`
Tracking de tokens/costo del agente por negocio, desde el día uno (aunque no se cobre todavía).

| columna | tipo | notas |
|---|---|---|
| `id` | uuid | PK |
| `business_id` | uuid | FK a `businesses`, NOT NULL |
| `input_tokens` / `output_tokens` | integer | |
| `model` | text | |
| `created_at` | timestamptz | |

RLS: solo SELECT para `is_business_admin(business_id)` — sin policy de INSERT, se escribe con `createAdminClient()` (`lib/services/agentUsageService.ts`).

### `report_downloads`
Historial de descargas del reporte diario (Reportes → Historial de reportes).

| columna | tipo | notas |
|---|---|---|
| `id` | uuid | PK |
| `business_id` | uuid | FK a `businesses`, NOT NULL |
| `downloaded_by` | uuid | FK a `auth.users` |
| `downloaded_at` | timestamptz | |
| `report_date` | date | qué día cubre el reporte descargado |

RLS: SELECT/INSERT para `is_business_admin(business_id)`, sin UPDATE/DELETE (es un log). Gestión vía `lib/services/reportHistoryService.ts`.

## RAG del catálogo (búsqueda vectorial)

Para negocios con catálogos grandes o búsqueda en lenguaje natural — **no es lo que evita que el agente invente productos** (eso ya lo resuelve el tool-calling contra datos reales, sea SQL exacto o vectorial); es para cuando SQL exacto no alcanza por volumen o ambigüedad del lenguaje del cliente.

- Extensión `pgvector` habilitada. `products.embedding vector(1024)` + índice `products_embedding_idx` (`hnsw`, `vector_cosine_ops`).
- Proveedor de embeddings: **Voyage AI** (`voyage-4-lite`, 1024 dims) — Claude/Anthropic no tiene API de embeddings propia. Se llama vía `fetch` directo (`lib/services/embeddingService.ts`), sin SDK. Cambiar de modelo/dimensión implica migrar la columna y recalcular todos los embeddings existentes — no se hace sin razón real.
- Pipeline automático: `productService.ts` (`createProduct`/`updateProduct`) genera el embedding en cada creación/edición. Si Voyage falla, el producto se crea/edita igual (nunca bloquea) y el embedding queda `null`/sin actualizar.

## Funciones RLS reutilizables (ya existen, usarlas siempre en vez de repetir SQL)

- `is_platform_admin()` — true si el usuario está en `platform_admins`
- `is_business_admin(business_id)` — true si el usuario es admin de ese negocio
- `is_business_member(business_id)` — true si el usuario es admin O colaborador activo de ese negocio

## Funciones SQL propias (no RLS, lógica de negocio en la base)

- `match_products(query_embedding, filter_business_id, match_count, min_similarity)` — búsqueda por similitud coseno sobre `products.embedding`. Filtra `business_id` explícito en el `where` aunque RLS ya lo protegería (doble capa). No es `security definer` — corre con los permisos de quien llama.
- `decrement_product_stock(p_product_id, p_quantity)` — resta atómica de stock (`greatest(stock - qty, 0)`), usada por `orderService.updateOrderStatus()` al confirmar un pedido, nunca al crearlo.

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