// lib/config/productCategories.ts
//
// Categorías sugeridas de producto, por industria (Catálogo → formulario
// de producto). A diferencia de bank_name/métodos de pago (texto libre a
// propósito, ver docs/decisions.md), acá SÍ tiene sentido curar opciones
// reales por industria: ayuda a organizar el catálogo y a que el agente
// responda mejor cuando crece. Siempre incluye "Otra" en la UI como
// escape hatch a texto libre — no todo producto real encaja perfecto en
// una lista fija.
export const PRODUCT_CATEGORIES: Record<string, string[]> = {
  restaurant: ["Entradas", "Platos fuertes", "Postres", "Bebidas", "Combos"],
  cafe: ["Café caliente", "Café frío", "Repostería", "Snacks", "Bebidas sin café"],
  bakery: ["Panes", "Tortas y pasteles", "Postres individuales", "Galletas", "Sin gluten"],
  ice_cream_shop: ["Helados", "Paletas", "Malteadas", "Postres con helado", "Toppings"],
  jewelry: ["Anillos", "Cadenas", "Aretes", "Pulseras", "Relojes", "Dijes"],
  barbershop: ["Cortes", "Barba", "Combo corte y barba", "Tratamientos capilares", "Productos para el cabello"],
  makeup_store: ["Rostro", "Ojos", "Labios", "Skincare", "Brochas y accesorios"],
  beauty_salon: ["Peinados", "Manicure y pedicure", "Tratamientos faciales", "Depilación", "Maquillaje"],
  workshop: ["Diagnóstico", "Mantenimiento", "Repuestos", "Reparaciones eléctricas", "Llantas y frenos"],
  clothing_store: ["Camisas y blusas", "Pantalones", "Vestidos", "Chaquetas", "Ropa deportiva"],
  accessories_store: ["Bolsos", "Cinturones", "Bisutería", "Gafas", "Sombreros y gorras"],
  phone_store: ["Celulares nuevos", "Celulares usados", "Fundas y protectores", "Cargadores y cables", "Repuestos"],
  computer_store: ["Portátiles", "Computadores de escritorio", "Componentes", "Periféricos", "Repuestos"],
  appliance_store: ["Cocina", "Refrigeración", "Lavado", "Climatización", "Pequeños electrodomésticos"],
  pet_store: ["Alimento para perros", "Alimento para gatos", "Accesorios", "Higiene y cuidado", "Juguetes para mascotas"],
  home_decor_store: ["Decoración de pared", "Iluminación", "Textiles para el hogar", "Organización", "Objetos decorativos"],
  flower_store: ["Ramos", "Arreglos florales", "Plantas", "Regalos combinados", "Flores individuales"],
  toy_store: ["Juguetes educativos", "Muñecas y figuras", "Juegos de mesa", "Juguetes al aire libre", "Peluches"],
  sporting_goods_store: ["Ropa deportiva", "Calzado deportivo", "Balones y equipos", "Suplementos", "Accesorios de gimnasio"],
  stationery_store: ["Cuadernos y papelería", "Útiles escolares", "Oficina", "Arte y manualidades", "Regalos y detalles"],
  bookstore: ["Ficción", "No ficción", "Infantil y juvenil", "Académicos", "Cómics y novelas gráficas"],
};

// "Otra" siempre es la última opción en la UI — nunca se guarda ese
// literal en la base, dispara un input de texto libre en su lugar.
export const OTHER_CATEGORY_OPTION = "Otra";

export function getCategoryOptions(industryType: string | null): string[] {
  const base = industryType ? PRODUCT_CATEGORIES[industryType] ?? [] : [];
  return [...base, OTHER_CATEGORY_OPTION];
}
