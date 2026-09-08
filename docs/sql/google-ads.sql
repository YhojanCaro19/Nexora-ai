-- ============================================================
-- GOOGLE ADS — conexión OAuth por negocio — AVENTHRA (2026-09-07)
-- ============================================================
-- Corre esto DESPUÉS de que exista `ad_accounts` (se creó con la conexión
-- de Meta Ads). Idempotente. Ver lib/services/adAccountService.ts y
-- docs/google-ads-setup-checklist.md.
--
-- Por qué hacen falta dos columnas nuevas:
--
--  · refresh_token — Meta entrega un token largo (~60 días) y no usa
--    refresh token, así que hasta hoy alcanzaba con `access_token`.
--    Google entrega un access token de 1 HORA + un refresh token
--    permanente; sin guardarlo, la conexión se moriría el mismo día.
--    Va CIFRADO igual que `access_token` (AES-256-GCM, tokenCrypto).
--
--  · login_customer_id — el Customer ID de la cuenta Manager (MCC) desde
--    la que se accede a la cuenta del negocio. Google lo exige como header
--    `login-customer-id` cuando el acceso es a través del MCC. Es un
--    identificador de cuenta, no un secreto: va en claro.
-- ============================================================

alter table public.ad_accounts
  add column if not exists refresh_token     text,
  add column if not exists login_customer_id text;

comment on column public.ad_accounts.refresh_token is
  'Solo Google: refresh token CIFRADO (tokenCrypto). Meta no usa refresh token.';
comment on column public.ad_accounts.login_customer_id is
  'Solo Google: Customer ID del MCC (header login-customer-id). Sin cifrar, no es secreto.';

-- Verificación rápida — deben salir las dos filas.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ad_accounts'
  and column_name in ('refresh_token', 'login_customer_id')
order by column_name;
