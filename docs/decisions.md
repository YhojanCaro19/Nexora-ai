# Decisiones — AVENTHRA

> Registro de por qué se hizo algo de cierta forma, para no revertirlo por accidente.

## Multi-tenant: el aislamiento vive en `business_id`, no en un identificador nuevo por colaborador
Un colaborador no necesita un identificador especial para ver solo los datos de su admin — hereda el mismo `business_id` del negocio al que pertenece. Todo el aislamiento se resuelve filtrando por esa columna, reforzado con RLS.

## No hay signup público
Las cuentas solo se crean desde flujos controlados (aprobación de solicitud por superadmin, o creación de colaborador por admin), ambos usando la Admin API de Supabase con service role. Evita cuentas huérfanas sin negocio asociado.

## Autenticación solo con Google
Decisión explícita de seguridad: AVENTHRA **no maneja contraseñas ni correos propios**. El único método de inicio de sesión es "Continuar con Google". Al aprovisionar una cuenta (aprobación de solicitud, o alta de colaborador) se crea el usuario en Supabase Auth con el correo registrado y **sin `password`**, con `email_confirm: true` para que Supabase vincule la identidad de Google al iniciar sesión con ese mismo correo. Esto elimina todo el frente de ataque de contraseñas (reset, tokens de recuperación, enumeración de usuarios, contraseñas temporales en tránsito) y delega MFA y detección de anomalías a Google.

Se eliminaron: `login()` con `signInWithPassword`, las rutas `/cambiar-password`, `/recuperar-password`, `/actualizar-password`, `passwordService.ts`, `passwordSchema.ts`, `PasswordField.tsx`, y la sección "Cambiar contraseña" de Perfil. La columna `business_members.must_change_password` queda **sin uso** (no se dropea todavía, para no arriesgar una migración).

Si alguien entra con Google usando un correo que no tiene acceso (ni `platform_admins` ni `business_members`), el callback cierra la sesión y lo manda a `/solicitar-acceso`.

El OTP por correo como paso de re-verificación para acciones destructivas (eliminar colaborador, eliminar negocio) **sigue vivo** — es independiente de las contraseñas.

## Enforcement de permisos: doble capa, no una sola
Se decidió no confiar solo en RLS ni solo en checks de servidor. RLS es la garantía real (protege incluso si un desarrollador olvida un check en un endpoint nuevo); los checks de servidor son para dar mejor UX (mensaje de error claro en vez de fila vacía sin explicación).

## `must_change_password` vive en `business_members`, no en `user_metadata` de auth
Se detectó y corrigió un bug donde el flujo de cambio de contraseña escribía en `user_metadata` (que nadie lee) en vez de la columna real que consulta `getSessionProfile()`.

**Obsoleto desde "Autenticación solo con Google":** ya no hay contraseñas ni flujo de cambio forzado. La columna sigue en la tabla pero nada la lee ni la escribe. No usar este flag para lógica nueva.

## Personalización del agente: nunca reemplaza la capa de seguridad base
`agent_configs` permite personalizar nombre, personalidad/tono, y varios campos más (`system_prompt_extra`, `use_emojis`, `response_length`, `language`, `priority_products`, `restrictions`) del agente de cada negocio. El motor conversacional real (`lib/services/agentEngineService.ts`) ya existe y aplica esta regla tal cual se decidió: la personalización del admin se inyecta en el prompt como una capa ADICIONAL sobre una instrucción base fija y no editable (sin groserías, nada ilegal, no salirse de los límites del rol de agente de negocio) — nunca la reemplaza ni la anula. Ningún campo de personalización debe poder desactivar o sobrescribir esa base.

## Un solo agente conversacional, sin orquestación multi-agente
Decisión explícita: cada negocio tiene un único agente que usa function-calling directo sobre sus tools (catálogo, pedidos, FAQ), no un equipo de sub-agentes coordinados. Más simple de razonar, más barato, y ningún caso de uso actual de AVENTHRA lo necesita. Si en el futuro un caso de uso genuinamente lo requiere (ej. delegar una tarea larga a un sub-agente aparte), es una decisión nueva a tomar con contexto, no algo que se agrega por defecto.

