import { z } from "zod";

// Solicitud de cambio de cuenta de acceso (Google). El correo nuevo tiene
// que ser una cuenta de Google válida — eso no se puede validar acá, se le
// avisa en la UI y lo confirma el superadmin antes de aprobar.
export const accountChangeRequestSchema = z.object({
  requestedEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo inválido")
    .max(255, "El correo es demasiado largo"),
  reason: z
    .string()
    .trim()
    .min(10, "Cuéntanos brevemente por qué necesitas el cambio (mínimo 10 caracteres)")
    .max(500, "El motivo es demasiado largo"),
});

export type AccountChangeRequestInput = z.infer<typeof accountChangeRequestSchema>;

// Resolución del superadmin.
export const accountChangeResolveSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500, "La nota es demasiado larga").optional(),
});

export type AccountChangeResolveInput = z.infer<typeof accountChangeResolveSchema>;
