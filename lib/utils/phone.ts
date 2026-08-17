// lib/utils/phone.ts
import { parsePhoneNumberFromString } from "libphonenumber-js";

// La bandera se genera a partir del código ISO2 del país (dos letras
// regulares -> dos "regional indicator symbols" de Unicode). No hace falta
// ninguna librería ni imágenes: es el mismo truco que usa cualquier picker
// de país nativo.
export function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
}

// Formato E.164 simplificado: "+" seguido de 6 a 15 dígitos (código de país
// + número local). Es el formato que vamos a guardar siempre que un
// teléfono venga de PhoneField, para que Reportes pueda derivar el país
// sin ambigüedad.
const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

export function isValidPhone(value: string): boolean {
  return E164_PATTERN.test(value);
}

// Todo lo que guardamos viene en E.164 sin espacios ("+573054072356") —
// bueno para almacenar y validar, ilegible para mostrar. Esto lo formatea
// con la agrupación real de cada país (Colombia: "+57 305 4072356",
// Portugal: "+351 915 000 690"), usando el plan de numeración real de
// libphonenumber-js en vez de inventar una regla genérica que no aplicaría
// igual en los ~190 países del catálogo. Si el número no es válido o no se
// puede parsear, se devuelve tal cual llegó — nunca se rompe la UI por un
// dato viejo o parcial.
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = parsePhoneNumberFromString(value);
  return parsed ? parsed.formatInternational() : value;
}
