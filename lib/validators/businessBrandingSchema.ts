import { z } from "zod";
import { isValidPhone } from "@/lib/utils/phone";

// Campo de texto libre opcional, compartido por NIT, dirección y los
// handles de redes sociales — todos van tal cual al PDF, sin formato
// propio que validar (a diferencia del correo o el teléfono).
const optionalText = (max: number) => z.string().max(max).optional().or(z.literal(""));

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
  taxId: optionalText(50),
  address: optionalText(200),
  instagram: optionalText(50),
  facebook: optionalText(50),
  tiktok: optionalText(50),
  twitter: optionalText(50),
});

export type BusinessBrandingInput = z.infer<typeof businessBrandingSchema>;
