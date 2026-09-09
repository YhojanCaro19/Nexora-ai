// lib/config/industryPlaceholders.ts
//
// Textos-guía (placeholders en gris) de "Mi Agente" y del paso 3 del
// onboarding, por CATEGORÍA de industria (las 13 de industryCategories.ts).
// Antes estaban escritos a mano para barbería en mi-agente-panel.tsx, así
// que una tienda de celulares veía "Ej. Barbería especializada en cortes
// clásicos…". Acá cada categoría trae sus propios ejemplos.
//
// NO es contenido real del agente — el saludo, el tono y las FAQs de verdad
// se seedean desde la plantilla de la industria (industryAgentDefaults.ts /
// industry_agent_templates). Esto es solo el ejemplo que se muestra vacío.
//
// Por categoría y no por industria exacta a propósito (decisión con el
// usuario): 13 juegos mantenibles en vez de ~45.
import { categoryForIndustry } from "@/lib/config/industryCategories";

export interface IndustryPlaceholderSet {
  /** "¿A qué se dedica el negocio?" / "¿Qué vende u ofrece tu negocio?" */
  businessDescription: string;
  /** "Redes sociales" */
  socialLinks: string;
  /** "Modismos / así hablamos acá" */
  localPhrases: string;
  /** Ejemplo de FAQ (pregunta) */
  faqQuestion: string;
  /** Ejemplo de FAQ (respuesta) */
  faqAnswer: string;
  /** "Personalidad / tono" */
  personality: string;
  /** "Mensaje de bienvenida" */
  greeting: string;
}

const GENERIC: IndustryPlaceholderSet = {
  businessDescription:
    "Ej. A qué se dedica el negocio, qué lo hace distinto, hace cuánto está. 1–2 frases.",
  socialLinks: "Ej. Instagram @tunegocio, Facebook Tu Negocio",
  localPhrases: "Ej. parce, a la orden, con gusto, ¡de una!",
  faqQuestion: "Ej. ¿Hacen envíos?",
  faqAnswer: "Respuesta que dará el agente",
  personality: "Ej. Cercano y cordial, siempre ofrece ayuda extra…",
  greeting: "Ej. ¡Hola! Bienvenido a [negocio], ¿en qué te ayudo hoy?",
};

