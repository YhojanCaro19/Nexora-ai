-- business-catalog-kind.sql
--
-- ¿El negocio vende productos, ofrece servicios, o ambos?
-- Decide si el stock del Catálogo es obligatorio: un servicio no tiene
-- inventario, un producto sí. Se pregunta en el onboarding (paso 3), la
-- industria lo pre-selecciona, y se puede cambiar después en Mi Agente →
-- "Sobre el negocio".
--
-- Default 'ambos' → los negocios que ya existen quedan con stock opcional
-- (comportamiento anterior), no se rompe nada.

alter table public.businesses
  add column if not exists catalog_kind text not null default 'ambos'
  check (catalog_kind in ('productos', 'servicios', 'ambos'));
