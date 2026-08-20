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
// por categoría, nunca como una lista plana de 24 industrias sueltas.
export interface IndustryCategory {
  key: string;
  label: string;
  industryTypes: string[];
}

export const INDUSTRY_CATEGORIES: IndustryCategory[] = [
  {
    key: "gastronomica",
    label: "Industria gastronómica",
    industryTypes: ["restaurant", "cafe", "bakery", "ice_cream_shop"],
  },
  {
    key: "textil",
    label: "Industria textil",
    industryTypes: ["clothing_store", "accessories_store"],
  },
  {
    key: "tecnologia",
    label: "Tecnología",
    industryTypes: ["phone_store", "computer_store", "appliance_store"],
  },
  {
    key: "belleza",
    label: "Belleza y cuidado personal",
    industryTypes: ["barbershop", "makeup_store", "beauty_salon"],
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
    industryTypes: ["jewelry", "pet_store", "toy_store", "sporting_goods_store"],
  },
];
