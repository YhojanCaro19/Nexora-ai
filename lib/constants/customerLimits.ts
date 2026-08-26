// lib/constants/customerLimits.ts
//
// Topes de etiquetas/notas/tareas por cliente. Viven acá y no en
// tagService.ts / customerNoteService.ts / customerTaskService.ts porque
// esos tres importan createClient() de lib/supabase/server.ts (usa
// "next/headers", solo servidor) — y customer-detail-view.tsx ("use
// client") también necesita estos números para deshabilitar sus
// formularios al llegar al tope. Mismo criterio que OTP_CODE_LENGTH en
// lib/constants/otp.ts: una constante compartida sin ningún import server-
// only, para que cliente y servidor puedan usar el mismo número sin
// arrastrar todo el módulo del service al bundle del navegador.
export const MAX_TAGS_PER_CUSTOMER = 5;
export const MAX_NOTES_PER_CUSTOMER = 5;
export const MAX_PENDING_TASKS_PER_CUSTOMER = 5;
