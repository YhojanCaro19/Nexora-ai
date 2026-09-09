// lib/config/industryCategories.ts
//
// Agrupación puramente visual de las industrias de negocio bajo categorías
// más amplias (Agentes → Plantillas por industria en superadmin). No es un
// concepto de base de datos — `businesses.industry_type` sigue siendo el
// mismo valor plano de siempre (ver businessSchema.ts); esto solo decide
// cómo se organiza la pantalla, así que agregar o mover una industria de
// categoría es un cambio de código, no una migración.
//
// Cobertura amplia a propósito (pedido explícito): cualquier tipo de
// comercio que pueda vender por redes sociales/WhatsApp, no solo las
// industrias "clásicas" del catálogo original — pero siempre organizado
// por categoría, nunca como una lista plana de decenas de industrias
// sueltas. Lista en crecimiento — 2026-09-07: primera tanda de 20
// industrias nuevas, el usuario ya avisó que va a seguir pensando en más.
export interface IndustryCategory {
  key: string;
  label: string;
  industryTypes: string[];
}

export const INDUSTRY_CATEGORIES: IndustryCategory[] = [
  {
    key: "gastronomica",
    label: "Industria gastronómica",
    industryTypes: ["restaurant", "cafe", "bakery", "pastry_shop", "ice_cream_shop"],
  },
  {
    key: "textil",
    label: "Industria textil",
    industryTypes: ["clothing_store", "accessories_store"],
  },
  {
    key: "tecnologia",
    label: "Tecnología",
    industryTypes: ["phone_store", "computer_store", "appliance_store", "tech_store"],
  },
  {
    key: "belleza",
    label: "Belleza y cuidado personal",
    industryTypes: ["barbershop", "hair_salon", "makeup_store", "beauty_salon"],
  },
  {
    key: "salud_bienestar",
    label: "Salud y bienestar",
    industryTypes: ["aesthetic_center", "gym", "veterinary_clinic", "dental_clinic"],
  },
  {
    key: "talleres",
    label: "Talleres y reparación",
    industryTypes: ["workshop"],
  },
  {
    key: "hogar",
    label: "Hogar y decoración",
    industryTypes: ["home_decor_store", "flower_store"],
  },
  {
    key: "papeleria",
    label: "Papelería y librería",
    industryTypes: ["stationery_store", "bookstore"],
  },
  {
    key: "comercial",
    label: "Industria comercial",
    industryTypes: [
      "jewelry",
      "pet_store",
      "toy_store",
      "sporting_goods_store",
      "hardware_store",
      "hair_supply_store",
      "optical_store",
      "online_store",
    ],
  },
  {
    key: "inmobiliaria_construccion",
    label: "Inmobiliaria y construcción",
    industryTypes: ["real_estate_agency", "vacation_rental", "construction_company"],
  },
  {
    key: "automotriz",
    label: "Automotriz",
    industryTypes: ["car_dealership"],
  },
  {
    key: "viajes",
    label: "Viajes",
    industryTypes: ["travel_agency"],
  },
  {
    key: "eventos_creatividad",
    label: "Eventos y creatividad",
    industryTypes: ["event_planning", "photo_video_studio", "tattoo_studio", "personal_brand"],
  },
];

// industry_type -> key de su categoría. Mapa inverso de INDUSTRY_CATEGORIES,
// construido una vez. Usado para resolver ejemplos/placeholders por
// categoría (Mi Agente, onboarding) sin escribir contenido por cada una de
// las ~45 industrias.
const CATEGORY_BY_INDUSTRY: Record<string, string> = Object.fromEntries(
  INDUSTRY_CATEGORIES.flatMap((cat) => cat.industryTypes.map((it) => [it, cat.key])),
);

export function categoryForIndustry(industryType: string | null | undefined): string | null {
  if (!industryType) return null;
  return CATEGORY_BY_INDUSTRY[industryType] ?? null;
}
