/**
 * Banco de plantillas de descripción de producto para sembrar en DB.
 *
 * Cada plantilla tiene `categorySlug` que matchea con Category.slug. Cuando
 * el admin pulsa "Generar descripción" en /admin/productos/[id], se elige
 * una plantilla aleatoria de las que coincidan con la categoría del
 * producto (con fallback a `default`). El body admite placeholders:
 *   {brand}    → nombre de la marca
 *   {color}    → nombre del color del producto
 *   {name}     → nombre completo del producto
 *   {category} → nombre legible de la categoría
 *
 * Estrategia para producir ~190 plantillas con variedad: por cada
 * categoría definimos 3 intros + 2 cuerpos + 2 cierres. La combinatoria
 * da 12 por categoría. Con 18 categorías obtenemos ~216 plantillas
 * únicas (algunas duplicadas en slug se filtran con upsert).
 *
 * Las plantillas están conscientemente escritas para sonar naturales en
 * español comercial (España) sin caer en clichés de IA. Evitamos marcas
 * prohibidas (Nike, Adidas) y mantenemos el tono cercano de Zona Sport.
 */

export interface DescriptionTemplateInput {
  slug: string;
  label: string;
  categorySlug: string;
  body: string;
  metaShort?: string;
  position: number;
}

interface CategoryPieces {
  /** Identificador de categoría (matchea slug del Category en DB). */
  slug: string;
  /** Etiqueta legible para el admin (mostrada en el selector). */
  label: string;
  intros: string[];
  bodies: string[];
  outros: string[];
  /** Meta description corta (155 chars max). El admin la edita después. */
  meta: string[];
}

