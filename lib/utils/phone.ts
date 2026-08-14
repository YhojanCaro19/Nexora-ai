// lib/utils/phone.ts
//
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
