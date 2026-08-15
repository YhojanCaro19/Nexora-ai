import { z } from "zod";
import { isValidPhone } from "@/lib/utils/phone";

export const businessBrandingSchema = z.object({
  contactEmail: z
    .string()
    .email("Correo inválido")
    .optional()
    .or(z.literal("")),
  // Mismo formato E.164 que PhoneField entrega en Contáctanos — con
  // código de país, no un número suelto.
  contactPhone: z
    .string()
    .optional()
    .refine((v) => !v || isValidPhone(v), { message: "El teléfono no es válido" }),
});

export type BusinessBrandingInput = z.infer<typeof businessBrandingSchema>;
