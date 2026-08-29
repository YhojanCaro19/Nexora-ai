"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  type Locale,
} from "@/i18n/locales";

// Fija la preferencia de idioma en la cookie `LOCALE`. next-intl la lee en
// i18n/request.ts para elegir el diccionario. No toca la URL (modo sin
// rutas de idioma).
//
// El toggle del navbar (components/i18n/LocaleToggle.tsx) llama a esto y
// luego hace router.refresh() para que los Server Components se vuelvan a
// renderizar con el nuevo locale.
export async function setLocale(next: Locale): Promise<void> {
  if (!isLocale(next)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, next, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