const CATEGORIES: CategoryPieces[] = [
  // -------------------- ROPA TÉCNICA --------------------
  {
    slug: "camisetas",
    label: "Camisetas",
    intros: [
      "Camiseta deportiva {color} pensada para entrenar sin distracciones.",
      "Manga corta técnica {color} con tejido transpirable y secado rápido.",
      "Camiseta running/training {color} de {brand}.",
    ],
    bodies: [
      "El tejido evacúa el sudor y mantiene la piel seca; las costuras planas evitan roces y la trasera tiene corte ergonómico que acompaña el movimiento.",
      "Construcción ligera con paneles de malla en zonas calientes y tratamiento anti-olor que aguanta entrenamientos seguidos.",
    ],
    outros: [
      "Una camiseta polivalente: gimnasio, running o uso urbano sin perder técnica.",
      "Para sumar al cajón sin pensarlo dos veces.",
    ],
    meta: [
      "Camiseta deportiva {color} de {brand}. Tejido transpirable y secado rápido. Envío 24/48 h.",
      "Manga corta técnica {color} {brand}. Costuras planas, secado rápido. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "camiseta-mlarga",
    label: "Camiseta manga larga",
    intros: [
      "Camiseta de manga larga {color} para entrenar con frío.",
      "Manga larga técnica {color} con corte slim y abrigo medio.",
      "Camiseta térmica {color} de {brand} para entretiempo y running invernal.",
    ],
    bodies: [
      "Tejido elástico bidireccional con tacto suave por el interior. Pulgar agujereado en los puños para fijar la manga durante la carrera.",
      "Compresión ligera que activa la circulación sin apretar. Cuello redondo reforzado y bajo extendido para que no se suba con el movimiento.",
    ],
    outros: [
      "Ideal para entrenos en exterior cuando el termómetro baja de los 15 °C.",
      "Tu primera capa en otoño e invierno. Lavado a máquina y secado rápido.",
    ],
    meta: [
      "Camiseta manga larga {color} {brand}. Térmica, transpirable. Envío 24/48 h en toda España.",
      "Manga larga técnica {color} {brand} para frío. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "polos",
    label: "Polos",
    intros: [
      "Polo deportivo {color} con cuello reforzado.",
      "Polo técnico {color} para pádel, tenis o casual.",
      "Polo manga corta {color} de {brand}.",
    ],
    bodies: [
      "Tejido piqué transpirable con tacto suave que no se deforma con el uso. Botones reforzados y bajo recto que admite por dentro o por fuera.",
      "Construcción técnica que respira en pista y mantiene buena imagen fuera de ella. Costuras planas y trasera ligeramente alargada.",
    ],
    outros: [
      "Polivalente entre la pista y el día a día.",
      "Una opción cómoda para llevar a entrenamientos y quedarse después.",
    ],
    meta: [
      "Polo deportivo {color} {brand}. Tejido piqué transpirable. Disponible en Zona Sport.",
      "Polo técnico {color} {brand} para pádel y tenis. Envío 24/48 h.",
    ],
  },
  {
    slug: "pantalones",
    label: "Pantalones",
    intros: [
      "Pantalón largo {color} de tejido técnico ligero.",
      "Pantalón deportivo {color} con corte recto y cintura elástica.",
      "Pantalón {color} de {brand} para entrenar y para el día a día.",
    ],
    bodies: [
      "Cintura con cordón ajustable y bolsillos laterales con cremallera. Trasera con un bolsillo extra para llaves o tarjetas. Bajo recto sin elástico para acabado limpio.",
      "Tejido ligero que respira en sala de pesas y aguanta el roce de barras y máquinas. Bolsillos profundos y costuras reforzadas en zonas de tensión.",
    ],
    outros: [
      "Pensado tanto para entrenar como para estar cómodo en casa.",
      "El pantalón que te pones cuando no quieres pensar qué pantalón ponerte.",
    ],
    meta: [
      "Pantalón deportivo {color} {brand}. Tejido técnico, bolsillos con cremallera. Envío 24/48 h.",
      "Pantalón largo {color} {brand} para entrenar y día a día. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "mallas",
    label: "Mallas",
    intros: [
      "Mallas largas {color} de compresión ligera.",
      "Mallas técnicas {color} con cintura alta y bolsillos laterales.",
      "Leggings deportivos {color} de {brand} con tejido elástico.",
    ],
    bodies: [
      "Compresión muscular que activa la circulación sin apretar. Tejido squat-proof opaco en cualquier posición, con bolsillos laterales para el móvil.",
      "Cintura ancha de doble capa que sujeta sin marcar. Tiro alto y costuras planas anti-rozadura para que no te enteres de que las llevas.",
    ],
    outros: [
      "De entrenamiento a clase de yoga sin cambiar de outfit.",
      "Las mallas que se quedan en el bolso de gym todo el año.",
    ],
    meta: [
      "Mallas deportivas {color} {brand}. Compresión, opacidad squat-proof. Envío 24/48 h.",
      "Leggings técnicos {color} {brand} cintura alta. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "shorts",
    label: "Shorts",
    intros: [
      "Shorts deportivos {color} ligeros y transpirables.",
      "Pantalón corto {color} con tejido seca-rápido.",
      "Shorts técnicos {color} de {brand} para entrenar en verano.",
    ],
    bodies: [
      "Cintura elástica con cordón ajustable, bolsillos laterales y trasero con cremallera. Slip interior opcional según modelo.",
      "Tejido fino que respira incluso a 35 °C. Bajos rectos y largura justa por encima de la rodilla para libertad total.",
    ],
    outros: [
      "Tu uniforme de running y gimnasio cuando aprieta el calor.",
      "Compacto en la mochila, perfecto para llevar siempre encima.",
    ],
    meta: [
      "Shorts deportivos {color} {brand}. Tejido ligero, bolsillos con cremallera. Envío 24/48 h.",
      "Pantalón corto técnico {color} {brand}. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "bermuda-moda",
    label: "Bermudas",
    intros: [
      "Bermuda {color} en algodón con caída urbana.",
      "Pantalón bermuda {color} con corte recto a la rodilla.",
      "Bermuda {color} de {brand} para verano de ciudad.",
    ],
    bodies: [
      "Cintura con cordón, bolsillos laterales y trasera con bolsillos parcheados. Largura justa a la altura de la rodilla.",
      "Algodón cómodo con un toque de elastano para no apretar. Cinco bolsillos y trabillas para cinturón si te apetece subirla.",
    ],
    outros: [
      "Una bermuda que combina con todo. Lavado a máquina sin complicaciones.",
      "De pasarela urbana sin pretensiones.",
    ],
    meta: [
      "Bermuda {color} {brand}. Algodón, corte urbano. Envío 24/48 h.",
      "Pantalón corto bermuda {color} {brand}. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "sudaderas",
    label: "Sudaderas",
    intros: [
      "Sudadera {color} con capucha y bolsillo canguro.",
      "Sudadera deportiva {color} en felpa cepillada por el interior.",
      "Hoodie {color} de {brand} para entrenar y vestir.",
    ],
    bodies: [
      "Felpa de gramaje medio que abriga sin pesar. Capucha con cordón ajustable, bolsillo canguro y puños y bajo en rib elástico.",
      "Costuras reforzadas en los hombros y refuerzo en el bolsillo canguro para que no se descosa al meter las manos cien veces.",
    ],
    outros: [
      "La sudadera de fondo de armario que vuelves a poner cada semana.",
      "Para entrenar, salir o tirarte en el sofá. Especialmente esto último.",
    ],
    meta: [
      "Sudadera {color} {brand} con capucha. Felpa cómoda, costuras reforzadas. Envío 24/48 h.",
      "Hoodie deportivo {color} {brand}. Disponible en Zona Sport — entrega rápida.",
    ],
  },
  {
    slug: "traje-jogging",
    label: "Chándal",
    intros: [
      "Chándal completo {color} chaqueta + pantalón a juego.",
      "Conjunto deportivo {color} con sudadera con cremallera y pantalón largo.",
      "Tracksuit {color} de {brand} para entrenar y para estar por casa.",
    ],
    bodies: [
      "Chaqueta con cremallera entera, bolsillos laterales y puños en rib. Pantalón con cintura elástica con cordón y bolsillos con cremallera para evitar pérdidas durante la carrera.",
      "Tejido suave de doble cara: cara externa con tacto seco y cara interna afelpada para los días fríos. Bajos con cremallera para meter zapatillas voluminosas.",
    ],
    outros: [
      "Un dos piezas resolutivo: te lo pones y ya estás listo para entrenar.",
      "El uniforme oficial de los días que necesitan ir cómodos sin renunciar al estilo.",
    ],
    meta: [
      "Chándal completo {color} {brand}. Chaqueta + pantalón a juego. Envío 24/48 h.",
      "Conjunto deportivo {color} {brand}. Tejido cómodo, bolsillos. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "traje-entrenamiento-poliester",
    label: "Conjunto entrenamiento",
    intros: [
      "Conjunto entrenamiento {color} en poliéster técnico.",
      "Equipación de entrenamiento {color} chaqueta + pantalón.",
      "Tracksuit técnico {color} de {brand}.",
    ],
    bodies: [
      "Poliéster ligero que seca rápido y no acumula peso con el sudor. Chaqueta con cuello alto y cremallera media; pantalón con bajos rectos.",
      "Costuras planas en zonas de roce y refuerzos en codos y rodillas. Pensado para sesiones intensas o calentamiento previo a la competición.",
    ],
    outros: [
      "Para el calentamiento, la sesión y el regreso a casa.",
      "El conjunto técnico de los que entrenan en serio.",
    ],
    meta: [
      "Conjunto entrenamiento {color} {brand}. Poliéster técnico. Envío 24/48 h.",
      "Equipación deportiva {color} {brand}. Disponible en Zona Sport.",
    ],
  },
  // -------------------- OUTDOOR / MONTAÑA --------------------
  {
    slug: "abrigos",
    label: "Abrigos",
    intros: [
      "Abrigo técnico {color} con relleno aislante.",
      "Chaqueta abrigo {color} para frío seco y temperaturas bajo cero.",
      "Parka {color} de {brand} con membrana impermeable y costuras selladas.",
    ],
    bodies: [
      "Relleno sintético de gramaje alto que conserva el calor incluso húmedo. Capucha desmontable con visera reforzada y cordón de ajuste.",
      "Membrana impermeable + transpirable que evita el efecto sauna. Bolsillos laterales con cremallera estanca, bolsillo interior y refuerzos en hombros para mochila.",
    ],
    outros: [
      "Para días de viento, nieve o esos amaneceres que te pillan sin guantes.",
      "Una chaqueta que dura años y se nota desde la primera puesta.",
    ],
    meta: [
      "Abrigo técnico {color} {brand}. Relleno cálido, impermeable. Envío 24/48 h.",
      "Parka invernal {color} {brand}. Membrana impermeable. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "anorack-parka",
    label: "Anorak / parka",
    intros: [
      "Anorak {color} con capucha técnica.",
      "Parka {color} para senderismo y trekking.",
      "Chaqueta outdoor {color} de {brand} cortavientos e impermeable.",
    ],
    bodies: [
      "Tejido ligero con tratamiento DWR que repele el agua sin sentirse plastificado. Capucha con visera y ajuste por cordones.",
      "Cremallera frontal de doble carro para regular ventilación. Bolsillos laterales accesibles con mochila puesta y compartimento interior con seguro.",
    ],
    outros: [
      "Pensado para rutas largas y cambios de tiempo imprevistos.",
      "Lo doblas en el fondo de la mochila y olvidas que lo llevas hasta que lo necesitas.",
    ],
    meta: [
      "Anorak técnico {color} {brand}. Impermeable, transpirable. Envío 24/48 h.",
      "Parka outdoor {color} {brand} con capucha. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "anorack-treking",
    label: "Anorak trekking",
    intros: [
      "Anorak trekking {color} ligero y plegable.",
      "Cortavientos {color} con tejido elástico y costuras termoselladas.",
      "Chaqueta trekking {color} de {brand} con membrana 10k.",
    ],
    bodies: [
      "Construcción minimalista, pesa apenas 300 g y cabe en su propio bolsillo. Reflectantes en mangas y espalda para visibilidad en senderos al atardecer.",
      "Tejido stretch que se adapta a la zancada sin restar libertad. Bajo elástico con regulador y puños con velcro para sellar bien con guantes.",
    ],
    outros: [
      "Ese anorak que decides llevar en cualquier salida porque no estorba.",
      "De vías ferratas a paseos otoñales por la ciudad.",
    ],
    meta: [
      "Anorak trekking {color} {brand}. Ligero, impermeable. Envío 24/48 h.",
      "Cortavientos outdoor {color} {brand}. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "anorack-cazadora",
    label: "Cazadora",
    intros: [
      "Cazadora {color} ligera para entretiempo.",
      "Chaqueta cazadora {color} con corte casual.",
      "Bomber técnica {color} de {brand}.",
    ],
    bodies: [
      "Forro fino que abriga lo justo y bajos elásticos en rib. Cremallera frontal con tirador metálico y bolsillos delanteros con clip.",
      "Tejido resistente al agua ligera (lluvia fina, niebla) sin perder transpirabilidad. Corte ajustado por la espalda y cintura.",
    ],
    outros: [
      "Combina con vaquero, chino o pantalón técnico.",
      "Una capa intermedia que vale para casi cualquier momento del año.",
    ],
    meta: [
      "Cazadora {color} {brand}. Ligera, casual deportiva. Envío 24/48 h.",
      "Bomber técnica {color} {brand}. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "chubasquero",
    label: "Chubasquero",
    intros: [
      "Chubasquero {color} impermeable y plegable.",
      "Chaqueta de lluvia {color} con costuras termoselladas.",
      "Impermeable {color} de {brand} con membrana transpirable.",
    ],
    bodies: [
      "Tejido con tratamiento DWR + membrana interior que aguanta chubascos seguidos sin que entre humedad. Capucha de tres ajustes y bajos con cordón.",
      "Costuras termoselladas en zonas críticas. Cremallera frontal con solapa anti-viento y puños con velcro para no dejar entrar agua por las muñecas.",
    ],
    outros: [
      "El chubasquero que tienes siempre en el coche o la mochila.",
      "Pliega pequeñísimo y aparece justo cuando hace falta.",
    ],
    meta: [
      "Chubasquero {color} {brand}. Impermeable, transpirable. Envío 24/48 h.",
      "Chaqueta lluvia {color} {brand}. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "pantalon-aventura",
    label: "Pantalón aventura",
    intros: [
      "Pantalón aventura {color} con tejido resistente y elástico.",
      "Pantalón trekking {color} con bolsillos multifunción.",
      "Pantalón outdoor {color} de {brand} para rutas largas.",
    ],
    bodies: [
      "Tejido stretch con refuerzos en rodillas y trasero. Bolsillos laterales con velcro, cargo en muslo y trasero abotonado.",
      "Cintura ajustable con cinturón integrado. Bajos regulables con cordón para entallarlos sobre la bota y evitar piedras o tierra.",
    ],
    outros: [
      "Diseñado para senderos largos, escaladas suaves y vivacs improvisados.",
      "El pantalón que aguanta la mochila, las cuerdas y los abrazos del crash pad.",
    ],
    meta: [
      "Pantalón aventura {color} {brand}. Trekking, multibolsillos. Envío 24/48 h.",
      "Pantalón outdoor {color} {brand} resistente. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "pantalon-nieve",
    label: "Pantalón nieve",
    intros: [
      "Pantalón de nieve {color} aislante y resistente.",
      "Pantalón esquí/snow {color} con membrana 10k/10k.",
      "Pantalón nieve {color} de {brand} para temperaturas extremas.",
    ],
    bodies: [
      "Relleno sintético en zonas críticas y refuerzos en bajos para resistir el roce de las botas. Tirantes desmontables y peto delantero.",
      "Costuras termoselladas y polainas internas con goma anti-derrape. Bolsillos amplios para skipass y guantes.",
    ],
    outros: [
      "Para una temporada entera de nieve sin pasar frío ni mojarse.",
      "Equipación pensada para -10 °C reales con viento.",
    ],
    meta: [
      "Pantalón nieve {color} {brand}. Aislante, impermeable 10k. Envío 24/48 h.",
      "Pantalón esquí {color} {brand}. Disponible en Zona Sport.",
    ],
  },
  // -------------------- BAÑO --------------------
  {
    slug: "banadores",
    label: "Bañadores",
    intros: [
      "Bañador {color} de secado rápido.",
      "Bañador deportivo {color} ligero y cómodo.",
      "Bermuda baño {color} de {brand}.",
    ],
    bodies: [
      "Tejido ultraligero que no acumula peso ni agua. Slip interior de malla y cintura con cordón anti-deslizante.",
      "Estampado discreto y dos bolsillos laterales con drenaje. Tratamiento anti-cloro y resistencia al sol.",
    ],
    outros: [
      "Piscina, playa o jacuzzi. Listo en cualquier escenario.",
      "Cabe doblado en el bolsillo del pantalón si te apetece improvisar baño.",
    ],
    meta: [
      "Bañador deportivo {color} {brand}. Secado rápido. Envío 24/48 h.",
      "Bermuda baño {color} {brand}. Disponible en Zona Sport.",
    ],
  },
  // -------------------- CALZADO --------------------
  {
    slug: "zapatilla",
    label: "Zapatillas (genérico)",
    intros: [
      "Zapatilla {color} versátil para deporte y día a día.",
      "Sneaker {color} con mediasuela amortiguada.",
      "Calzado deportivo {color} de {brand}.",
    ],
    bodies: [
      "Upper de malla transpirable y refuerzos en talón y punta. Lengüeta acolchada y plantilla extraíble que permite usar plantillas personalizadas.",
      "Mediasuela EVA con respuesta equilibrada entre amortiguación y impulso. Suela de goma con dibujo profundo para buen agarre en seco y mojado.",
    ],
    outros: [
      "Una zapatilla resolutiva para entrenos generales y uso diario.",
      "El comodín del armario que sirve para todo.",
    ],
    meta: [
      "Zapatilla deportiva {color} {brand}. Amortiguada, transpirable. Envío 24/48 h.",
      "Sneaker {color} {brand}. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "bota-alta",
    label: "Botas altas",
    intros: [
      "Bota alta {color} con caña reforzada.",
      "Bota deportiva {color} estilo retro con cuello acolchado.",
      "Sneaker mid {color} de {brand}.",
    ],
    bodies: [
      "Upper de piel/sintético con refuerzos cosidos. Cordones planos y ojales metálicos que aguantan tensión sin deformarse.",
      "Plantilla acolchada extraíble y entresuela ligera. Suela de goma con dibujo urbano que agarra bien sobre suelo seco.",
    ],
    outros: [
      "Para outfits informales que piden algo más que una zapatilla baja.",
      "Una bota cómoda que mantiene el aire deportivo.",
    ],
    meta: [
      "Bota alta {color} {brand}. Caña acolchada, cordones planos. Envío 24/48 h.",
      "Sneaker mid {color} {brand}. Disponible en Zona Sport.",
    ],
  },
  // -------------------- ACCESORIOS / COMPLEMENTOS --------------------
  {
    slug: "complementos",
    label: "Complementos",
    intros: [
      "Accesorio deportivo {color} compacto y resistente.",
      "Complemento {color} para deporte y día a día.",
      "Pieza esencial {color} de {brand}.",
    ],
    bodies: [
      "Construcción robusta con materiales duraderos y acabados cuidados. Tamaño práctico que cabe en cualquier mochila o cajón del armario.",
      "Diseñado para uso intensivo: aguanta sudor, lluvia y golpes sin perder forma ni función.",
    ],
    outros: [
      "Pequeño detalle, gran diferencia.",
      "Un accesorio que se nota cuando lo tienes y se echa de menos cuando no.",
    ],
    meta: [
      "Accesorio deportivo {color} {brand}. Resistente y compacto. Envío 24/48 h.",
      "Complemento {color} {brand}. Disponible en Zona Sport.",
    ],
  },
  // -------------------- FALLBACK GENÉRICO --------------------
  {
    slug: "default",
    label: "Genérico (fallback)",
    intros: [
      "{name} {color}: equipación técnica de {brand}.",
      "Pieza {color} de la temporada en {brand}.",
      "Producto deportivo {color} pensado para rendir.",
    ],
    bodies: [
      "Materiales seleccionados con criterio técnico y acabados duraderos. Construcción que aguanta entrenamientos repetidos sin perder forma.",
      "Cuidado del detalle en costuras, ajuste y comportamiento del tejido. Pensado para que dure varias temporadas con uso real.",
    ],
    outros: [
      "Una buena referencia para sumar al kit deportivo.",
      "Te lo asesoramos en tienda si necesitas elegir entre tallas o variantes.",
    ],
    meta: [
      "{name} {color} {brand}. Equipación deportiva técnica. Envío 24/48 h en España.",
      "Producto deportivo {color} {brand}. Disponible en Zona Sport — atención por WhatsApp.",
    ],
  },
];

/**
 * Genera ~12 plantillas por categoría combinando intros × bodies × outros.
 * Total cubierto: ~190–210 plantillas únicas tras dedupe por slug.
 */
function buildTemplates(): DescriptionTemplateInput[] {
  const out: DescriptionTemplateInput[] = [];
  for (const cat of CATEGORIES) {
    let n = 0;
    for (let i = 0; i < cat.intros.length; i++) {
      for (let j = 0; j < cat.bodies.length; j++) {
        for (let k = 0; k < cat.outros.length; k++) {
          n++;
          const body = `${cat.intros[i]} ${cat.bodies[j]} ${cat.outros[k]}`;
          const metaShort = cat.meta[n % cat.meta.length];
          out.push({
            slug: `${cat.slug}-v${n.toString().padStart(2, "0")}`,
            label: `${cat.label} · v${n}`,
            categorySlug: cat.slug,
            body,
            metaShort,
            position: n,
          });
        }
      }
    }
  }
  return out;
}

export const DESCRIPTION_TEMPLATES: DescriptionTemplateInput[] = buildTemplates();
