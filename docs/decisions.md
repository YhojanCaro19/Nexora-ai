# Decisiones — AVENTHRA

> Registro de por qué se hizo algo de cierta forma, para no revertirlo por accidente.

## Multi-tenant: el aislamiento vive en `business_id`, no en un identificador nuevo por colaborador
Un colaborador no necesita un identificador especial para ver solo los datos de su admin — hereda el mismo `business_id` del negocio al que pertenece. Todo el aislamiento se resuelve filtrando por esa columna, reforzado con RLS.

## No hay signup público
Las cuentas solo se crean desde flujos controlados (aprobación de solicitud por superadmin, o creación de colaborador por admin), ambos usando la Admin API de Supabase con service role. Evita cuentas huérfanas sin negocio asociado.

## Enforcement de permisos: doble capa, no una sola
Se decidió no confiar solo en RLS ni solo en checks de servidor. RLS es la garantía real (protege incluso si un desarrollador olvida un check en un endpoint nuevo); los checks de servidor son para dar mejor UX (mensaje de error claro en vez de fila vacía sin explicación).

## `must_change_password` vive en `business_members`, no en `user_metadata` de auth
Se detectó y corrigió un bug donde el flujo de cambio de contraseña escribía en `user_metadata` (que nadie lee) en vez de la columna real que consulta `getSessionProfile()`. Cualquier lógica nueva que dependa de este flag debe leer/escribir la columna de `business_members`, nunca el metadata de auth.

## `/auth/callback` maneja dos flujos distintos con el parámetro `next`
El mismo callback se usa para login OAuth (Google) y para recuperación de contraseña. Sin `next`, resuelve el rol y manda al dashboard (caso login). Con `next=/actualizar-password` (y solo si está en el allowlist `ALLOWED_NEXT_PATHS`), manda ahí en vez de al dashboard — porque el objetivo de la recuperación es que el usuario defina una contraseña nueva, no que quede logueado sin haberla cambiado.