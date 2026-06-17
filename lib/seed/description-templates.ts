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
 * Estrategia: por cada categoría definimos varias intros + bodies + outros.
 * La combinatoria intros × bodies × outros produce la variedad. Con 4 intros,
 * 3 bodies y 2 outros salen 24 plantillas por categoría, y cada body
 * concatena varias frases para que la descripción final sea un poco más
 * larga (≈4-6 frases) sin que 600 productos lean idénticos.
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
      "{name}: camiseta {color} ligera de {brand} para el día a día y el entrenamiento.",
    ],
    bodies: [
      "El tejido evacúa el sudor y mantiene la piel seca durante toda la sesión. Las costuras planas evitan roces en hombros y costados, y la trasera tiene un corte ergonómico que acompaña el movimiento sin tirar. Es ligera de verdad: la notas en la mochila pero no encima.",
      "Construcción ligera con paneles de malla en las zonas que más calientan y un tratamiento anti-olor que aguanta varios entrenamientos seguidos. El cuello redondo mantiene la forma lavado tras lavado y el bajo recto no se sube al levantar los brazos. Tacto suave desde la primera puesta.",
      "Tejido técnico de gramaje medio que respira en sala y seca rápido al aire. El ajuste regular deja libertad de movimiento sin quedar holgado, las mangas caen a la altura justa y el acabado mate disimula bien el sudor. Pensada para usarla muchas veces sin que pierda forma ni color.",
    ],
    outros: [
      "Una camiseta polivalente: gimnasio, running o uso urbano sin perder técnica.",
      "Para sumar al cajón sin pensarlo dos veces; lavado a máquina y lista otra vez.",
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
      "{name}: primera capa {color} de {brand} para los días que el termómetro baja.",
    ],
    bodies: [
      "Tejido elástico bidireccional con tacto suave por el interior que abriga sin pesar. Los puños llevan agujero para el pulgar y fijan la manga durante la carrera, y el bajo extendido no se sube al moverte. Una capa que cunde de octubre a marzo.",
      "Compresión ligera que activa la circulación sin apretar y mantiene el calor cerca del cuerpo. Cuello redondo reforzado, costuras planas anti-rozadura y bajo un poco más largo por detrás para tapar bien la espalda. Seca rápido y no acumula humedad.",
      "Interior cepillado que retiene el calor corporal y exterior con tacto seco que evapora el sudor. El corte sigue la silueta sin marcar y deja sitio para una segunda capa encima si aprieta el frío. Versátil para correr, calentar o ir por la calle.",
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
      "{name}: polo {color} de {brand} que pasa de la pista a la calle sin cambiarse.",
    ],
    bodies: [
      "Tejido piqué transpirable con tacto suave que no se deforma con el uso ni pierde el color al lavarlo. Botones reforzados, cuello que aguanta la forma y bajo recto que admite por dentro o por fuera. Mantiene buena imagen durante todo el día.",
      "Construcción técnica que respira en pista y resulta cómoda fuera de ella. Costuras planas en hombros, trasera ligeramente alargada para que no se suba al agacharte y tira de cuello que recupera bien tras cada partido. Un polo que rinde y viste.",
      "Piqué ligero con un punto de elastano que da movilidad en el saque y el revés. El cuello con tapeta de tres botones queda recto, las mangas no aprietan el bíceps y el tejido seca rápido tras el calentón. Cómodo de llevar horas seguidas.",
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
      "{name}: pantalón {color} de {brand} cómodo dentro y fuera del gimnasio.",
    ],
    bodies: [
      "Cintura con cordón ajustable y bolsillos laterales con cremallera para no perder nada al moverte. Lleva un bolsillo trasero extra para llaves o tarjetas y el bajo recto sin elástico deja un acabado limpio. Tejido que respira en sala de pesas y no estorba en sentadilla.",
      "Tejido ligero que aguanta el roce de barras y máquinas sin desgastarse, con costuras reforzadas en las zonas de más tensión. Bolsillos profundos donde el móvil no se cae, tiro medio cómodo y caída recta que estiliza. Pensado para entrenar y para estar por casa igual de a gusto.",
      "Punto técnico con algo de elastano que se mueve contigo en cada repetición y recupera la forma sin dar de sí. Cintura de doble ajuste con goma y cordón, bolsillos seguros y tobillo limpio que cae bien sobre la zapatilla. Cómodo del calentamiento al café de después.",
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
      "{name}: mallas {color} de {brand} que se quedan en el bolso de gym todo el año.",
    ],
    bodies: [
      "Compresión muscular que activa la circulación sin apretar de más y sujeta donde hace falta. El tejido es squat-proof, opaco en cualquier postura, y los bolsillos laterales tragan el móvil sin que baile. Costuras planas que no rozan ni en sesiones largas.",
      "Cintura ancha de doble capa que sujeta sin marcar y se queda en su sitio al saltar o correr. Tiro alto, tejido elástico de recuperación rápida y acabado mate que sienta bien. Tan cómodas que te olvidas de que las llevas hasta que te las quitas.",
      "Punto técnico de cuatro direcciones que sigue cada zancada y vuelve a su forma sin deformarse en la rodilla. Cintura cómoda sin costura central, refuerzo interior y un bolsillo trasero para la tarjeta. De entrenamiento a recados sin cambiarte.",
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
      "{name}: shorts {color} de {brand} para cuando aprieta el calor.",
    ],
    bodies: [
      "Cintura elástica con cordón ajustable, bolsillos laterales y trasero con cremallera para llevar lo justo sin que se caiga. El slip interior de malla da soporte y el tejido fino respira incluso a pleno sol. Bajos rectos y largura justa por encima de la rodilla.",
      "Tejido ultraligero que seca en un momento tras el sprint o el sudor y no se pega a la pierna. Bolsillos accesibles en marcha, costuras planas que no rozan y bajo limpio. Compacto en la mochila para llevarlo siempre encima.",
      "Punto técnico con algo de elasticidad que se mueve en cada zancada y mantiene la frescura. Cintura cómoda de doble ajuste, refuerzo en la entrepierna y reflectante discreto para correr al atardecer. Tu uniforme de running y gimnasio en verano.",
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
      "{name}: bermuda {color} de {brand} que combina con todo en verano.",
    ],
    bodies: [
      "Cintura con cordón, bolsillos laterales y trasera con bolsillos parcheados para llevar cartera y móvil sin bulto. La largura cae justo a la rodilla y el algodón resulta fresco durante todo el día. Una bermuda fácil de combinar con cualquier camiseta.",
      "Algodón cómodo con un toque de elastano para no apretar al sentarse, cinco bolsillos y trabillas para cinturón si te apetece subirla. El tejido aguanta bien los lavados y mantiene el color. De pasarela urbana sin pretensiones.",
      "Tejido de tacto suave y caída limpia, con costuras resistentes y bajo recto sin deshilachar. Bolsillos amplios, cierre con botón y cremallera y un punto de stretch que da libertad. Cómoda para el paseo, la terraza y el plan improvisado.",
    ],
    outros: [
      "Una bermuda que combina con todo. Lavado a máquina sin complicaciones.",
      "De pasarela urbana sin pretensiones, lista para el verano.",
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
      "{name}: sudadera {color} de {brand} de fondo de armario para todo el año.",
    ],
    bodies: [
      "Felpa de gramaje medio que abriga sin pesar y se siente suave nada más ponerla. Capucha con cordón ajustable, bolsillo canguro amplio y puños y bajo en rib elástico que sellan el calor. Una sudadera que vuelves a poner cada semana.",
      "Costuras reforzadas en los hombros y refuerzo en el bolsillo canguro para que no se descosa al meter las manos cien veces. El interior cepillado mantiene el calor, el corte es holgado pero no enorme y el tejido recupera la forma lavado tras lavado. Cómoda para entrenar, salir o tirarte en el sofá.",
      "Tejido cálido de tacto agradable, capucha forrada que aguanta la lluvia fina y cordones con tope metálico que no se deshilachan. Bolsillo delantero para las manos y el móvil, hombros caídos para libertad de movimiento y bajo elástico que no se sube. La capa media perfecta del entretiempo.",
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
      "{name}: chándal {color} de {brand}, dos piezas resolutivas a juego.",
    ],
    bodies: [
      "Chaqueta con cremallera entera, bolsillos laterales y puños en rib que sellan el frío. El pantalón lleva cintura elástica con cordón y bolsillos con cremallera para no perder nada en marcha, y el bajo cae limpio sobre la zapatilla. Te lo pones y ya estás listo.",
      "Tejido suave de doble cara: la externa con tacto seco y la interna afelpada para los días fríos. Bajos del pantalón con cremallera para meter zapatillas voluminosas, cuello alto que abriga y corte cómodo que deja moverse. El uniforme oficial de ir cómodo sin renunciar al estilo.",
      "Conjunto a juego de gramaje medio que abriga sin agobiar, con costuras resistentes y cremalleras que corren bien. La chaqueta entalla lo justo, el pantalón tiene tiro cómodo y trabillas, y ambas piezas mantienen color y forma con el uso. De calentar a estar en casa.",
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
      "{name}: equipación {color} de {brand} para los que entrenan en serio.",
    ],
    bodies: [
      "Poliéster ligero que seca rápido y no acumula peso con el sudor, ideal para el calentamiento y la sesión. Chaqueta con cuello alto y cremallera media, pantalón con bajos rectos y costuras planas en las zonas de roce. Acompaña sin estorbar de principio a fin.",
      "Refuerzos en codos y rodillas y costuras planas pensadas para sesiones intensas o el previo a la competición. El tejido evacúa la humedad, mantiene la temperatura en la transición y recupera la forma tras cada uso. Un conjunto técnico que cunde toda la temporada.",
      "Tejido técnico transpirable de tacto seco, con paneles que ventilan en la espalda y puños ajustados que no dejan entrar el aire. La chaqueta entalla para correr, el pantalón se mueve en cada zancada y todo seca rápido al aire. Del calentamiento al regreso a casa.",
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
  // -------------------- FÚTBOL --------------------
  {
    slug: "futbol",
    label: "Fútbol",
    intros: [
      "Equipación de fútbol {color} para entrenar y competir.",
      "Producto de fútbol {color} de {brand} para el césped.",
      "Material de fútbol {color} pensado para el partido.",
      "{name}: fútbol {color} de {brand} para dejarse la pierna cada finde.",
    ],
    bodies: [
      "Tejido técnico ligero que evacúa el sudor y seca rápido entre sprints, con corte que deja moverse en el regate sin tirar. Las costuras aguantan los lances del partido y el acabado transpirable mantiene la frescura los noventa minutos. Pensado para entrenar entre semana y competir el domingo.",
      "Construcción transpirable con paneles que ventilan en las zonas que más calientan y refuerzos donde hay más desgaste. Resiste el roce del césped y los lavados de toda la temporada sin perder color, y el ajuste acompaña la zancada. Material fiable para darlo todo en el campo.",
      "Tejido de secado rápido que no pesa cuando llega el sudor o el rocío del campo, con tacto suave y libertad total de movimiento. Mantiene la forma partido tras partido y la imagen del equipo intacta lavado tras lavado. Para entrenar, calentar y competir.",
    ],
    outros: [
      "Para entrenar entre semana y competir el fin de semana.",
      "Material pensado para el césped y para durar la temporada.",
    ],
    meta: [
      "Fútbol {color} {brand}. Tejido técnico transpirable. Envío 24/48 h.",
      "Material de fútbol {color} {brand} para entrenar y competir. Disponible en Zona Sport.",
    ],
  },
  // -------------------- PÁDEL --------------------
  {
    slug: "padel",
    label: "Pádel",
    intros: [
      "Producto de pádel {color} para la pista.",
      "Material de pádel {color} de {brand}.",
      "Equipación de pádel {color} pensada para jugar cómodo.",
      "{name}: pádel {color} de {brand} para moverse rápido en la pista.",
    ],
    bodies: [
      "Tejido técnico transpirable que evacúa el sudor en los puntos largos y seca rápido entre juegos, con un punto de elasticidad que sigue cada cambio de dirección. Acompaña en el saque y la volea sin tirar y mantiene la frescura todo el partido. Pensado para jugar cómodo de principio a fin.",
      "Construcción ligera que respira en pista y resulta cómoda fuera de ella, con costuras planas que no rozan en los desplazamientos. Resiste el ritmo de varios partidos seguidos y mantiene la forma lavado tras lavado. Material fiable para la pista de pádel.",
      "Tejido de secado rápido y tacto suave que no se pega a la piel con el calor, con libertad de movimiento en los smashes y las bandejas. Mantiene buena imagen dentro y fuera de la pista y aguanta la temporada de pádel. Cómodo para entrenar y competir.",
    ],
    outros: [
      "Para la pista de pádel y para el café de después.",
      "Material que aguanta partidos seguidos sin rendirse.",
    ],
    meta: [
      "Pádel {color} {brand}. Tejido técnico transpirable. Envío 24/48 h.",
      "Material de pádel {color} {brand} para la pista. Disponible en Zona Sport.",
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
      "{name}: abrigo {color} de {brand} para los días de viento, nieve y frío de verdad.",
    ],
    bodies: [
      "Relleno sintético de gramaje alto que conserva el calor incluso cuando se humedece y no se apelmaza con el uso. Capucha desmontable con visera reforzada y cordón de ajuste, puños interiores que cortan el aire y cremallera principal con tapeta anti-viento. Un abrigo que se nota desde la primera puesta.",
      "Membrana impermeable y transpirable que evita el efecto sauna mientras te mueves, con costuras selladas en las zonas críticas. Bolsillos laterales con cremallera estanca, bolsillo interior para el móvil y refuerzos en los hombros para la mochila. Pensado para amaneceres que pillan sin guantes.",
      "Tejido exterior resistente al agua y al viento sobre un forro cálido que aísla sin abultar, con ajuste regulable en cintura y bajo. La capucha protege bien la cara, las mangas no dejan entrar el frío por las muñecas y los bolsillos calientan las manos. Una chaqueta que dura años.",
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
      "{name}: anorak {color} de {brand} para rutas largas y tiempo cambiante.",
    ],
    bodies: [
      "Tejido ligero con tratamiento DWR que repele el agua sin sentirse plastificado y deja respirar a la piel. Capucha con visera y ajuste por cordones, cremallera frontal de doble carro para regular la ventilación y bolsillos accesibles con la mochila puesta. Pensado para cambios de tiempo imprevistos.",
      "Construcción cortavientos con costuras reforzadas y compartimento interior con seguro para llevar lo importante a salvo. El bajo y los puños se ajustan para sellar el frío, los bolsillos laterales tienen cremallera y el corte deja moverse en la subida. Lo doblas en la mochila y olvidas que lo llevas.",
      "Capa técnica que corta el viento y aguanta la lluvia fina sin agobiar en la marcha, con tejido de tacto seco y refuerzos en hombros. Capucha regulable de tres puntos, cremallera con tapeta y bolsillos amplios para el mapa o el móvil. De rutas largas a paseos por la ciudad.",
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
      "{name}: cortavientos {color} de {brand} que no estorba en ninguna salida.",
    ],
    bodies: [
      "Construcción minimalista que pesa apenas unos gramos y cabe plegada en su propio bolsillo para llevarla siempre. Reflectantes en mangas y espalda para ganar visibilidad en senderos al atardecer, tejido stretch que sigue la zancada y costuras termoselladas que no dejan entrar el agua. Ese anorak que decides llevar siempre.",
      "Tejido elástico que se adapta al movimiento sin restar libertad, con membrana que aguanta la lluvia y deja transpirar en la subida. Bajo elástico con regulador, puños con velcro para sellar bien con guantes y capucha ajustable. De vías ferratas a paseos otoñales por la ciudad.",
      "Cortavientos ligero de secado rápido que protege del viento y la llovizna sin agobiar, fácil de guardar cuando sale el sol. Cremallera con tope que no engancha, bolsillos accesibles y ajuste en cintura para cerrar el frío. Compañero discreto de cualquier ruta.",
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
      "{name}: cazadora {color} de {brand} para casi cualquier momento del año.",
    ],
    bodies: [
      "Forro fino que abriga lo justo y bajos elásticos en rib que sientan bien y cierran el aire. Cremallera frontal con tirador metálico, bolsillos delanteros con clip y corte ajustado por la espalda. Combina con vaquero, chino o pantalón técnico sin esfuerzo.",
      "Tejido resistente al agua ligera (lluvia fina, niebla) que sigue transpirando para no agobiar en la calle. Cuello alto que protege, puños ajustados y cintura entallada que estiliza la figura. Una capa intermedia que vale para casi todo el año.",
      "Cazadora de gramaje medio con tacto agradable, cierre fiable y bolsillos prácticos para las manos y el móvil. El corte casual entalla lo justo, el bajo no se sube y el tejido aguanta el uso diario. Fácil de poner y quitar según cambie el día.",
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
      "{name}: chubasquero {color} de {brand} que aparece justo cuando hace falta.",
    ],
    bodies: [
      "Tejido con tratamiento DWR y membrana interior que aguanta chubascos seguidos sin que entre la humedad. Capucha de tres ajustes que no tapa la visión, bajos con cordón y cremallera frontal con solapa anti-viento. Pliega pequeñísimo para llevarlo siempre en el coche o la mochila.",
      "Costuras termoselladas en las zonas críticas y puños con velcro que no dejan entrar agua por las muñecas. La membrana transpira para no acabar mojado por dentro, los bolsillos cierran estancos y el corte deja sitio para una capa debajo. El chubasquero que tienes siempre a mano.",
      "Impermeable ligero de tacto fino que protege del agua sin sentirse rígido, fácil de guardar en su bolsa cuando escampa. Capucha ajustable, cierre con tapeta y reflectantes discretos para que te vean en días grises. Listo en segundos cuando aprieta la lluvia.",
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
      "{name}: pantalón {color} de {brand} para senderos largos y vivacs improvisados.",
    ],
    bodies: [
      "Tejido stretch con refuerzos en rodillas y trasero que aguanta el roce de la roca y la mochila. Bolsillos laterales con velcro, cargo en el muslo y trasero abotonado para llevar el mapa, la navaja y lo que haga falta. Diseñado para rutas largas y escaladas suaves.",
      "Cintura ajustable con cinturón integrado y bajos regulables con cordón para entallarlos sobre la bota y dejar fuera piedras y tierra. El tejido se seca rápido tras el vadeo y resiste los enganchones del monte. El pantalón que aguanta las cuerdas y los abrazos del crash pad.",
      "Construcción técnica de tacto resistente con elasticidad en zonas clave para no limitar la zancada en la subida. Costuras reforzadas, ventilaciones discretas y bolsillos seguros con cierre. Cómodo del primer paso al último de la jornada.",
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
      "{name}: pantalón de nieve {color} de {brand} para una temporada entera sin pasar frío.",
    ],
    bodies: [
      "Relleno sintético en las zonas críticas y refuerzos en los bajos para resistir el roce de las botas y los cantos del esquí. Tirantes desmontables, peto delantero que corta el frío y bolsillos amplios para el skipass y los guantes. Pensado para -10 °C reales con viento.",
      "Costuras termoselladas y polainas internas con goma anti-derrape que dejan fuera la nieve por mucho que te muevas. La membrana 10k/10k mantiene seco mientras transpira en la subida y el ajuste deja espacio para una capa térmica debajo. Para una temporada entera sin mojarse.",
      "Tejido impermeable y resistente con aislamiento que retiene el calor sin abultar, cómodo en el remonte y en la bajada. Cintura ajustable, ventilaciones internas para regular y bolsillos seguros con cremallera. Equipación que aguanta el día completo de nieve.",
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
      "{name}: bañador {color} de {brand} listo para piscina, playa o jacuzzi.",
    ],
    bodies: [
      "Tejido ultraligero que no acumula peso ni agua y seca enseguida al sol, con slip interior de malla que da soporte. Cintura con cordón anti-deslizante, dos bolsillos laterales con drenaje y estampado discreto que combina con todo. Listo en cualquier escenario de verano.",
      "Tratamiento anti-cloro y resistencia al sol que mantienen el color baño tras baño, con tacto suave que no roza mojado. Seca rápido para volver a vestir sin esperas y cabe doblado en el bolsillo del pantalón. Perfecto para improvisar un chapuzón.",
      "Tejido técnico de secado exprés y peso pluma, cómodo dentro y fuera del agua. Cintura elástica con cordón, malla interior y bolsillos prácticos con orificio de drenaje. De la piscina a la terraza sin cambiarte.",
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
      "{name}: zapatilla {color} de {brand}, el comodín del armario.",
    ],
    bodies: [
      "Upper de malla transpirable con refuerzos en talón y punta que sujetan el pie sin apretar. Lengüeta acolchada, cierre de cordones que ajusta bien y plantilla extraíble por si usas las tuyas. Una zapatilla resolutiva para entrenos generales y uso diario.",
      "Mediasuela EVA con respuesta equilibrada entre amortiguación e impulso que rinde en el día largo y en el entrenamiento suave. Suela de goma con dibujo profundo que agarra en seco y en mojado, y collar acolchado que sujeta el tobillo. El comodín del armario que sirve para todo.",
      "Construcción ligera que respira y se siente cómoda desde el primer paso, con horma que acoge sin holguras. Amortiguación amable, estabilidad en el apoyo y suela duradera con buen agarre. Para entrenar, andar y resolver el día sin pensar en los pies.",
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
    slug: "running",
    label: "Running (calzado)",
    intros: [
      "Zapatilla de running {color} para rodar cómodo.",
      "Zapatilla running {color} de {brand} con amortiguación reactiva.",
      "Calzado de running {color} pensado para sumar kilómetros.",
      "{name}: zapatilla de running {color} de {brand} para tus rodajes.",
    ],
    bodies: [
      "Mediasuela con amortiguación reactiva que devuelve energía en cada zancada y protege la articulación en los rodajes largos. Upper de malla transpirable que sujeta sin apretar, talón estable y suela con buen agarre en asfalto. Pensada para sumar kilómetros sin penalizar.",
      "Drop equilibrado y pisada estable que ayudan a mantener la técnica cuando llega la fatiga, con espuma que amortigua sin perder respuesta. Lengüeta acolchada, ajuste fino de cordones y suela duradera con dibujo para agarrar en seco y mojado. Una zapatilla para entrenar de verdad.",
      "Construcción ligera y transpirable que ventila el pie en tiradas exigentes, con sujeción firme en el mediopié y collar acolchado. Amortiguación cómoda para el rodaje diario y suela resistente al desgaste. Para entrenar a diario y rendir el día de la carrera.",
    ],
    outros: [
      "Para entrenar a diario y rendir el día de la carrera.",
      "Tu zapatilla de rodaje para sumar kilómetros sin penalizar.",
    ],
    meta: [
      "Zapatilla running {color} {brand}. Amortiguación reactiva, transpirable. Envío 24/48 h.",
      "Running {color} {brand} para rodar cómodo. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "bota-alta",
    label: "Botas altas",
    intros: [
      "Bota alta {color} con caña reforzada.",
      "Bota deportiva {color} estilo retro con cuello acolchado.",
      "Sneaker mid {color} de {brand}.",
      "{name}: bota {color} de {brand} con aire deportivo y caña acolchada.",
    ],
    bodies: [
      "Upper de piel o sintético con refuerzos cosidos que aguantan el uso diario, cordones planos y ojales metálicos que soportan tensión sin deformarse. Plantilla acolchada extraíble, collar mullido que sujeta el tobillo y suela de goma con dibujo urbano. Para outfits que piden algo más que una zapatilla baja.",
      "Entresuela ligera que amortigua el paso y suela con buen agarre sobre suelo seco, con caña media que estiliza sin apretar. El acolchado del cuello da confort, la puntera protege y el tejido mantiene la forma con el uso. Una bota cómoda que conserva el aire deportivo.",
      "Construcción resistente de tacto cuidado, con costuras a la vista y cierre fiable que sujeta bien el empeine. Interior cómodo, plantilla mullida y suela duradera para el día a día. Combina con vaquero o chino sin complicaciones.",
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
      "Complemento deportivo {color} compacto y resistente.",
      "Complemento {color} para deporte y día a día.",
      "Pieza esencial {color} de {brand}.",
      "{name}: complemento {color} de {brand} que se nota cuando lo tienes.",
    ],
    bodies: [
      "Construcción robusta con materiales duraderos y acabados cuidados que aguantan el uso intensivo. Tamaño práctico que cabe en cualquier mochila o cajón, y diseño pensado para soportar sudor, lluvia y golpes sin perder forma. Pequeño detalle, gran diferencia.",
      "Materiales seleccionados que resisten el día a día sin desgastarse y mantienen el aspecto con el paso del tiempo. Funcional y fácil de llevar, suma comodidad sin estorbar y rinde donde otros se quedan cortos. Un complemento que se echa de menos cuando no lo tienes.",
      "Acabado resistente y tacto agradable, con detalles bien rematados y un formato manejable para el deporte y la calle. Aguanta el trote diario, se limpia fácil y mantiene la función intacta. El típico extra que acabas usando más de lo que pensabas.",
    ],
    outros: [
      "Pequeño detalle, gran diferencia.",
      "Un complemento que se nota cuando lo tienes y se echa de menos cuando no.",
    ],
    meta: [
      "Complemento deportivo {color} {brand}. Resistente y compacto. Envío 24/48 h.",
      "Complemento {color} {brand}. Disponible en Zona Sport.",
    ],
  },
  {
    slug: "accesorios",
    label: "Accesorios",
    intros: [
      "Accesorio deportivo {color} práctico y resistente.",
      "Accesorio {color} de {brand} para el deporte y la calle.",
      "Pieza {color} pensada para acompañarte cada día.",
      "{name}: accesorio {color} de {brand} para sumar al kit deportivo.",
    ],
    bodies: [
      "Materiales duraderos y acabados cuidados que aguantan el uso diario sin perder forma ni función. Formato práctico que cabe en la mochila, resistencia al sudor y a los golpes y diseño sobrio que combina con todo. El extra que acabas usando más de lo que esperabas.",
      "Construcción pensada para el trote diario, fácil de limpiar y de llevar, con detalles bien rematados que marcan la diferencia. Suma comodidad sin estorbar y rinde temporada tras temporada. Un accesorio fiable para el deporte y el día a día.",
      "Tacto agradable y acabado resistente, con un formato manejable que viene bien dentro y fuera del entrenamiento. Aguanta el uso intensivo y mantiene el aspecto con el tiempo. Pequeño en tamaño, grande en utilidad.",
    ],
    outros: [
      "Una buena referencia para sumar al kit deportivo.",
      "El extra que acabas usando más de lo que esperabas.",
    ],
    meta: [
      "Accesorio deportivo {color} {brand}. Resistente y práctico. Envío 24/48 h.",
      "Accesorio {color} {brand}. Disponible en Zona Sport.",
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
      "{name}: producto {color} de {brand} para sumar al kit deportivo.",
    ],
    bodies: [
      "Materiales seleccionados con criterio técnico y acabados duraderos que aguantan entrenamientos repetidos sin perder forma. Cuidado del detalle en costuras, ajuste y comportamiento del tejido, pensado para que dure varias temporadas con uso real. Una referencia fiable para el día a día deportivo.",
      "Construcción cuidada que respira y acompaña el movimiento sin estorbar, con tejidos que recuperan la forma lavado tras lavado. Buen comportamiento en el entrenamiento y en la calle, y acabados que se notan en la mano. Pensado para rendir y durar.",
      "Tejido y confección con criterio, cómodos desde el primer uso y resistentes al trote diario. Detalles bien rematados, ajuste equilibrado y aspecto que se mantiene con el tiempo. Una buena base para el kit deportivo que te asesoramos en tienda si dudas entre tallas o variantes.",
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
 * Genera plantillas por categoría combinando intros × bodies × outros.
 * Con 4 intros × 3 bodies × 2 outros = 24 por categoría. Total cubierto:
 * ~600+ plantillas únicas (slugs `{cat}-vNN`). Cada body concatena varias
 * frases para que la descripción final sea más larga y natural.
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
