import { z } from "zod";
import { isValidPhone } from "@/lib/utils/phone";

// Mismo formato E.164 que el resto del proyecto (ver businessBrandingSchema.ts)
// — el teléfono que ya se muestra en Perfil viene de PhoneField y se guarda
// con código de país, no como número suelto.
export const ownProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre es demasiado largo"),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || isValidPhone(v), { message: "El teléfono no es válido" }),
});

export type OwnProfileInput = z.infer<typeof ownProfileSchema>;
