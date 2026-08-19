import { z } from "zod";
import { ASSIGNABLE_MODULES, type ModuleKey } from "@/lib/constants/nav-items";
import { isValidPhone } from "@/lib/utils/phone";

const moduleKeys = ASSIGNABLE_MODULES.map((m) => m.key);

export const collaboratorSchema = z.object({
  full_name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100),
  // E.164 igual que profileSchema.ts/businessBrandingSchema.ts — necesario
  // para que cualquier comparación exacta de teléfonos (ej. el aviso de
  // "ya registrado en otro negocio" en Solicitudes) compare siempre el
  // mismo string, sin importar cómo lo haya tipeado cada quien.
  phone: z
    .string()
    .optional()
    .refine((v) => !v || isValidPhone(v), { message: "El teléfono no es válido" }),
  email: z.string().email("Correo inválido"),
  permissions: z
    .array(z.string())
    .min(1, "Selecciona al menos un módulo")
    .refine((arr) => arr.every((key) => moduleKeys.includes(key as ModuleKey)), {
      message: "Módulo inválido",
    }),
});

export type CollaboratorInput = z.infer<typeof collaboratorSchema>;

// Mismos campos que collaboratorSchema salvo el correo: está atado a la
// cuenta de Auth (cambiarlo requeriría re-invitar), así que editar un
// colaborador nunca debe pedirlo ni tocarlo.
export const collaboratorUpdateSchema = collaboratorSchema.omit({ email: true });

export type CollaboratorUpdateInput = z.infer<typeof collaboratorUpdateSchema>;
