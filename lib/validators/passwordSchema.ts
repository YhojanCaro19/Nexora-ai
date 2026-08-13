import { z } from "zod";

// Misma regla en todos los formularios de contraseña del proyecto
// (cambiar-password, actualizar-password, perfil) — un solo lugar.
export const strongPasswordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[a-z]/, "Debe incluir al menos una minúscula")
  .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número")
  .regex(/[^a-zA-Z0-9]/, "Debe incluir al menos un carácter especial");
