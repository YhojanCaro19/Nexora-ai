// i18n/locales.ts
//
// Idiomas soportados por AVENTHRA. Fuente única de verdad — la usa el
// server action que fija la cookie (app/actions/locale.ts), el toggle del
// navbar (components/i18n/LocaleToggle.tsx) y la carga de mensajes
// (i18n/request.ts).
//
// Modo de next-intl SIN rutas de idioma: el locale vive en la cookie
// `LOCALE`, no en la URL. No hay prefijo /es /en ni middleware.

export const LOCALES = ['es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

/** Nombre de la cookie donde se guarda la preferencia de idioma. */
export const LOCALE_COOKIE = 'LOCALE';

/** 1 año en segundos — vida de la cookie de idioma. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}
