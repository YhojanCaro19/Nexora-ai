import { z } from "zod";

export const industryTypes = [
  { value: "restaurant", label: "Restaurante" },
  { value: "jewelry", label: "Joyería" },
  { value: "barbershop", label: "Barbería" },
  { value: "hotel", label: "Hotel" },
  { value: "workshop", label: "Taller" },
  { value: "store", label: "Tienda" },
] as const;

export const businessSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100),
  industry_type: z.enum([
    "restaurant",
    "jewelry",
    "barbershop",
    "hotel",
    "workshop",
    "store",
  ]),
});

export type BusinessInput = z.infer<typeof businessSchema>;