## RAG (búsqueda vectorial) no es el default — solo cuando el caso lo justifica
Se agregó pgvector para el catálogo de productos, pero **no es lo que evita que el agente invente productos** — eso ya lo garantiza el tool-calling contra datos reales (SQL exacto o vectorial, cualquiera de los dos). La búsqueda vectorial se justifica solo cuando el catálogo es grande y/o el cliente busca en lenguaje natural ambiguo. Para catálogos chicos o datos estructurados, un `.eq()`/`.select()` normal es más preciso, más barato, y más simple — no agregar embeddings a una tabla nueva "por si acaso" o porque "así se hacen los agentes con IA".

## El stock se descuenta al confirmar el pedido, no al crearlo
Decisión explícita del usuario: `createOrder` (`orderService.ts`) nunca toca `products.stock` — el pedido se crea en estado `pending` sin afectar inventario. El descuento ocurre recién en `updateOrderStatus` cuando el estado pasa a `confirmed` (vía la función SQL `decrement_product_stock`, atómica). Así, un pedido que nunca se confirma o que se rechaza no le resta stock al negocio por algo que nunca se concretó.

## `/auth/callback` maneja dos flujos distintos con el parámetro `next`
El mismo callback se usa para login OAuth (Google) y para recuperación de contraseña. Sin `next`, resuelve el rol y manda al dashboard (caso login). Con `next=/actualizar-password` (y solo si está en el allowlist `ALLOWED_NEXT_PATHS`), manda ahí en vez de al dashboard — porque el objetivo de la recuperación es que el usuario defina una contraseña nueva, no que quede logueado sin haberla cambiado.
## Cambio de cuenta de acceso: mediado por el superadmin, 1×/año
Como el login es 100% Google, el correo registrado ES la llave de acceso — el usuario no lo puede cambiar solo sin riesgo de quedar bloqueado o de que la cuenta de Google vieja siga entrando. Flujo: el usuario crea una solicitud desde Perfil (`account_change_requests`, RLS sin policies — solo service role vía server actions), el superadmin la ve en `/superadmin/solicitudes` con el teléfono del registro, verifica identidad por fuera (llamada/WhatsApp) y aprueba. Al aprobar: `updateUserById({email})` + DELETE de la identidad de Google vieja vía la API admin de GoTrue (con rollback del correo si eso falla) + marca `business_members.access_email_changed_at`. Máximo un cambio por persona al año. Automatizar el OTP al teléfono queda para cuando exista el canal de WhatsApp/SMS.

## Módulo de Reservas: un solo sistema para mesas y turnos
Restaurantes (mesas) y barberías/salones (citas) son el mismo problema: reservar un RECURSO (`booking_resources.kind` = `table` | `staff`) en un rango de tiempo para un cliente. Tablas: `booking_settings` (modo, franja, ventana), `business_hours` (horario semanal), `booking_resources`, `booking_services` (nombre + duración + precio, solo citas), `business_closures`, `reservations`. El "no se puede reservar dos veces lo mismo" lo garantiza un **exclusion constraint de Postgres** (`reservations_no_overlap`, `btree_gist` sobre `resource_id` + `tstzrange`) — a nivel de base de datos, sin condiciones de carrera, sin librería. RLS `*_member_all` = `is_business_member` (igual que `orders`). El agente auto-confirma las reservas (decisión del usuario). Módulo propio en el nav (agenda + configuración), con acceso directo desde Pedidos. El agente tiene tools reales: `consultar_disponibilidad`, `reservar`, `consultar_mis_reservas`, `cancelar_reserva`. Recordatorio de confirmación 1 día antes vía `/api/cron/reservation-reminders` (hora local del negocio); sin canal saliente todavía, escribe el mensaje en el hilo de conversación (visible en el CRM) y marca `reservations.reminder_sent_at`.
