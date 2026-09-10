// lib/config/productCategories.ts
//
// Las categorías de producto las crea el negocio, no hay lista predefinida
// por industria (decisión 2026-09-09: inventar categorías por industria
// generaba ruido y no siempre encajaba). El desplegable del formulario de
// producto (Catálogo) muestra las categorías que el negocio ya usó + esta
// opción "Nueva categoría", que dispara un input de texto libre.
//
// El literal "Otra" nunca se guarda en la base — es solo el valor
// centinela de esa opción en la UI.
export const OTHER_CATEGORY_OPTION = "Otra";
