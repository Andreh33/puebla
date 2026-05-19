/**
 * Catálogo inicial de 8 posts del blog de Zona Sport.
 *
 * Cada post se inserta vía `db.blogPost.upsert({ where: { slug } })` desde
 * `runSeed()` en `lib/seed/core.ts`, así que correr el seed N veces NO duplica.
 *
 * Temática local (Puebla de la Calzada / Badajoz / Extremadura) y multimarca.
 * Markdown real, 400–700 palabras por post, datos útiles y prácticos.
 * Las fechas se calculan en runtime escalonadas en las últimas 8 semanas.
 */

import type { PostStatus } from "@prisma/client";

export interface SeedBlogPost {
  slug: string;
  title: string;
  excerpt: string;
  contentMd: string;
  coverImageUrl: string | null;
  author: string;
  tags: string[];
  status: PostStatus;
  /** Semanas atrás respecto a "now" en el momento del seed (0 = más reciente). */
  weeksAgo: number;
  metaTitle: string;
  metaDescription: string;
}

export const SEED_BLOG_POSTS: ReadonlyArray<SeedBlogPost> = [
  {
    slug: "como-elegir-tu-primera-pala-de-padel-guia-2026",
    title: "Cómo elegir tu primera pala de pádel: guía 2026 para empezar bien",
    excerpt:
      "Forma, peso, balance, núcleo y precio: los cinco factores que importan al comprar tu primera pala de pádel. Sin tecnicismos vacíos.",
    coverImageUrl: "/blog-covers/padel-principiante.svg",
    author: "Equipo Zona Sport",
    tags: ["padel", "guias", "principiantes", "equipacion"],
    status: "PUBLISHED",
    weeksAgo: 0,
    metaTitle: "Cómo elegir tu primera pala de pádel — Guía 2026 | Zona Sport",
    metaDescription:
      "Aprende a elegir tu primera pala de pádel según forma, peso, balance y nivel. Recomendaciones prácticas para principiantes en Badajoz y Extremadura.",
    contentMd: `Empezar en el pádel es fácil; comprarse la primera pala, no tanto. La oferta es enorme, los precios oscilan entre 40 y 400 euros, y casi nadie te explica qué importa de verdad. Te lo resumimos sin marketing.

## 1. Forma de la pala: redonda, lágrima o diamante

- **Redonda**: el balance está bajo, cerca del puño. Más control, mejor tacto en defensa. **Es la mejor para empezar.**
- **Lágrima**: equilibrio entre control y potencia. Para cuando ya golpeas estable y quieres rematar.
- **Diamante**: balance alto, mucha potencia, menos control. Pala de jugador avanzado con pegada. No la compres si llevas menos de un año jugando.

## 2. Peso

Para adultos, el rango sano es **350-375 g**. Mujeres y juniors suelen ir mejor con **350-365 g**. Hombres con buen físico, **365-380 g**. Un gramo de más en la pala se nota en el codo a las dos horas: si dudas, tira a peso bajo.

## 3. Núcleo: goma blanda vs. EVA dura

- **Goma EVA Soft / Foam**: absorbe mejor, salida de bola más larga, perdona errores. Recomendada para empezar.
- **EVA dura**: respuesta seca, más control en gente con técnica, pero castiga el brazo.

Si llevas menos de un año jugando, núcleo blando. Tu codo te lo agradecerá.

## 4. Materiales de la cara

- **Fibra de vidrio**: tacto suave, salida de bola amplia. La opción más cómoda para principiantes.
- **Carbono 3K / 12K**: rigidez y potencia. Empieza a tener sentido a partir de nivel intermedio.

## 5. Presupuesto realista

Para un principiante adulto que va a jugar 1-2 veces por semana:
- **60–100 €**: pala digna para empezar. Cumple el primer año.
- **100–160 €**: gama media estable. Si ya sabes que te vas a enganchar, salta a este rango.
- **+200 €**: solo si tu nivel justifica las prestaciones, no antes.

## Cómo probar antes de comprar

En la tienda dejamos varias palas de la temporada para que las cojas, sientas el peso real y el balance. Una pala se "siente" en mano en cinco segundos: si te resulta cabezona o muerta, no es la tuya. Si dudas entre dos, llévalas a una pista cercana y peloteas 20 minutos. La diferencia se nota.

## Cuidados básicos

- Funda térmica en verano. **Nunca** dejes la pala en el coche al sol: la goma se reblandece y la cara se delamina.
- Protector de cabeza desde el día uno. Cuesta 8 euros y alarga la vida de la pala meses.
- Overgrip cambiado cada 4–6 sesiones. Si el agarre baila, fallas golpes que sabías hacer.

## Y si juego en Badajoz...

Hay clubes con material de prueba en Puebla, Mérida y la capital. Si nos pasas tu nivel y presupuesto, te orientamos sin compromiso por WhatsApp y te dejamos probar palas en mano antes de decidir. Mejor invertir media hora ahora que devolver una pala que no es la tuya.
`,
  },
  {
    slug: "correr-en-invierno-por-extremadura-rutas-equipacion-temperatura",
    title: "Correr en invierno por Extremadura: rutas, equipación y temperatura",
    excerpt:
      "Qué ponerse según la temperatura, dónde correr cerca de Badajoz cuando hace frío y los errores típicos del runner que empieza en noviembre.",
    coverImageUrl: "/blog-covers/running-invierno.svg",
    author: "Marina Cáceres",
    tags: ["running", "invierno", "extremadura", "equipacion"],
    status: "PUBLISHED",
    weeksAgo: 1,
    metaTitle: "Correr en invierno por Extremadura: equipación y rutas | Zona Sport",
    metaDescription:
      "Guía práctica para correr en invierno en Extremadura: cómo vestirte según la temperatura, rutas cerca de Badajoz y consejos para no abandonar en enero.",
    contentMd: `Correr en Extremadura en invierno tiene una ventaja: rara vez baja de 0 grados de día. Y un inconveniente: la humedad de los ríos Guadiana y Guadajira engaña, y vas más frío de lo que marca el termómetro. Esta guía es para que no abandones en el primer mes.

## La regla "menos 10 grados"

Vístete pensando que vas a estar **10 grados más caliente** que la temperatura de salida. Es decir:

- **2-5 °C**: malla larga, camiseta técnica de manga larga + cortavientos fino, guantes, buff.
- **5-10 °C**: malla larga (o corta si vas muy rápido), camiseta manga larga.
- **10-15 °C**: pantalón corto, manga larga fina o manga corta si pasa de 12.
- **+15 °C**: manga corta y pantalón corto, ya sin más.

El error clásico: salir cómodo. Si vas cómodo el primer kilómetro, vas sobrado en el quinto. Sal pasando un poco de frío.

## Tres capas, no más

1. **Base técnica** transpirable (poliéster o lana merino fina). Nada de algodón.
2. **Capa térmica** ligera si baja de 8 °C.
3. **Cortavientos** impermeable si hay viento o llovizna. Plegable, que entre en el bolsillo.

Tres capas finas calientan más que un forro polar gordo, porque puedes quitarte capas cuando entras en calor.

## Rutas cerca de Puebla y Badajoz

- **Ribera del Guadiana (Mérida–Badajoz)**: 100% llano, asfalto y tierra. Ideal para tiradas largas y series. Tramos protegidos del viento.
- **Parque del Rivillas (Badajoz capital)**: 4 km de circuito iluminado. Perfecto para entrenos cortos a última hora.
- **Sierra de San Pedro (San Vicente de Alcántara)**: trail suave, pinos, sin demasiada pendiente. Si te aburre el asfalto, aquí cambias de aire.
- **Camino Natural Vía de la Plata**: trozos perfectos para rodajes largos. Sale literal desde el casco urbano.

## Errores típicos de noviembre-enero

- **Cogerse demasiada ropa en la espalda**. Si llevas mochila con un forro de más, vas pesado y sudas; o lo metes en una riñonera 0,5 L o se queda en casa.
- **Salir sin guantes a 5 °C**. Las manos pierden temperatura rapidísimo y luego no entras en calor en toda la sesión.
- **Saltarse el calentamiento**. En invierno, 5 minutos de caminata + movilidad de tobillo y cadera antes de empezar a trotar. Reduces lesiones a la mitad.

## Material que SÍ importa

- **Calcetines técnicos** con caña media. Evitan ampollas y mantienen el pie seco.
- **Buff multifuncional**. Cuello, gorro, mascarilla improvisada si te coge una racha de viento del oeste.
- **Frontal recargable** si entrenas antes de las 8:00 o después de las 18:30. En invierno anochece a las 18:00.

## Hidratación: también importa

Aunque no sudes como en julio, sigues perdiendo líquido. Bebe agua antes de salir y al volver. Si haces más de 60 minutos, un sorbo cada 20 minutos. No hace falta isotónica salvo que pases de 90 minutos o haga calor.

¿Necesitas que te recomendemos malla, cortavientos o calzado concreto para tu peso y zancada? Escríbenos: te orientamos sin pedirte que compres nada de salida.
`,
  },
  {
    slug: "trail-running-sierra-san-pedro-cuatro-rutas",
    title: "Trail running en la Sierra de San Pedro: 4 rutas con dificultad creciente",
    excerpt:
      "De 6 km llanos a 22 km con desnivel real. Cuatro rutas en la Sierra de San Pedro para iniciarte y progresar en trail sin salir de Extremadura.",
    coverImageUrl: "/blog-covers/trail-sierra.svg",
    author: "Iván Macías",
    tags: ["trail", "montana", "rutas", "sierra-de-san-pedro"],
    status: "PUBLISHED",
    weeksAgo: 2,
    metaTitle: "4 rutas de trail running en la Sierra de San Pedro | Zona Sport",
    metaDescription:
      "Cuatro rutas de trail running en la Sierra de San Pedro (Badajoz) con dificultad creciente: de 6 km llanos a 22 km con desnivel. Perfectas para empezar.",
    contentMd: `La Sierra de San Pedro es probablemente el mejor terreno de trail que tenemos a una hora de Puebla. Pinares, dehesa, pista forestal en buen estado y desnivel medio que perdona. Cuatro rutas progresivas para que no te metas en una de 20 km sin haber rodado nunca por monte.

## Antes de empezar: tres reglas

1. **Avisa a alguien** de la ruta y hora estimada de vuelta. Hay tramos sin cobertura.
2. **Lleva agua**. Mínimo 500 ml en rutas cortas, 1 L de los 12 km en adelante.
3. **No corras solo de noche** las primeras veces. Las pistas son anchas, pero el monte despista al anochecer.

## Ruta 1 — Iniciación (6 km, +120 m)

Salida desde San Vicente de Alcántara. Pista forestal ancha, sombra de pinos casi todo el recorrido. Desnivel suave. Tiempo objetivo: 35–50 minutos.

Para quién: primera salida al monte tras llevar 3-4 meses corriendo asfalto. Si no aguantas 30 minutos seguidos por asfalto, no hagas esta todavía.

## Ruta 2 — Progresión (10 km, +260 m)

Misma salida, prolonga al norte hacia la presa pequeña. Aparece la primera subida real: 800 metros con pendiente del 6 %. Andar es legal. Tiempo: 1 h–1 h 20.

Llevar: cortavientos plegable, 500 ml agua, gel o fruta.

## Ruta 3 — Intermedia (14 km, +480 m)

Entras ya en sierra. Dos repechos del 8 %, uno seguido. Bajadas técnicas con piedra suelta donde no vas a poder ir rápido si no controlas la pisada. Tiempo: 1 h 40–2 h 15.

Llevar: chaleco-mochila 3-5 L con 1 L de agua, gel cada 45 minutos, manga larga ligera, móvil cargado.

## Ruta 4 — Reto (22 km, +850 m)

Ya es media maratón de trail. Combina dos subidas largas, cresta de 3 km con piedra y bajada técnica final. Tiempo: 2 h 30–3 h 30 según nivel.

Requisitos previos: haber hecho la ruta 3 dos veces sin sufrir, y al menos una salida de 18 km por asfalto.

## Equipación mínima para todas

- **Zapatilla de trail** con taco de 3-4 mm. Una asfaltera en suelo mojado es resbalón asegurado.
- **Calcetines técnicos** con caña media — el polvo del pinar entra en zapatillas bajas.
- **Reloj o app GPS** para no perderte. La señalización del monte es desigual.
- **Silbato** (suele venir en el chaleco-mochila). Cuesta nada y en una caída sin cobertura es lo único que llevas.

## Hidratación y avituallamiento

A partir de la ruta 3 lleva sales (un sobre / 500 ml agua) y gel rápido cada 45-60 minutos. En invierno parece que no sudas, pero sí pierdes sodio. En verano, no hagas la 3 ni la 4 entre las 11:00 y las 19:00. Punto.

## Después de la salida

- **Estira gemelos, isquios y glúteos** 5 minutos. En trail castigas mucho el bíceps femoral en bajada.
- **Hidrátate** con agua + algo de sal en la siguiente hora.
- **Comprueba zapatillas y calcetines**. Si te ha entrado piedra y no te has dado cuenta, ahora es cuando aparece la rozadura.

¿Quieres montar grupo para ruta 2 o 3 algún sábado? Tenemos lista de gente que sale desde Puebla. Pregúntanos.
`,
  },
  {
    slug: "padel-femenino-boom-puebla-merida",
    title: "Pádel femenino: el boom local en Puebla y Mérida",
    excerpt:
      "El pádel femenino crece más rápido que el masculino en Extremadura. Datos, clubes, ligas y por qué este invierno hay lista de espera en pistas.",
    coverImageUrl: "/blog-covers/padel-femenino.svg",
    author: "Equipo Zona Sport",
    tags: ["padel", "mujeres", "comunidad", "extremadura"],
    status: "PUBLISHED",
    weeksAgo: 3,
    metaTitle: "El boom del pádel femenino en Puebla y Mérida | Zona Sport",
    metaDescription:
      "El pádel femenino crece a doble dígito en Puebla de la Calzada y Mérida. Te contamos clubes, ligas, palas recomendadas y por qué este invierno hay lista de espera.",
    contentMd: `Si llevas tiempo intentando reservar pista a las 19:00 entre semana en Puebla o Mérida, ya lo habrás notado: cuesta. Y la mitad de los grupos en lista de espera son femeninos o mixtos. El pádel femenino está creciendo aquí más rápido que el masculino, y los números cuadran con lo que se ve en pistas.

## Qué dicen los datos

A nivel nacional, la Federación Española de Pádel reporta crecimiento de licencias femeninas por encima del 15 % anual en los últimos tres ejercicios. En Extremadura el porcentaje es todavía mayor porque partíamos de menos base: hay margen.

A pie de pista, los clubes locales que hemos consultado coinciden:
- Aumento del 30-40 % de inscripciones femeninas a clases colectivas respecto al año pasado.
- Liga femenina interclubes con 60 % más equipos en la edición actual que en 2024.
- Aparición de grupos privados estables de 4-8 jugadoras que reservan pista fija dos veces por semana.

## Por qué ocurre ahora

Tres factores se solapan:

1. **Visibilidad pro**. World Padel Tour y Premier Padel se ven en abierto. Las parejas femeninas, las hermanas Sánchez Alayeto, Salazar, Triay, Bidahorria... Tienen marca propia y mueven afición.
2. **Comunidad horizontal**. El pádel se juega en pareja y se enseña en grupo. Eso facilita engancharse con amigas sin necesidad de tener nivel previo.
3. **Acceso local**. En 30 minutos en coche desde Puebla tienes pistas en Mérida, Badajoz, Almendralejo. Antes había que ir más lejos.

## Clubes con actividad femenina cerca

- **Mérida**: ligas internas, clases dirigidas, torneos mensuales nocturnos en verano.
- **Badajoz capital**: dos clubes con escuela femenina específica y división por niveles.
- **Almendralejo**: torneo provincial femenino en mayo, con cuadros desde nivel iniciación.
- **Puebla y entorno**: grupos privados estables. Si no tienes con quién jugar, escríbenos: tenemos lista de chicas buscando pareja o cuadrado.

## Qué pala para iniciación femenina

Las recomendaciones cambian poco por sexo, pero sí por peso del jugador y físico. Para una jugadora de 1,60-1,75 m que empieza:

- **Forma**: redonda.
- **Peso**: 350-365 g.
- **Núcleo**: blando (EVA Soft o Foam).
- **Cara**: fibra de vidrio.
- **Precio**: 70-130 € es perfecto para el primer año.

No hace falta una pala "para mujer" pintada de rosa. Hace falta una pala que pese poco, perdone y no te castigue el codo. Eso lo cumplen modelos masculinos, femeninos y unisex indistintamente.

## Ropa: lo que sí marca diferencia

- **Sujetador deportivo de impacto medio o alto**. Pádel tiene mucho desplazamiento lateral.
- **Falda o malla técnica** según preferencia. La diferencia es comodidad personal, no rendimiento.
- **Calzado específico de pádel**, no de tenis o running. El refuerzo lateral es distinto. En suelo de pista, una asfaltera resbala.

## El siguiente paso

Si quieres montar grupo, no sabes con quién empezar o necesitas que te orientemos en pala y zapatilla sin venderte humos: te dejamos probar material en tienda. Si tu pareja de pádel tiene un nivel muy distinto al tuyo, también te ayudamos a encontrar gente parecida en tu zona.
`,
  },
  {
    slug: "cuidar-zapatillas-deportivas-duren-doble",
    title: "Cómo cuidar tus zapatillas para que duren el doble",
    excerpt:
      "Lavado, secado, cuándo retirarlas y cinco errores que cargan tu calzado en la primera lavadora. Aplicable a running, casual, pádel y trail.",
    coverImageUrl: "/blog-covers/cuidar-zapatillas.svg",
    author: "Equipo Zona Sport",
    tags: ["calzado", "cuidados", "guias"],
    status: "PUBLISHED",
    weeksAgo: 4,
    metaTitle: "Cómo cuidar tus zapatillas para que duren el doble | Zona Sport",
    metaDescription:
      "Lavado, secado, rotación y cinco errores típicos que cargan tus zapatillas en la primera lavadora. Aplica a running, casual, pádel y trail.",
    contentMd: `Una zapatilla de 110 euros puede durarte 600 km o 1.200 km dependiendo de cómo la trates. Y no, no es solo "lavarlas a mano". Hay cosas que la mayoría hacemos mal y otras que ni siquiera se hablan en tienda.

## El gran error: lavadora con la zapatilla mojada en barro

Si vienes de correr por la dehesa y metes la zapatilla con el barro fresco en la lavadora, el barro se mete dentro del entresuela y se queda ahí. Resultado: amortiguación apelmazada en seis lavados.

**Lo correcto**: dejar secar el barro al aire, golpear sueltas para soltar tierra, cepillar en seco con cepillo de uñas, y solo entonces lavar.

## Cómo lavar bien

1. **Quita plantillas y cordones**. Se lavan aparte (las plantillas a mano, los cordones a la lavadora dentro de una bolsa).
2. **Cepilla la suela** con cepillo y agua fría. La suela aguanta lo que le eches.
3. **El upper**: a mano con jabón neutro (Marsella o detergente delicado) y cepillo blando. Movimientos circulares, sin frotar fuerte sobre malla técnica.
4. **Aclarado** con agua fría. Nunca caliente: el adhesivo entre suela y upper se reblandece a partir de 40 °C.
5. **Secado al aire** dentro de casa, lejos de radiadores o sol directo. Mete papel de periódico arrugado dentro: absorbe humedad y mantiene la forma.

## Lavadora: solo si no queda más remedio

Programa delicado, 30 °C máximo, sin centrifugado fuerte (máx. 400 rpm), bolsa de lavado, y bien cepilladas antes. Casual de lona aguanta. Una zapatilla técnica de running con placa de carbono, no se lava nunca en lavadora.

## Rotación: la clave que más alarga la vida

Si corres 4 veces por semana con la misma zapatilla, cárgatela en 4 meses. Si tienes **dos pares en rotación**, te aguantan **el doble cada una** porque la espuma EVA necesita 24-48 h para recuperar forma tras un uso intenso.

- **2 pares** si haces más de 30 km/semana.
- **3 pares** (asfalto, trail, day-to-day) si corres en distintas superficies.
- En pádel también ayuda: una pista de cemento castiga distinto que la de moqueta.

## Cuándo retirarlas

Señales de que la zapatilla está acabada (cualquiera de estas):

- Más de **600-800 km** corridos para asfaltera estándar.
- **Suela lisa** en talón o antepié. Pierdes tracción y la pisada se descompensa.
- **Arrugas marcadas** en el flanco de la entresuela (la espuma blanca). Significa que la EVA ha perdido densidad.
- **Aparecen molestias** que no tenías: rodilla, fascia, gemelo. La zapatilla compensa peor.

No esperes a que se rompa la suela. La amortiguación muere antes de que se vea el agujero.

## Cinco errores que cargan zapatillas en 3 meses

1. Dejarlas dentro del coche al sol (la entresuela se cuece).
2. Secarlas pegadas a la chimenea o radiador.
3. Andar con la zapatilla pisándote el talón sin terminar de calzarla. Rompe el contrafuerte trasero.
4. Lavar plantillas con suavizante. Tapan los poros y luego huelen peor.
5. Comprar talla justa "porque me gustan ajustadas". Termina dañando el cap delantero a los 200 km.

## Trucos baratos que funcionan

- **Bicarbonato en zapatilla seca** una noche para neutralizar olor. Aspirar al día siguiente.
- **Bolsitas de gel de sílice** (las que vienen en cajas nuevas) dentro de la zapatilla cuando no la usas en semanas.
- **Cepillo de dientes viejo** para el detalle de la suela y costuras.

¿Necesitas un par concreto y no sabes si los que tienes están al final de su vida? Llévanoslos a tienda: en 5 minutos lo vemos juntos sin compromiso.
`,
  },
  {
    slug: "ninos-y-deporte-edad-empezar-que-evitar",
    title: "Niños y deporte: a qué edad empezar y qué evitar",
    excerpt:
      "Pediatras, entrenadores y federaciones coinciden en lo básico: hasta los 6 años, juego libre. Después, especializar tarde. Lo que sí y lo que no.",
    coverImageUrl: "/blog-covers/ninos-deporte.svg",
    author: "Marina Cáceres",
    tags: ["ninos", "familia", "deporte-base"],
    status: "PUBLISHED",
    weeksAgo: 5,
    metaTitle: "A qué edad empezar deporte los niños y qué evitar | Zona Sport",
    metaDescription:
      "Hasta los 6 años, juego libre. Después, deporte variado y especialización tardía. Guía clara para familias en Puebla y Badajoz.",
    contentMd: `Cada septiembre nos preguntáis lo mismo: "¿A qué edad apunto a mi hijo a fútbol/pádel/atletismo?". La respuesta corta: depende de la edad y del objetivo. La larga, te la contamos aquí con criterio de pediatra y de entrenador, no de marca.

## De 0 a 3 años: motricidad libre

Cero deportes estructurados. Lo que necesita un crío en esta franja es:

- Caminar, correr, saltar, trepar, rodar.
- Espacio seguro y tiempo no dirigido.
- Cambios de altura (sofá, parque, césped) que entrenen propiocepción.

Nada de "escuela de psicomotricidad" si vais al parque a diario. El parque es la mejor escuela de psicomotricidad.

## De 3 a 6 años: jugar, no entrenar

Aquí sí pueden empezar actividades dirigidas, pero **con dos condiciones**:

- Que sean **multi-habilidad**: gimnasia general, predeporte, natación, judo iniciación.
- Que la sesión sea **mayoritariamente juego**, no técnica.

Lo que evitamos en esta etapa:
- Deportes muy especializados (tenis competición, gimnasia rítmica de alta carga).
- Competición clasificatoria con ranking.
- Más de 2-3 horas semanales de actividad dirigida.

A esta edad el cerebro del niño está aprendiendo coordinación general. Cuanta más variedad, mejor base motora para el resto de la vida.

## De 6 a 9 años: probar mucho, comprometerse poco

Etapa de oro para **probar varios deportes**:

- Fútbol, baloncesto, balonmano, pádel, atletismo, natación, judo.
- Idealmente uno con bote/lanzamiento (mano-ojo) y otro de carrera (resistencia).
- Una temporada un deporte, la siguiente otro, no pasa nada.

**Lo que SÍ es importante**:
- Que haya un adulto que enseñe valores, no resultados.
- Que la familia transmita "ve a divertirte", no "ve a ganar".
- Que el niño elija continuar, no se le obligue.

## De 9 a 12 años: empieza el "deporte favorito"

Aquí muchos críos eligen un deporte que les gusta más. Está bien dedicarle 2-3 sesiones semanales **pero seguir manteniendo variedad** en educación física del cole o en juego libre.

Errores típicos en esta franja:
- Especializar demasiado pronto (el famoso "voy a hacer pádel todos los días"). Lleva a sobreuso y abandono a los 14.
- Forzar competición federada si el crío no la pide.
- Calzado de adulto comprado "que le crezca". Mal apoyo, lesiones.

## A partir de 12-14: especialización progresiva

Ya tiene sentido elegir 1-2 deportes principales y dedicarles más volumen. Sigue siendo bueno mantener un deporte secundario para no machacar siempre el mismo gesto.

## Calzado infantil: la regla del centímetro

El pie del niño crece 1-2 mm al mes hasta los 12 años. Reglas:

- Talla con **1 cm de margen** entre el dedo más largo y la punta de la zapatilla.
- **Revisar cada 2-3 meses**, no esperar a que el crío se queje.
- Nada de heredar zapatillas muy usadas: la huella del pie del hermano deforma la entresuela y obliga a una pisada que no es la del segundo niño.

## Equipación mínima por deporte (6-9 años)

- **Fútbol**: bota multitaco (no de tacos de aluminio), espinilleras, calcetines técnicos.
- **Pádel**: zapatilla específica de pádel, pala junior (240-280 g, ligera).
- **Atletismo / Running**: zapatilla técnica con buena amortiguación, calcetines técnicos.
- **Natación**: bañador resistente al cloro, gafas con cinta ajustable, gorro.

## Señales de alarma

Si después de unas semanas el niño:
- Dice "me duele" sin que haya golpe (sobreuso),
- Llora antes de cada sesión sin querer decir por qué,
- Pierde apetito o sueño cuando se acerca el día de entreno,

para, escucha y cambia de actividad. Forzar deporte a un niño que sufre es la receta perfecta para que de adulto odie moverse.

¿Buscas calzado o equipación para tu hijo en Puebla? Pásate y le medimos pie y horma sin compromiso.
`,
  },
  {
    slug: "mochilas-y-rinoneras-que-llevar-que-dejar-en-casa",
    title: "Mochilas y riñoneras: qué llevar y qué dejar en casa",
    excerpt:
      "Equiparse para una salida no es meter cosas por si acaso. Es seleccionar. Te contamos qué entra en una mochila de hidratación, una de día y una riñonera.",
    coverImageUrl: "/blog-covers/mochilas.svg",
    author: "Iván Macías",
    tags: ["complementos", "mochilas", "outdoor", "guias"],
    status: "PUBLISHED",
    weeksAgo: 6,
    metaTitle: "Mochilas y riñoneras: qué meter dentro | Zona Sport",
    metaDescription:
      "Guía de qué llevar y qué dejar en casa según el tipo de mochila: hidratación, día, multiactividad, riñonera de running. Sin sobrepeso ni improvisaciones.",
    contentMd: `La mochila perfecta es la que ni notas. Y eso depende menos del modelo que cargues y más de lo que metas dentro. Esta es nuestra guía honesta por tipo de mochila, basada en años de devoluciones, reclamos y "es que pesa mucho".

## Riñonera de running (0,5–1 L)

**Para salidas de 30 a 75 minutos**.

Mete:
- Llaves (sin llavero ruidoso).
- Móvil (en compartimento separado para que no golpee).
- Tarjeta y un billete de 10 €.
- Gel o barrita pequeña.

Deja en casa:
- Botella entera (con salidas < 1 h normalmente no hace falta).
- Cortavientos completo (si lo necesitas, llévalo puesto y atado a la cintura).
- Frontal (innecesario si entrenas de día).

## Mochila de hidratación (3-6 L)

**Para trail y running largo, 60 min hasta 4 h**.

Mete:
- Soft flasks o vejiga 1-1,5 L con agua + sales.
- 2-3 geles o fruta deshidratada.
- Cortavientos plegable.
- Manga larga ligera o buff.
- Silbato (suele venir cosido).
- Móvil cargado.
- Tarjeta + un billete + DNI fotocopia.
- Pañuelos pequeños.

Deja en casa:
- Termo. Pesa, abulta y no lo abres.
- 1 L extra "por si acaso". Calcula bien antes de salir.
- Cargador. No lo vas a usar.

## Mochila de día / city (10-20 L)

**Para excursiones de 4-8 h, paseos largos, viajes urbanos**.

Mete:
- Botella de 0,75-1 L (rellenable).
- Snack: fruta + barrita + bocadillo.
- Capa térmica ligera o forro plegable.
- Chubasquero compacto (sí, aunque haga sol).
- Gorra o gorro según temporada.
- Crema solar pequeña (50 ml).
- Botiquín mínimo: tiritas, ibuprofeno, esparadrapo.
- Móvil + cargador externo pequeño.
- Tarjeta + DNI + dinero efectivo (no todo lo llevamos en la app).

Deja en casa:
- Toalla de baño completa. Una microfibra mediana basta.
- Libro grueso. Para urbano un kindle o el móvil.
- Calzado de cambio salvo necesidad real.

## Mochila multiactividad (20-35 L)

**Para fines de semana, vivac ligero, escapada con material**.

Mete todo lo anterior y suma:
- Saco de dormir según temperatura prevista.
- Esterilla aislante ligera.
- Frontal con pilas o batería extra.
- Recambio de calcetines y camiseta.
- Bolsa estanca para móvil/documentos.
- Cuerda fina 3-5 m para tender o sujetar.

## Errores transversales

1. **Distribuir mal el peso**. Lo pesado, pegado a la espalda y centrado. Lo ligero, fuera.
2. **No regular las cinchas**. Una mochila bien puesta no tira de hombros: el 60-70 % del peso debe caer en cintura.
3. **Llevar agua "por si acaso" y no usarla**. Calcula consumo realista: 0,5-0,75 L por hora si hace calor; 0,3-0,4 L si hace fresco.
4. **Mezclar comida sin envolver con ropa**. Bolsitas con cremallera o ziploc, siempre.

## Cómo elegir tamaño

- **0,5-1 L**: running corto.
- **3-6 L**: trail, running largo, MTB cross-country.
- **10-15 L**: día urbano + excursión corta.
- **15-25 L**: día de montaña con material.
- **25-35 L**: 1-2 días de actividad.
- **35-60 L**: trekking 3-5 días.
- **+60 L**: travesía o vivac varios días. Solo si sabes lo que haces, si no, alquila.

## La regla del peso

Para excursión normal de día, **no pases del 10 % de tu peso corporal** en la mochila. Para travesías largas con experiencia, hasta 20 %. Si pasas, vas a sufrir y vas a apretar la zancada.

Si dudas en el modelo o la talla de espalda, pásate por tienda: las mochilas hay que probarlas con peso real puesto, no vacías colgadas en un percha.
`,
  },
  {
    slug: "plan-fin-de-semana-badajoz-deporte-y-tapeo",
    title: "Plan fin de semana en Badajoz: deporte por la mañana, tapeo por la tarde",
    excerpt:
      "Un plan realista para sábado o domingo: dónde correr o pedalear cerca de Puebla, dónde recuperar fuerzas con comida local y dos cervezas decentes.",
    coverImageUrl: "/blog-covers/fin-semana-badajoz.svg",
    author: "Equipo Zona Sport",
    tags: ["badajoz", "extremadura", "ocio", "comunidad"],
    status: "PUBLISHED",
    weeksAgo: 7,
    metaTitle: "Fin de semana en Badajoz: deporte y tapeo | Zona Sport",
    metaDescription:
      "Plan realista para sábado o domingo: deporte por la mañana en Puebla o Badajoz, comida local al mediodía y ocio por la tarde. Sin tópicos.",
    contentMd: `Hay vida más allá del sofá. Esto es un plan probado para sábado o domingo en clave deporte + gastronomía, sin tópicos turísticos y aplicable de octubre a junio.

## Sábado mañana — Ribera del Guadiana (8:30-10:30)

Si vives en Puebla, en 15 minutos te plantas en la ribera del Guadiana en Badajoz o Mérida. Pista llana, asfalto y tierra alternada, sin coches.

- **Distancia recomendada**: 8-12 km a ritmo cómodo.
- **Variante MTB / bici de carretera**: 25-40 km hacia Mérida o Olivenza.
- **Variante paseo**: marcha rápida con palos nórdicos 6-8 km.

Llévate: agua, gorra, gafas de sol (en Extremadura las necesitas hasta en invierno) y dinero o tarjeta para el café final.

## Café y desayuno post-actividad (10:30-11:30)

Subes a casco antiguo de Badajoz o vuelves a Puebla. Pide:
- Tostada con tomate, jamón ibérico de la tierra, café con leche.
- Si necesitas reponer en serio: tortilla francesa con bacon, zumo natural.

Coste razonable: 6-9 €. No pidas zumo de naranja a las 11:00 si el camarero no lo está exprimiendo en ese momento.

## Vermut o tapeo medio día (13:00-15:00)

En Badajoz capital, la zona de Menacho y Plaza Alta tiene oferta amplia. Imprescindibles locales:

- **Tomate aliñado** con aceite virgen extra de la zona y ajo picado.
- **Pringá** (cocido reducido y untable en pan tostado).
- **Chacina ibérica** del Valle del Jerte o de la Sierra de Montánchez.
- **Migas extremeñas** si hace frío y tienes hambre real.
- **Cerveza fría** de tirador, no de botellín si puedes elegir.

En Puebla, los bares del centro hacen tapas honradas a precio justo. No hay falsificación de carta.

## Tarde de sábado: descanso activo (16:30-19:00)

Opciones según ganas:

- **Paseo por el centro de Badajoz**: Vegas Bajas, Alcazaba, vistas a Portugal desde el baluarte.
- **Visita rápida a Elvas (Portugal)**: 15 minutos en coche, casco antiguo amurallado, café portugués y pastel de nata por 2 €.
- **Excursión corta en el Parque del Rivillas**: 5-7 km de paseo con desnivel suave.

Si has corrido por la mañana, esto es justo lo que necesitan las piernas: movimiento ligero, no sofá total.

## Domingo: cambio de aire

Tres opciones según humor:

### Plan A — Trail suave en Sierra de San Pedro
Salida de San Vicente de Alcántara, ruta de 10-14 km por pinar. 1 h 30-2 h. Vuelves a comer.

### Plan B — Pádel familiar en club local
Reserva entre las 10:00 y las 13:00, juega 90 minutos, comida en el restaurante del club o cerca.

### Plan C — Día tranquilo con paseo y mercado
Mercado de productores en Puebla o Mérida (si hay), paseo urbano largo (10 km repartidos), aperitivo con vermut de la casa.

## Comida del domingo: cocido o carne a la brasa

- **Cocido extremeño** si hace frío. Caldo, garbanzos, carne y verduras. No hay plato más reparador después de 14 km.
- **Carne a la brasa** (ibérico, ternera de retinto): pedido al punto, con patata asada o ensalada de tomate.
- **Vino tinto de la Ribera del Guadiana**, no más de una copa si conduces.

Coste razonable: 18-30 € por persona, vino aparte.

## Reglas no escritas del fin de semana deportivo

1. **No comas marisco crudo** justo antes de salir a correr. Cinco euros nos jugamos a que te arrepientes.
2. **Hidrátate antes que durante**. Si llegas a la salida deshidratado por la cerveza del viernes, no hay agua que te recupere.
3. **No te apures con el ritmo del sábado**. Es fin de semana, no series.
4. **Avisa a alguien** de tu plan si sales a monte solo.

¿Plan para el sábado que viene? Si quieres salir con grupo desde Puebla, escríbenos. Suele haber gente preparando salidas.
`,
  },
];
