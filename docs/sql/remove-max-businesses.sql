-- remove-max-businesses.sql
--
-- AVENTHRA es 1 cuenta = 1 negocio. El tope `plans.max_businesses` nunca se
-- hizo cumplir (ni en el checkout de Wompi ni en la provisión de cuentas —
-- `processApprovedPayment` trata un segundo pago del mismo correo como
-- renovación, nunca crea un segundo negocio) y solo aparecía como dato
-- informativo en Perfil y en la landing. Se quitó del código; esto lo quita
-- del esquema.
--
-- Correr en el SQL editor de Supabase (producción y cualquier entorno).

alter table public.plans drop column if exists max_businesses;

-- Opcional (NO incluido por defecto): invariante dura de 1 usuario = 1
-- negocio. Antes de aplicarlo, verificar que el re-alta de un colaborador
-- reactiva su fila existente en business_members en vez de insertar otra
-- (ver lib/services/collaboratorService.ts) — si insertara, esto rompería
-- ese flujo.
--
-- create unique index if not exists business_members_user_id_uidx
--   on public.business_members (user_id);
