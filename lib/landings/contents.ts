/**
 * Contenido de landings locales para SEO geolocalizado.
 * Cada municipio tiene texto único (≥400 palabras totales) para evitar
 * canibalización y mejorar relevancia local en Google.
 */

import { slugifyEs } from "@/lib/seo/slug";

export type LandingFaq = {
  q: string;
  a: string;
};

export type Landing = {
  /** Nombre oficial del municipio, tal cual aparece en titulares. */
  name: string;
  /** Slug en URL (debe coincidir con generateStaticParams). */
  slug: string;
  /** Provincia / comarca para subtitulares. */
  region: string;
  /** Distancia textual lista para subtítulo: "a 5 km / 8 min en coche". */
  distance: string;
  /** Distancia numérica en km — para schema y resaltados. */
  distanceKm: number;
  /** Iframe URL de Google Maps con direcciones desde el municipio hasta la tienda. */
  mapEmbedUrl: string;
  /** Descripción principal: 80-120 palabras únicos por municipio (clubs, eventos, fiestas, equipos). */
  description: string;
  /** Contexto del público objetivo (60 palabras propios): por qué la gente del municipio nos visita. */
  areaContext: string;
  /** Slug de categoría a destacar en la sección "Lo más demandado en X". */
  highlightCategorySlug: "running" | "padel" | "montana" | "calzado";
  /** Etiqueta humana de la categoría destacada. */
  highlightCategoryLabel: string;
  /** Preguntas frecuentes específicas del municipio (4-5). */
  faqs: LandingFaq[];
};

const TIENDA_LATLNG = "38.881,-6.622";

function mapsDirections(originAddress: string): string {
  return `https://www.google.com/maps/embed/v1/directions?key=&origin=${encodeURIComponent(
    originAddress,
  )}&destination=${TIENDA_LATLNG}&mode=driving`;
}

/** Iframe sin API key — usamos el formato "place" público de Google Maps. */
function mapsRoute(origin: string): string {
  // El embed pública funciona sin API key con URL de búsqueda.
  return `https://maps.google.com/maps?q=${encodeURIComponent(
    "C. Silos 3, Puebla de la Calzada",
  )}&saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(
    "C. Silos 3, 06490 Puebla de la Calzada, Badajoz",
  )}&output=embed`;
}

export const LANDING_SLUGS = [
  "puebla-de-la-calzada",
  "montijo",
  "lobon",
  "talavera-la-real",
  "merida",
  "badajoz",
] as const;

export type LandingSlug = (typeof LANDING_SLUGS)[number];

