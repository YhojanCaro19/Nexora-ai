import { z } from "zod";

export const industryTypes = [
  { value: "restaurant", label: "Restaurante" },
  { value: "cafe", label: "Cafetería" },
  { value: "bakery", label: "Panadería" },
  { value: "ice_cream_shop", label: "Heladería" },
  { value: "jewelry", label: "Joyería" },
  { value: "barbershop", label: "Barbería" },
  { value: "makeup_store", label: "Tienda de maquillaje" },
  { value: "beauty_salon", label: "Salón de belleza" },
  { value: "workshop", label: "Taller" },
  { value: "clothing_store", label: "Tienda de ropa" },
  { value: "accessories_store", label: "Tienda de accesorios de moda" },
  { value: "phone_store", label: "Tienda de celulares" },
  { value: "computer_store", label: "Tienda de computadores" },
  { value: "appliance_store", label: "Tienda de electrodomésticos" },
  { value: "pet_store", label: "Tienda de mascotas" },
  { value: "home_decor_store", label: "Tienda de decoración para el hogar" },
  { value: "flower_store", label: "Floristería" },
  { value: "toy_store", label: "Juguetería" },
  { value: "sporting_goods_store", label: "Tienda de artículos deportivos" },
  { value: "stationery_store", label: "Papelería" },
  { value: "bookstore", label: "Librería" },
] as const;

export const businessSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100),
  industry_type: z.enum([
    "restaurant",
    "cafe",
    "bakery",
    "ice_cream_shop",
    "jewelry",
    "barbershop",
    "makeup_store",
    "beauty_salon",
    "workshop",
    "clothing_store",
    "accessories_store",
    "phone_store",
    "computer_store",
    "appliance_store",
    "pet_store",
    "home_decor_store",
    "flower_store",
    "toy_store",
    "sporting_goods_store",
    "stationery_store",
    "bookstore",
  ]),
});

export type BusinessInput = z.infer<typeof businessSchema>;
