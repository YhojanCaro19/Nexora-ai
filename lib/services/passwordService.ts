import { randomInt } from "crypto";

/**
 * Genera una contraseña temporal de un solo uso para cuentas nuevas
 * (admin creado desde una solicitud aprobada, colaborador creado por su admin).
 * Compartida entre servicios para no duplicar la lógica — ver docs/decisions.md.
 *
 * Usa crypto.randomInt (CSPRNG de Node) en vez de Math.random, que no es
 * apto para generar secretos.
 */
export function generateTempPassword(): string {
  // Alfabetos sin caracteres ambiguos (sin 0/O, 1/l/I) para que sea legible al copiarla.
  // Mayúsculas y minúsculas van en alfabetos separados para poder garantizar
  // al menos una de cada una, no solo dejarlo a la probabilidad.
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const allLetters = uppercase + lowercase;

  const pick = (alphabet: string) => alphabet[randomInt(alphabet.length)];

  const chars: string[] = [];
  // Una mayúscula y una minúscula garantizadas.
  chars.push(pick(uppercase));
  chars.push(pick(lowercase));
  // Resto de letras (mayúscula o minúscula indistintamente) hasta completar 8.
  for (let i = 0; i < 6; i++) {
    chars.push(pick(allLetters));
  }
  chars.push(pick(digits));
  chars.push(pick(digits));
  chars.push(pick(symbols));
  // 11 caracteres en total, con mayúscula/minúscula/dígito/símbolo garantizados.

  // Fisher-Yates con randomInt para no dejar el símbolo/dígitos siempre al final.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
