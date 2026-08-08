import { z } from "zod";
import { ASSIGNABLE_MODULES, type ModuleKey } from "@/lib/constants/nav-items";

const moduleKeys = ASSIGNABLE_MODULES.map((m) => m.key);

export const collaboratorSchema = z.object({
  full_name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100),
  phone: z
    .string()
    .max(20)
    .optional()
    .or(z.literal("")),
  email: z.string().email("Correo inválido"),
  permissions: z
    .array(z.string())
    .min(1, "Selecciona al menos un módulo")
    .refine((arr) => arr.every((key) => moduleKeys.includes(key as ModuleKey)), {
      message: "Módulo inválido",
    }),
});

export type CollaboratorInput = z.infer<typeof collaboratorSchema>;