export const LANDINGS: Record<LandingSlug, Landing> = {
  "puebla-de-la-calzada": {
    name: "Puebla de la Calzada",
    slug: "puebla-de-la-calzada",
    region: "Badajoz · Vegas Bajas del Guadiana",
    distance: "Estamos en el centro de tu pueblo",
    distanceKm: 0,
    mapEmbedUrl: mapsRoute("Plaza de España, Puebla de la Calzada"),
    description:
      "Zona Sport nace en Puebla de la Calzada, en plena comarca de las Vegas Bajas del Guadiana, y forma parte del día a día deportivo del municipio. Acompañamos al CD Puebla de la Calzada en su equipación, vestimos a corredores que entrenan junto al río Guadiana y a los caminos rurales hacia Lobón, y atendemos a las familias que cada año participan en la San Silvestre local y en las marchas BTT de las fiestas de la Inmaculada. Si vives en Puebla, somos literalmente tu tienda de barrio: te conocemos por el nombre, sabemos qué te gusta y guardamos tu talla.",
    areaContext:
      "Nuestro local de la calle Silos está a un paso de la Plaza de España, junto al ambulatorio y a pocos minutos andando de cualquier punto del pueblo. Vienen vecinos de toda la vida buscando consejo experto, padres comprando el equipo del cole, runners preparando la Media de Badajoz y jugadores de pádel del Club Puebla. Atendemos sin prisa, probamos calzado con calma y reservamos por WhatsApp.",
    highlightCategorySlug: "running",
    highlightCategoryLabel: "Running",
    faqs: [
      {
        q: "¿Dónde está exactamente la tienda en Puebla de la Calzada?",
        a: "En la C. Silos, 3, a 100 metros de la Plaza de España, justo al lado del centro de salud. Tienes aparcamiento libre en la Plaza de la Inmaculada y en las calles adyacentes a cualquier hora del día.",
      },
      {
        q: "¿Hacéis entrega a domicilio en Puebla de la Calzada?",
        a: "Sí. Para pedidos confirmados por WhatsApp y dentro del casco urbano de Puebla llevamos el producto a tu domicilio sin coste el mismo día o al día siguiente, siempre que esté en stock.",
      },
      {
        q: "¿Tenéis equipaciones del CD Puebla o textil deportivo para clubes locales?",
        a: "Trabajamos con marcas técnicas (John Smith, +8000, Joma, Puma) y podemos personalizar prendas para clubes y peñas del pueblo bajo pedido. Pásate por la tienda con la propuesta y te preparamos presupuesto.",
      },
      {
        q: "¿Atendéis los días festivos o durante las fiestas patronales?",
        a: "Mantenemos horario de mañana en la mayoría de festivos locales menores. En fiestas grandes (Inmaculada, Carnaval, Semana Santa) publicamos el horario especial en Instagram y en la puerta de la tienda. Si tienes dudas, escríbenos por WhatsApp.",
      },
      {
        q: "¿Puedo recoger en tienda lo que reserve por WhatsApp?",
        a: "Por supuesto. Mándanos el modelo y la talla por WhatsApp al +34 689 11 06 91, te confirmamos disponibilidad en minutos y te lo dejamos apartado 48 horas para que pases a probártelo cuando te venga bien.",
      },
    ],
  },

  montijo: {
    name: "Montijo",
    slug: "montijo",
    region: "Badajoz · Vegas Bajas del Guadiana",
    distance: "A 4 km · 7 minutos en coche",
    distanceKm: 4,
    mapEmbedUrl: mapsRoute("Plaza de España, Montijo, Badajoz"),
    description:
      "Montijo y Puebla de la Calzada son prácticamente un mismo núcleo urbano, separados solo por la rotonda de la EX-209. En Zona Sport vestimos a corredores del Club Atletismo Montijo, a jugadores de pádel y fútbol sala, y a las familias que cada verano disfrutan de la piscina municipal y de la Vía Verde Vegas del Guadiana. Las fiestas de San Isidro y la Feria de Montijo son fechas grandes en las que nos visitan vecinos buscando zapatillas cómodas para las largas jornadas de feria. Si entrenas en el Pabellón Municipal o en el campo de fútbol Emilio Macarro, tu equipación está aquí.",
    areaContext:
      "Vivir en Montijo y comprar deporte en Zona Sport es la opción más cómoda: en menos de diez minutos en coche pasas por la rotonda de Puebla y aparcas en nuestra puerta. Muchos clientes de Montijo combinan la visita a la tienda con recados en Puebla — somos el mismo área comercial y nos conocemos desde hace años. Reservamos por WhatsApp y guardamos tallas.",
    highlightCategorySlug: "padel",
    highlightCategoryLabel: "Pádel",
    faqs: [
      {
        q: "¿Cuánto se tarda desde Montijo hasta la tienda Zona Sport?",
        a: "Entre 6 y 8 minutos en coche por la EX-209. Desde el centro de Montijo son apenas 4 km en línea recta hacia Puebla de la Calzada. En bicicleta, por la Vía Verde, también es un paseo cómodo de unos 15 minutos.",
      },
      {
        q: "¿Tenéis palas y material de pádel para los clubes de Montijo?",
        a: "Sí, somos especialistas en pádel: trabajamos palas Babolat para iniciación, intermedio y competición. Disponemos también de paleteros, grips, overgrips, pelotas y zapatillas de pádel específicas.",
      },
      {
        q: "¿Hago el viaje en vano? ¿Puedo confirmar antes que tenéis mi talla?",
        a: "Nunca vayas a ciegas: mándanos un WhatsApp con el modelo y la talla y en cuestión de minutos te confirmamos si está en tienda. Si lo prefieres, te lo apartamos hasta 48 horas para que vengas tranquilo.",
      },
      {
        q: "¿Hacéis reposición de zapatillas de running para los corredores de Montijo?",
        a: "Trabajamos las tallas y modelos de running más demandados por corredores populares, incluidas las zapatillas técnicas de Joma. Si tu modelo habitual no está, te lo pedimos en menos de una semana.",
      },
    ],
  },

  lobon: {
    name: "Lobón",
    slug: "lobon",
    region: "Badajoz · Vegas Bajas del Guadiana",
    distance: "A 8 km · 10 minutos en coche",
    distanceKm: 8,
    mapEmbedUrl: mapsRoute("Plaza de España, Lobón, Badajoz"),
    description:
      "Lobón es el municipio vecino al sur de Puebla, en plena ribera del Guadiana, y muchos lobonenses bajan a Zona Sport cuando necesitan equiparse para el fútbol sala, el running por los caminos de la dehesa o las rutas BTT hacia el embalse de Montijo. Acompañamos al CD Lobón con material técnico y atendemos a las familias que participan en la Carrera Popular de Lobón y en la procesión-romería de la Virgen de Barbaño. Si haces senderismo por la sierra de San Serván o practicas tiro deportivo en el club local, encontrarás aquí calzado de campo, mochilas y ropa técnica.",
    areaContext:
      "Desde Lobón llegas a la tienda en menos de 10 minutos por la EX-209 cruzando Puebla. La mayoría de nuestros clientes de Lobón aprovecha la visita para hacer la compra semanal o ir al médico en Puebla. Te atendemos sin agobios y, si lo necesitas, te entregamos en Lobón sin coste para compras superiores a 50 €.",
    highlightCategorySlug: "montana",
    highlightCategoryLabel: "Montaña y outdoor",
    faqs: [
      {
        q: "¿Cuánto tardo en coche desde Lobón hasta vuestra tienda?",
        a: "Unos 10 minutos por la EX-209. Son 8 km en línea recta, sin tramos complicados y con aparcamiento gratuito al llegar a Puebla de la Calzada.",
      },
      {
        q: "¿Hacéis envíos a Lobón si no puedo desplazarme?",
        a: "Sí. Para clientes de Lobón confirmamos pedido por WhatsApp y entregamos en tu domicilio gratis a partir de 60 € de compra. Para importes menores, consulta gastos de envío al confirmar la reserva.",
      },
      {
        q: "¿Tenéis material para senderismo y BTT por la Sierra de San Serván?",
        a: "Por supuesto: botas de trekking, zapatillas trail running, mochilas de hidratación, bastones, frontales y ropa cortavientos. Trabajamos material de montaña y outdoor de +8000, nuestra marca técnica de referencia para sierra y trail.",
      },
      {
        q: "¿Puedo probar la talla antes de comprar si vengo desde Lobón?",
        a: "Sin compromiso. Mándanos un WhatsApp con los modelos que te interesan, te los apartamos, vienes a probártelos con calma y, si no son tu talla o no te convencen, no compras. Ese es el sentido de tener tienda física.",
      },
    ],
  },

  "talavera-la-real": {
    name: "Talavera la Real",
    slug: "talavera-la-real",
    region: "Badajoz · Tierra de Barros",
    distance: "A 12 km · 14 minutos en coche",
    distanceKm: 12,
    mapEmbedUrl: mapsRoute("Plaza de España, Talavera la Real, Badajoz"),
    description:
      "Talavera la Real está a un cuarto de hora de Puebla, junto a la base aérea y al aeropuerto de Badajoz. Muchos vecinos de Talavera vienen a Zona Sport por la cercanía con Puebla y porque les ofrecemos un trato personalizado que no encuentran en las grandes superficies de la capital. Vestimos a corredores que entrenan en los caminos vecinales hacia La Garrovilla y a jugadores de fútbol sala del polideportivo. Las fiestas patronales de San Roque y la Feria de Talavera son fechas en las que recibimos clientes buscando calzado cómodo para aguantar las largas jornadas de la feria.",
    areaContext:
      "Desde Talavera llegas a Puebla por la N-V y la EX-209 en unos 14 minutos sin atascos. Es una opción muy práctica: aparcamiento gratis a la puerta, atención cercana y precio competitivo frente a centros comerciales de Badajoz. Combinamos asesoramiento técnico con la confianza de la tienda de pueblo.",
    highlightCategorySlug: "running",
    highlightCategoryLabel: "Running",
    faqs: [
      {
        q: "¿Cuánto tiempo se tarda en coche desde Talavera la Real?",
        a: "Entre 12 y 15 minutos por la N-V hasta el desvío de Puebla. Son 12 km y, fuera de horas punta, llegas sin tráfico. Aparcamiento libre a la puerta de la tienda.",
      },
      {
        q: "¿Compensa venir desde Talavera teniendo Badajoz cerca?",
        a: "Para muchos clientes sí: trato personalizado, podemos pedir tu talla concreta sin esperar a que llegue a un gran almacén y te asesoramos en zapatilla de running con tu tipo de pisada. Y nos pillas más cerca y con aparcamiento gratis.",
      },
      {
        q: "¿Tenéis ropa técnica para entrenar al aire libre en verano?",
        a: "Sí. Trabajamos camisetas técnicas transpirables, mallas cortas, gorras y manguitos de protección solar de marcas como John Smith, +8000, Joma y Puma. Imprescindible cuando aprietan los 40 grados en Tierra de Barros.",
      },
      {
        q: "¿Hacéis envíos a Talavera la Real?",
        a: "Sí. Confirmando por WhatsApp organizamos la entrega a Talavera. Para compras superiores a 60 € el envío es gratuito; para importes menores, consulta el coste al hacer la reserva.",
      },
    ],
  },

  merida: {
    name: "Mérida",
    slug: "merida",
    region: "Badajoz · Comarca de Mérida",
    distance: "A 30 km · 25 minutos por la A-5",
    distanceKm: 30,
    mapEmbedUrl: mapsRoute("Plaza de España, Mérida"),
    description:
      "Mérida, capital de Extremadura y Patrimonio de la Humanidad, está a media hora de Puebla por la A-5 — un trayecto cómodo y rápido. Muchos emeritenses encuentran en Zona Sport lo que las cadenas de la capital no ofrecen: una selección cuidada, asesoramiento personalizado y precios competitivos. Atendemos a corredores que participan en la Media Maratón Romana de Mérida, a aficionados al pádel del Real Club de Tenis Mérida y a senderistas que recorren la Vía de la Plata. Si vives en Mérida y quieres salir un rato del bullicio del centro y de los centros comerciales, esta es tu tienda alternativa.",
    areaContext:
      "Desde Mérida llegas a Puebla por la A-5 dirección Badajoz en 25-30 minutos. Compensa el desplazamiento cuando buscas un modelo específico, asesoramiento técnico real o atención sin colas. Muchos clientes nos visitan los sábados por la mañana combinando con una escapada por la zona de la Vegas Bajas.",
    highlightCategorySlug: "padel",
    highlightCategoryLabel: "Pádel",
    faqs: [
      {
        q: "¿Cuánto se tarda desde Mérida hasta Puebla de la Calzada?",
        a: "Entre 25 y 30 minutos por la A-5 dirección Badajoz, salida 339 hacia Puebla. Son 30 km de autovía cómoda. Aparcamiento gratis al llegar a la tienda.",
      },
      {
        q: "¿Merece la pena venir desde Mérida en lugar de comprar en la capital?",
        a: "Si buscas asesoramiento personalizado, marcas técnicas que no siempre encuentras en cadenas y precio justo, sí. Muchos clientes de Mérida son ya habituales y nos recomiendan precisamente por el trato y la posibilidad de pedir tallas específicas en pocos días.",
      },
      {
        q: "¿Tenéis stock para entrenamientos de la Media Maratón Romana?",
        a: "Sí. En las semanas previas a la prueba reforzamos stock de zapatillas de tirada y entrenamiento, camisetas técnicas, gorras y geles deportivos. Pregunta por WhatsApp antes de venir si quieres asegurar un modelo concreto.",
      },
      {
        q: "¿Puedo reservar online y recoger viniendo desde Mérida?",
        a: "Sí. Te confirmamos disponibilidad por WhatsApp en cuestión de minutos, te apartamos hasta 48 horas y vienes cuando te venga bien. Es la forma más segura de no perder el viaje.",
      },
      {
        q: "¿Hacéis envíos a Mérida si no quiero desplazarme?",
        a: "Sí. Para Mérida organizamos envío a domicilio. Gratuito a partir de 60 € de compra; para importes menores, consulta tarifa al hacer el pedido por WhatsApp.",
      },
    ],
  },

  badajoz: {
    name: "Badajoz",
    slug: "badajoz",
    region: "Badajoz · Tierra de Barros · Frontera con Portugal",
    distance: "A 30 km · 25 minutos por la A-5",
    distanceKm: 30,
    mapEmbedUrl: mapsRoute("Plaza de España, Badajoz"),
    description:
      "Badajoz capital concentra la mayor parte de la oferta deportiva de la provincia, pero en Zona Sport tenemos una propuesta diferente para los pacenses cansados de las grandes superficies: trato directo, marcas técnicas seleccionadas y precios competitivos sin las prisas de un centro comercial. Vienen runners de los clubes pacenses (Atletismo Decano, Núcleo Atletismo), aficionados al pádel de las urbanizaciones de Las Vaguadas y Cerro Gordo, y senderistas que conocen la Sierra de San Pedro. La cercanía con Portugal hace que también recibamos clientes portugueses de Elvas y Campo Maior buscando marcas españolas a buen precio.",
    areaContext:
      "Desde Badajoz capital llegas en 25-30 minutos por la A-5 dirección Mérida, salida hacia Puebla. Compensa especialmente si vives en la zona este de la ciudad (San Roque, Pardaleras, Cerro Gordo). Atendemos en castellano y entendemos portugués para los clientes que llegan desde la raya. Aparcamiento gratis siempre.",
    highlightCategorySlug: "calzado",
    highlightCategoryLabel: "Calzado deportivo",
    faqs: [
      {
        q: "¿Cuánto tiempo se tarda desde Badajoz hasta Puebla de la Calzada?",
        a: "Entre 25 y 30 minutos por la A-5 dirección Mérida, salida 339 hacia Puebla. Son 30 km de autovía sin complicaciones. En hora punta puede subir a 35 minutos.",
      },
      {
        q: "¿Merece la pena salir de Badajoz capital para venir a una tienda de pueblo?",
        a: "Para muchos clientes habituales sí: encuentran asesoramiento técnico real, marcas que no siempre están en grandes cadenas y la posibilidad de pedirles una talla concreta sin esperas eternas. Y el aparcamiento es gratis y a la puerta.",
      },
      {
        q: "Atendéis também em português? Sou de Elvas e gostaria de saber.",
        a: "Sí, atendemos en castellano y entendemos perfectamente el portugués hablado. Muchos de nuestros clientes vienen de Elvas, Campo Maior y Olivenza buscando marcas españolas a precios competitivos. Podemos facturar a empresas portuguesas con NIF intracomunitario.",
      },
      {
        q: "¿Hacéis envíos a Badajoz capital?",
        a: "Sí. Coordinamos envío a domicilio en Badajoz capital con entrega en 24-48 horas tras confirmar el pedido por WhatsApp. Gratis para compras desde 60 €.",
      },
      {
        q: "¿Tenéis zapatillas de running con asesoramiento de pisada?",
        a: "Sí. Analizamos tu pisada visualmente y por desgaste de tu calzado actual, hablamos de tus kilómetros y objetivos y te recomendamos la zapatilla acorde a tu pisada y tus objetivos. Sin compromiso de compra.",
      },
    ],
  },
};

/** Validación en tiempo de compilación: el slug del objeto coincide con slugifyEs(name). */
for (const slug of LANDING_SLUGS) {
  const expected = slugifyEs(LANDINGS[slug].name, { keepStopwords: true });
  // Permitimos variantes manuales documentadas (p.ej. "lobon" sin tilde).
  if (expected !== slug && !["lobon", "merida"].includes(slug)) {
    // eslint-disable-next-line no-console
    console.warn(`[landings] slug "${slug}" no coincide con slugifyEs("${LANDINGS[slug].name}") = "${expected}"`);
  }
}
