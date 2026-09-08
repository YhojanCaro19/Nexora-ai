// lib/constants/securityEventLabels.ts
//
// Tipo + etiquetas de `profile_security_events`, en un archivo SIN
// importar nada de servidor (ni supabase/server, ni nada que dependa de
// `next/headers`). Vive separado de `profileSecurityLogService.ts` a
// propósito: ese archivo importa `createAdminClient`/`createClient`, y
// un componente cliente (ej. profile-panel.tsx) que solo necesita el
// diccionario de etiquetas terminaba arrastrando todo ese módulo al
// bundle del navegador — error real de build 2026-09-07 ("You're
// importing a module that depends on next/headers").
//
// `profileSecurityLogService.ts` reexporta ambos para el código de
// servidor; los componentes cliente deben importar DIRECTO de acá.

export type ProfileSecurityEventType =
  | "password_changed"
  | "signed_out_all_devices"
  // Cierre de sesión normal (un solo dispositivo) — distinto del de
  // arriba. No se registra para el superadmin (no tiene business_id).
  | "signed_out"
  | "avatar_updated"
  | "profile_updated"
  // Acceso a datos del negocio — acciones sensibles que quedan en el
  // historial personal de quien las hizo (auth.uid() = user_id).
  | "collaborator_added"
  | "collaborator_updated"
  | "collaborator_deactivated"
  | "collaborator_reactivated"
  | "collaborator_removed"
  | "report_downloaded"
  | "account_change_requested"
  | "product_created"
  | "products_bulk_imported"
  // Conexiones OAuth a redes/cuentas publicitarias — un tipo por
  // proveedor (no un tipo genérico + detalle) para no tocar el schema:
  // `profile_security_events` no tiene columna de detalle, y esto evita
  // agregarla solo para esto.
  | "channel_connected_messenger"
  | "channel_connected_instagram"
  | "channel_connected_whatsapp"
  | "ad_account_connected_meta"
  | "ad_account_connected_google"
  | "ad_account_connected_tiktok"
  // proxy.ts detectó que la sesión se usó desde otro navegador/equipo
  // (huella de dispositivo distinta) y la cerró por seguridad.
  | "session_device_mismatch";

// Etiquetas en español de cada tipo — vive acá (junto al tipo) para que
// Perfil → "Historial de seguridad" (propio) y Superadmin → Logs
// (plataforma completa) usen exactamente el mismo texto, sin duplicar el
// diccionario en dos archivos.
export const SECURITY_EVENT_LABELS: Record<ProfileSecurityEventType, string> = {
  password_changed: "Contraseña cambiada",
  signed_out_all_devices: "Cerró sesión en todos los dispositivos",
  signed_out: "Cerró sesión",
  avatar_updated: "Actualizó su foto de perfil",
  profile_updated: "Actualizó su nombre o teléfono",
  collaborator_added: "Agregó un colaborador",
  collaborator_updated: "Editó los datos de un colaborador",
  collaborator_deactivated: "Desactivó a un colaborador",
  collaborator_reactivated: "Reactivó a un colaborador",
  collaborator_removed: "Eliminó a un colaborador",
  report_downloaded: "Descargó un reporte",
  account_change_requested: "Pidió cambiar su cuenta de acceso",
  product_created: "Creó un producto",
  products_bulk_imported: "Importó productos en lote (CSV)",
  channel_connected_messenger: "Conectó Messenger (Facebook)",
  channel_connected_instagram: "Conectó Instagram",
  channel_connected_whatsapp: "Conectó WhatsApp",
  ad_account_connected_meta: "Conectó Meta Ads",
  ad_account_connected_google: "Conectó Google Ads",
  ad_account_connected_tiktok: "Conectó TikTok Ads",
  session_device_mismatch: "Sesión cerrada: se intentó usar desde otro dispositivo",
};
