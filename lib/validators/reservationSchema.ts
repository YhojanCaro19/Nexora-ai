import { z } from "zod";

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (usa HH:MM)");

export const bookingSettingsSchema = z.object({
  mode: z.enum(["off", "tables", "appointments", "both"]),
  slotMinutes: z.number().int().min(5).max(240),
  defaultDurationMinutes: z.number().int().min(5).max(600),
  minNoticeMinutes: z.number().int().min(0).max(60 * 24 * 7),
  maxAdvanceDays: z.number().int().min(1).max(365),
});
export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>;

export const businessHoursSchema = z.object({
  hours: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        opensAt: timeString,
        closesAt: timeString,
      })
    )
    .max(50)
    .refine((rows) => rows.every((r) => r.closesAt > r.opensAt), {
      message: "La hora de cierre debe ser posterior a la de apertura",
    }),
});
export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;

export const bookingResourceSchema = z.object({
  kind: z.enum(["staff", "table"]),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  capacity: z.number().int().min(1).max(100).nullable().optional(),
  active: z.boolean().optional(),
});
export type BookingResourceInput = z.infer<typeof bookingResourceSchema>;

export const bookingServiceSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  durationMinutes: z.number().int().min(5).max(600),
  price: z.number().min(0).max(99999999).nullable().optional(),
  active: z.boolean().optional(),
});
export type BookingServiceInput = z.infer<typeof bookingServiceSchema>;

// Reserva creada desde el panel (manual) o por el agente. El backend
// calcula ends_at (duración del servicio o default) y valida el solape.
export const createReservationSchema = z
  .object({
    kind: z.enum(["table", "appointment"]),
    resourceId: z.string().uuid().optional(),
    startsAt: z.string().datetime({ offset: true }),
    // tablas
    partySize: z.number().int().min(1).max(100).optional(),
    // citas
    serviceId: z.string().uuid().optional(),
    durationMinutes: z.number().int().min(5).max(600).optional(),
    customerName: z.string().trim().max(120).optional(),
    customerPhone: z.string().trim().max(40).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.kind !== "table" || v.partySize != null, {
    message: "Falta el número de personas",
    path: ["partySize"],
  });
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
