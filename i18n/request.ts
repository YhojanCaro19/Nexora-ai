// i18n/request.ts
//
// Configuración por-request de next-intl (modo SIN rutas de idioma). Lee
// la cookie `LOCALE` y carga el diccionario correspondiente desde
// messages/<locale>.json. Si la cookie no existe o trae un valor raro,
// cae al idioma por defecto (es).
//
// Lo consume el plugin `createNextIntlPlugin('./i18n/request.ts')` en
// next.config.ts.
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from '@/i18n/locales';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
