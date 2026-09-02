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
| `must_change_password` | boolean | **obsoleto** — sin uso desde "Autenticación solo con Google". No dropeada aún. |
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

### Módulo de Reservas (`docs/sql/reservations-module.sql`)
Sistema unificado de mesas y turnos/citas. Tablas: `booking_settings` (1×negocio: `mode` off/tables/appointments/both, `slot_minutes`, `default_duration_minutes`, `min_notice_minutes`, `max_advance_days`), `business_hours` (horario semanal, varias filas por `weekday` = turnos partidos), `booking_resources` (`kind` staff/table, `name`, `capacity`), `booking_services` (el servicio de cita ES un producto del catálogo: `product_id` → `products`, con `name`/`price` copiados como snapshot + `duration_minutes`), `business_closures`, `reservations` (`kind`, `resource_id`, `customer_id`, `starts_at`/`ends_at`, `party_size`, `service_id`, `status`, `source` manual/agent, `reminder_sent_at`, `service_price`/`service_product_id` = foto del servicio al reservar, `order_id` → `orders` = pedido espejo cuando un turno se completa).

**`reservations_no_overlap`** — exclusion constraint (`btree_gist`): imposible tener dos reservas activas (`status in ('pending','confirmed','seated')`) sobre el mismo `resource_id` en rangos `tstzrange` que se solapan. Esta es la garantía real de "no doble reserva", no lógica de aplicación.

RLS: policy `<tabla>_member_all` para `is_business_member(business_id)` en las 6 tablas — mismo patrón que `orders`. El agente escribe con service role.

### `account_change_requests`
Solicitudes de cambio de la cuenta de acceso (Google) — ver `docs/decisions.md`. Columnas: `business_id`, `requested_by`, `member_role`, `current_email`, `requested_email`, `reason`, `contact_phone`, `status` (pending/approved/rejected/cancelled), `resolved_by`/`resolved_at`/`resolution_note`. **RLS activa sin ninguna policy** (deny-all) — solo `service_role` la toca, desde server actions que derivan `user_id`/`business_id` de la sesión. Índice único parcial: una sola solicitud `pending` por `requested_by`. Columna nueva en `business_members`: `access_email_changed_at` (límite de 1 cambio al año).

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
Personalización completa del agente de cada negocio — todas las columnas son editables desde Mi Agente y todas tienen efecto real: `agentEngineService.ts` (`buildSystemPrompt`) las inyecta en el system prompt del motor.

| columna | tipo | notas |
|---|---|---|
| `business_id` | uuid | PK/FK |
| `name` | text | nombre propio del agente (ej. "Nova"), se presenta como tal en el prompt |
| `personality` | text | |
| `enabled_tools` | jsonb array | keys validadas contra `lib/config/agentTools.ts` |
| `system_prompt_extra` | text | instrucción libre adicional |
| `use_emojis` | boolean | |
| `response_length` | text | `"corta" \| "media" \| "larga"` |
| `language` | text | |
| `priority_products` | jsonb array | ids de producto a destacar |
| `restrictions` | text | |
| `faqs` | jsonb array | `{question, answer}[]`, fuente de la tool `responder_faq`. Reemplazó a `faq_text` (texto libre) — la columna vieja sigue en la base sin usarse, no se borró. |
| `business_hours` | text | horario en texto libre, el motor avisa si el cliente escribe fuera de rango |
| `greeting_message` | text | saludo inicial |
| `escalation_message` | text | qué decir cuando el cliente pide un humano o algo fuera del alcance del agente |
| `fallback_message` | text | frase de marca para "no lo sé", en vez de que el modelo improvise |
| `after_hours_message` | text | mensaje específico fuera de horario (distinto del dato crudo en `business_hours`) |
| `farewell_message` | text | despedida al cierre natural de la conversación |
| `accepts_cash_pickup` | boolean | default `false` — efectivo, recoger en tienda |
| `bank_name` | text | texto libre, nunca un catálogo de bancos — así escala a cualquier país sin mantenimiento (ver docs/decisions.md) |
| `bank_account_number` | text | texto libre |
| `updated_at` | timestamptz | |

Métodos de pago (`accepts_cash_pickup`/`bank_name`/`bank_account_number`) son deliberadamente texto libre y no un dropdown de bancos/fintechs por país — no hay pasarela de pago integrada todavía (puramente informativo para el agente) y un catálogo de bancos por región sería mantenimiento permanente sin beneficio funcional. Si en el futuro se integra una pasarela de pago real, ESE es el momento de estructurar esto (selector de gateway conectado), no antes.

### `agent_usage_log`
Tracking de tokens/costo del agente por negocio, desde el día uno (aunque no se cobre todavía).

| columna | tipo | notas |
|---|---|---|
| `id` | uuid | PK |
| `business_id` | uuid | FK a `businesses`, NOT NULL |
| `input_tokens` / `output_tokens` | integer | entrada fresca (no cacheada) / salida |
| `cache_read_input_tokens` / `cache_creation_input_tokens` | integer, default 0 | desglose de caché de prompt — lectura (0,1× precio input) / escritura (1,25× con TTL 5m). Migración en `docs/setup-credits-payments.md` §3a |
| `model` | text | id del modelo Anthropic usado (hoy `claude-sonnet-5`) |
| `created_at` | timestamptz | |

RLS: solo SELECT para `is_business_admin(business_id)` — sin policy de INSERT, se escribe con `createAdminClient()` (`lib/services/agentUsageService.ts`).

El costo estimado por negocio (Superadmin → Consumo) se calcula fila por fila con los precios de `lib/config/modelPricing.ts` (precio de lista Anthropic), respetando el `model` de cada fila. `agentEngineService.ts` marca el system prompt y el último mensaje del historial con `cache_control` para abaratar los turnos siguientes de cada conversación.

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

### `profile_security_events` y `user_login_events` (`docs/sql/profile-security-events.sql`)
Historial de seguridad personal (Perfil → "Historial de seguridad"): línea de tiempo por persona con inicios de sesión (`user_login_events`: `ip`, `user_agent`) + eventos propios (`profile_security_events`: `event_type` — `profile_updated`, `avatar_updated`, `signed_out_all_devices`, `collaborator_added` / `collaborator_updated` / `collaborator_deactivated` / `collaborator_reactivated` / `collaborator_removed`, `report_downloaded`, `account_change_requested`).

Ambas: `user_id` + `business_id`, sin policy de INSERT (se escribe con `createAdminClient()` desde server actions / route handlers que derivan ids de `getSessionProfile()`), SELECT acotado a `auth.uid() = user_id` — cada quien ve solo lo suyo, no basta con ser miembro del negocio. Gestión vía `lib/services/profileSecurityLogService.ts` y `loginEventService.ts`; el perfil los fusiona y ordena por fecha en `SecurityHistorySection`.

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

- Nunca agregar una policy de "cada quien edita su propia fila" en `business_members` — permitiría a un colaborador reescribir su propio `role` o `permissions`. Para escrituras puntuales sobre la propia fila, usar service role desde un server action, tocando solo la columna necesaria.
- Toda tabla nueva con datos de negocio debe llevar `business_id NOT NULL` y su policy de RLS correspondiente desde el primer commit, no después.