const SETS: Record<string, IndustryPlaceholderSet> = {
  gastronomica: {
    businessDescription:
      "Ej. Restaurante de comida casera, especialidad en bandeja paisa. 8 años en el barrio.",
    socialLinks: "Ej. Instagram @sazon_dela_abuela, Facebook Sazón de la Abuela",
    localPhrases: "Ej. a la orden, con mucho gusto, ¡buen provecho!",
    faqQuestion: "Ej. ¿Hacen domicilios?",
    faqAnswer: "Depende de la zona — cuéntame dónde estás y te confirmo.",
    personality: "Ej. Cálido y ágil, como el mesero que atiende rápido pero sin apurar.",
    greeting: "Ej. ¡Hola! ¿Quieres ver el menú o hacer un pedido?",
  },
  textil: {
    businessDescription:
      "Ej. Tienda de ropa femenina, tallas S a XXL, tendencias y básicos. Local en el centro.",
    socialLinks: "Ej. Instagram @moda_valentina, TikTok @moda.valentina",
    localPhrases: "Ej. reina, a la orden, ¡quedó divina!",
    faqQuestion: "Ej. ¿Tienen cambios si no me queda la talla?",
    faqAnswer: "Sí, tienes 8 días para cambio con la factura y la prenda sin usar.",
    personality: "Ej. Con onda y buena vibra, asesora sin presionar la compra.",
    greeting: "Ej. ¡Hola! ¿Buscas algo en particular o te muestro lo nuevo?",
  },
  tecnologia: {
    businessDescription:
      "Ej. Tienda de celulares y accesorios + servicio técnico. 5 años en el centro comercial.",
    socialLinks: "Ej. Instagram @celu_market, Facebook Celu Market",
    localPhrases: "Ej. parce, de una, con gusto, ¡listo el pollo!",
    faqQuestion: "Ej. ¿Los equipos tienen garantía?",
    faqAnswer: "Sí — pregúntame por el equipo y te cuento las condiciones y el tiempo.",
    personality: "Ej. Claro y directo, explica sin tecnicismos y no exagera para vender.",
    greeting: "Ej. ¡Hola! ¿Buscas un equipo, un accesorio o una reparación?",
  },
  belleza: {
    businessDescription:
      "Ej. Barbería especializada en cortes clásicos y arreglo de barba. 10 años en el barrio.",
    socialLinks: "Ej. Instagram @barberia_x, Facebook Barbería X",
    localPhrases: "Ej. parce, a la orden, ¡quedó tremendo!",
    faqQuestion: "Ej. ¿Necesito cita o puedo llegar directo?",
    faqAnswer: "Puedes llegar, pero con cita te aseguras el turno y no esperas.",
    personality: "Ej. Relajado y de confianza, como el barbero de toda la vida.",
    greeting: "Ej. ¡Hola! ¿Quieres ver los servicios o agendar un turno?",
  },
  salud_bienestar: {
    businessDescription:
      "Ej. Centro de estética y cuidado de la piel. Faciales, depilación y masajes. Personal certificado.",
    socialLinks: "Ej. Instagram @piel_sana_spa, Facebook Piel Sana",
    localPhrases: "Ej. con gusto, quedas atendida, ¡nos vemos pronto!",
    faqQuestion: "Ej. ¿Cuánto dura una sesión?",
    faqAnswer: "Cuéntame qué servicio te interesa y te digo la duración y el valor.",
    personality: "Ej. Profesional y tranquilizador, cuida el lenguaje y no promete de más.",
    greeting: "Ej. ¡Hola! ¿Quieres información de un servicio o agendar una cita?",
  },
  talleres: {
    businessDescription:
      "Ej. Taller de motos: mantenimiento, frenos, cambio de aceite y diagnóstico. 12 años de experiencia.",
    socialLinks: "Ej. Instagram @taller_elmecanico, Facebook Taller El Mecánico",
    localPhrases: "Ej. parce, de una, ¡listo pa' rodar!",
    faqQuestion: "Ej. ¿Cuánto se demora un cambio de aceite?",
    faqAnswer: "Cuéntame la moto y qué necesita, y te doy el tiempo y el costo aproximado.",
    personality: "Ej. Honesto y práctico, no infla el trabajo ni cobra de más.",
    greeting: "Ej. ¡Hola! ¿Qué necesita tu vehículo? Cuéntame y te agendo.",
  },
  hogar: {
    businessDescription:
      "Ej. Tienda de decoración y regalos: velas, cuadros, textiles y detalles para el hogar.",
    socialLinks: "Ej. Instagram @casa_bonita_deco, Pinterest Casa Bonita",
    localPhrases: "Ej. reina, a la orden, ¡quedó hermoso!",
    faqQuestion: "Ej. ¿Envuelven para regalo?",
    faqAnswer: "Sí, sin costo. Dime si es para regalo y lo dejamos listo.",
    personality: "Ej. Amable y con gusto por el detalle, ayuda a elegir sin apurar.",
    greeting: "Ej. ¡Hola! ¿Buscas algo para tu casa o un regalo?",
  },
  papeleria: {
    businessDescription:
      "Ej. Papelería y librería escolar: útiles, textos, impresiones y fotocopias. Al lado del colegio.",
    socialLinks: "Ej. Instagram @papeleria_ellapiz, Facebook Papelería El Lápiz",
    localPhrases: "Ej. a la orden, con gusto, ¡ya te lo tengo!",
    faqQuestion: "Ej. ¿Manejan lista escolar completa?",
    faqAnswer: "Sí — mándame la lista del colegio y te la cotizo completa.",
    personality: "Ej. Servicial y rápido, resuelve encargos de última hora sin drama.",
    greeting: "Ej. ¡Hola! ¿Qué necesitas? Útiles, impresiones o un texto.",
  },
  comercial: {
    businessDescription:
      "Ej. Tienda de mascotas: concentrado, accesorios, juguetes y peluquería canina.",
    socialLinks: "Ej. Instagram @mundo_mascota, Facebook Mundo Mascota",
    localPhrases: "Ej. parce, a la orden, ¡con gusto!",
    faqQuestion: "Ej. ¿Tienen domicilio el mismo día?",
    faqAnswer: "En la ciudad sí, según la hora. Cuéntame dónde estás y te confirmo.",
    personality: "Ej. Cercano y honesto, recomienda lo que de verdad sirve.",
    greeting: "Ej. ¡Hola! ¿Qué estás buscando hoy?",
  },
  inmobiliaria_construccion: {
    businessDescription:
      "Ej. Inmobiliaria: arriendo y venta de apartamentos y locales. Acompañamiento en todo el proceso.",
    socialLinks: "Ej. Instagram @vivienda_ya, Facebook Vivienda Ya",
    localPhrases: "Ej. con gusto, quedo atento, ¡cualquier cosa me escribe!",
    faqQuestion: "Ej. ¿Qué papeles piden para arrendar?",
    faqAnswer: "Depende del inmueble — cuéntame cuál te interesa y te paso los requisitos.",
    personality: "Ej. Formal pero cercano, claro con los tiempos y los costos.",
    greeting: "Ej. ¡Hola! ¿Buscas arriendo o compra? Cuéntame la zona y el presupuesto.",
  },
  automotriz: {
    businessDescription:
      "Ej. Concesionario de vehículos usados con garantía. Financiación y recibimos tu carro en parte de pago.",
    socialLinks: "Ej. Instagram @autos_del_valle, Facebook Autos del Valle",
    localPhrases: "Ej. parce, de una, ¡se lo dejo andando!",
    faqQuestion: "Ej. ¿Reciben mi carro como parte de pago?",
    faqAnswer: "Sí — cuéntame qué carro tienes (modelo, año, kilometraje) y lo valoramos.",
    personality: "Ej. Directo y transparente con el estado y los papeles del vehículo.",
    greeting: "Ej. ¡Hola! ¿Qué vehículo estás buscando? Te muestro opciones.",
  },
  viajes: {
    businessDescription:
      "Ej. Agencia de viajes: planes nacionales, tiquetes y paquetes todo incluido. Asesoría personalizada.",
    socialLinks: "Ej. Instagram @viaja_facil, Facebook Viaja Fácil",
    localPhrases: "Ej. con gusto, quedo atenta, ¡buen viaje!",
    faqQuestion: "Ej. ¿El plan incluye tiquetes?",
    faqAnswer: "Depende del paquete — dime a dónde y en qué fechas y te armo la cotización.",
    personality: "Ej. Entusiasta y organizada, aclara qué incluye y qué no sin letra chica.",
    greeting: "Ej. ¡Hola! ¿A dónde te gustaría viajar y en qué fechas?",
  },
  eventos_creatividad: {
    businessDescription:
      "Ej. Organización de eventos sociales: decoración, logística y coordinación. Bodas, grados y cumpleaños.",
    socialLinks: "Ej. Instagram @eventos_lumiere, TikTok @eventoslumiere",
    localPhrases: "Ej. con gusto, quedo atenta, ¡va a quedar espectacular!",
    faqQuestion: "Ej. ¿Con cuánta anticipación hay que reservar?",
    faqAnswer: "Cuéntame la fecha y el tipo de evento y te digo disponibilidad y valor.",
    personality: "Ej. Creativa y resolutiva, transmite calma y confianza al cliente.",
    greeting: "Ej. ¡Hola! Cuéntame qué evento tienes en mente y para cuándo.",
  },
};

export function getIndustryPlaceholders(
  industryType: string | null | undefined,
): IndustryPlaceholderSet {
  const category = categoryForIndustry(industryType);
  return (category && SETS[category]) || GENERIC;
}
