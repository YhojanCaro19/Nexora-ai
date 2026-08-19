// lib/errors/translate.ts
//
// Los errores de Supabase (Auth API y Postgres) vienen en inglés por
// defecto — nunca se le debe mostrar ese mensaje crudo al usuario. Esto
// centraliza la traducción a algo que sí sirve ("ya existe una cuenta con
// este correo") en vez de dejar pasar el mensaje de la librería tal cual.
//
// Se mapea primero por `code` (más confiable, no depende de texto en
// inglés que pueda cambiar de versión a versión) y si no hay code
// reconocido, por patrón sobre `message`. Si no matchea nada, un mensaje
// genérico — jamás el original en inglés.

type SupabaseLikeError = {
  message?: string;
  code?: string;
} | null | undefined;

const BY_CODE: Record<string, string> = {
  // Supabase Auth
  email_exists: "Ya existe una cuenta con este correo.",
  user_already_exists: "Ya existe una cuenta con este correo.",
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Debes confirmar tu correo antes de iniciar sesión.",
  weak_password: "La contraseña es muy débil — usa al menos 6 caracteres.",
  same_password: "La nueva contraseña debe ser diferente a la anterior.",
  over_request_rate_limit: "Demasiados intentos. Espera un momento y vuelve a intentarlo.",
  over_email_send_rate_limit: "Se enviaron muchos correos seguidos. Espera un momento y vuelve a intentarlo.",
  validation_failed: "Revisa los datos ingresados.",
  user_not_found: "No encontramos una cuenta con esos datos.",
  email_address_invalid: "Ese correo no es válido. Verifica que esté bien escrito.",
  // Postgres
  "23505": "Ya existe un registro con esos datos.",
  "23503": "No se pudo completar la operación: hay datos relacionados que lo impiden.",
  "23514": "El valor ingresado no es válido.",
};

const BY_MESSAGE_PATTERN: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "Correo o contraseña incorrectos."],
  [/email not confirmed/i, "Debes confirmar tu correo antes de iniciar sesión."],
  [/already been registered|already registered|already exists/i, "Ya existe una cuenta con este correo."],
  [/password should be at least/i, "La contraseña debe tener al menos 6 caracteres."],
  [/unable to validate email address/i, "El formato del correo no es válido."],
  [/only request this once every|rate limit/i, "Demasiados intentos. Espera un momento y vuelve a intentarlo."],
  [/new password should be different/i, "La nueva contraseña debe ser diferente a la anterior."],
  [/duplicate key value violates unique constraint/i, "Ya existe un registro con esos datos."],
  [/violates check constraint/i, "El valor ingresado no es válido."],
  [/violates foreign key constraint/i, "No se pudo completar la operación: hay datos relacionados que lo impiden."],
  [/network|fetch failed|failed to fetch/i, "No pudimos conectarnos. Revisa tu conexión e intenta de nuevo."],
];

// Constraints UNIQUE puntuales para las que sí sabemos exactamente qué
// columna chocó — un mensaje específico ayuda más que el genérico de
// BY_CODE["23505"]. Postgres siempre incluye el nombre del constraint en
// el mensaje del error (`duplicate key value violates unique constraint
// "<nombre>"`), así que se matchea por ahí en vez de adivinar por texto.
//
// No hay ninguna entrada por teléfono duplicado: se decidió explícitamente
// NO crear un índice único sobre `business_members.phone` — un mismo dueño
// real puede tener varios negocios con el mismo teléfono, así que eso se
// resuelve con un aviso informativo al superadmin en Solicitudes, no con
// una constraint que lo bloquee.
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {};

const GENERIC_FALLBACK = "Ocurrió un error inesperado. Intenta de nuevo.";

export function translateError(error: SupabaseLikeError): string {
  if (!error) return GENERIC_FALLBACK;

  if (error.code === "23505") {
    const message = error.message ?? "";
    for (const [constraintName, spanish] of Object.entries(UNIQUE_CONSTRAINT_MESSAGES)) {
      if (message.includes(constraintName)) return spanish;
    }
  }

  if (error.code && BY_CODE[error.code]) {
    return BY_CODE[error.code];
  }

  const message = error.message ?? "";
  for (const [pattern, spanish] of BY_MESSAGE_PATTERN) {
    if (pattern.test(message)) return spanish;
  }

  return GENERIC_FALLBACK;
}
