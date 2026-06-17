/**
 * 40 posts adicionales del blog de Zona Sport.
 *
 * Se insertan vía el endpoint protegido `POST /api/admin/seed-blog` (upsert por
 * `slug`, idempotente), no desde el seed core. Cada post tiene una portada SVG
 * de marca generada con `lib/blog/cover-svg.ts` y escrita a
 * `public/blog-covers/<slug>.svg` por `scripts/generate-blog-covers.ts`.
 *
 * Reglas de contenido:
 * - Markdown real, 250-400 palabras, con 2+ subtítulos `##`.
 * - Español de España, tono experto pero cercano.
 * - Mención natural a comprar/reservar en Zona Sport o por WhatsApp.
 * - NAP real: C. Silos 3, Puebla de la Calzada (Badajoz) · WhatsApp 689 11 06 91.
 * - NO inventar precios ni stock.
 *
 * Los slugs no colisionan con los 9 posts del seed core (8 de blog-posts.ts +
 * el post de bienvenida).
 */

export interface BlogPostSeed {
  slug: string;
  title: string;
  excerpt: string;
  /** Markdown, 250-400 palabras, con subtítulos `##`. */
  contentMd: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  author: string;
  /** Color de acento (hex) para la portada SVG. */
  accent: string;
  /** Kicker/categoría que aparece en la portada. */
  category: string;
}

const AUTHOR = "Equipo Zona Sport";

// Acentos por familia (coherentes con la paleta de marca)
const ACCENT_PADEL = "#c8da46"; // amarillo tenis
const ACCENT_RUNNING = "#5e7eea"; // azul medio
const ACCENT_FUTBOL = "#22c55e"; // verde césped
const ACCENT_NINOS = "#f59e0b"; // ámbar
const ACCENT_MARCAS = "#e879f9"; // magenta suave
const ACCENT_TEMPORADA = "#38bdf8"; // celeste
const ACCENT_CUIDADO = "#fb7185"; // coral
const ACCENT_TIENDA = "#facc15"; // amarillo cálido

export const BLOG_POSTS_EXTRA: ReadonlyArray<BlogPostSeed> = [
  // ===================================================================== PÁDEL
  {
    slug: "como-elegir-pala-padel-segun-tu-nivel",
    title: "Cómo elegir la pala de pádel según tu nivel de juego",
    excerpt:
      "Forma, balance y dureza cambian mucho según seas principiante, intermedio o avanzado. Te lo explicamos sin tecnicismos.",
    tags: ["padel", "palas", "guias"],
    metaTitle: "Cómo elegir la pala de pádel según tu nivel | Zona Sport",
    metaDescription:
      "Guía para elegir pala de pádel según tu nivel: forma, balance, dureza y peso explicados claro. Resuelve dudas en Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_PADEL,
    category: "Pádel",
    contentMd: `Elegir pala no va de comprar la más cara ni la que usa tu jugador favorito. Va de acertar con tu nivel real. Aquí tienes una guía rápida y honesta.

## Empieza por la forma

La forma marca el equilibrio entre control y potencia:

- **Redonda**: balance bajo, mucho control y un punto dulce amplio. Es la forma que recomendamos para empezar y para quien prioriza colocar la bola.
- **Lágrima**: equilibrio entre control y pegada. Ideal cuando ya golpeas estable y quieres dar un paso adelante.
- **Diamante**: balance alto y máxima potencia, pero menos margen de error. Solo tiene sentido con técnica consolidada.

## Dureza y peso

Una pala blanda perdona más y cuida el brazo; una dura ofrece respuesta seca pero castiga si no tienes técnica. Si llevas menos de un año jugando, tira a blanda.

En peso, el rango cómodo para la mayoría está entre 350 y 375 gramos. Ante la duda, baja de peso: un exceso se nota en el codo a las dos horas de partido.

## No te compliques con los materiales

Fibra de vidrio para tacto y comodidad; carbono para rigidez y control. El carbono empieza a merecer la pena a partir de nivel intermedio, no antes.

## Pruébala antes de decidir

Una pala se siente en mano en cinco segundos. En Zona Sport te dejamos cogerlas, notar el peso y el balance reales y compararlas. Si nos cuentas tu nivel y cómo juegas, te orientamos sin venderte humo.

¿Tienes dudas entre dos modelos concretos? Escríbenos por WhatsApp al 689 11 06 91 o pásate por la tienda en C. Silos 3, en Puebla de la Calzada. Mejor invertir diez minutos ahora que arrepentirse después.`,
  },
  {
    slug: "mejores-palas-padel-para-principiantes",
    title: "Palas de pádel para principiantes: qué buscar (y qué evitar)",
    excerpt:
      "Si empiezas en el pádel, estas son las características que de verdad importan en tu primera pala, y los errores típicos al comprarla.",
    tags: ["padel", "palas", "principiantes"],
    metaTitle: "Palas de pádel para principiantes: qué buscar | Zona Sport",
    metaDescription:
      "Qué características importan en una pala de pádel para principiantes y qué errores evitar. Te asesoramos en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_PADEL,
    category: "Pádel",
    contentMd: `Tu primera pala no tiene que ser perfecta, tiene que ayudarte a aprender sin lesionarte. Estas son las claves.

## Las cuatro cosas que sí importan

1. **Forma redonda**: el punto dulce es grande y perdona los golpes descentrados, que al principio son casi todos.
2. **Núcleo blando** (goma EVA Soft o Foam): salida de bola más larga y mucho mejor para el brazo.
3. **Cara de fibra de vidrio**: tacto suave y cómodo, frente a la rigidez del carbono.
4. **Peso contenido**: entre 350 y 365 gramos para no cargar el codo.

Con eso cubierto, ya tienes una pala que te va a acompañar bien durante el primer año.

## Errores que vemos a diario

- **Comprar una pala de jugador avanzado** (diamante, dura, todo carbono) porque "es mejor". No lo es para ti: te frenará y te cargará el brazo.
- **Obsesionarse con el color o el modelo de moda** en lugar de la forma y la dureza.
- **No usar protector ni overgrip** desde el primer día. Son baratos y alargan la vida de la pala y mejoran el agarre.

## Cuida tu inversión

Guarda la pala en su funda, nunca la dejes en el coche al sol (la goma se reblandece) y cámbiale el overgrip cada pocas sesiones.

En Zona Sport tenemos palas pensadas para empezar y te ayudamos a elegir según tu físico y tus ganas de engancharte. Pregúntanos por WhatsApp al 689 11 06 91 o ven a probarlas a la tienda, en C. Silos 3, Puebla de la Calzada (Badajoz). Sin prisa y sin compromiso.`,
  },
  {
    slug: "como-mantener-y-cuidar-tu-pala-de-padel",
    title: "Cómo mantener y cuidar tu pala de pádel para que dure más",
    excerpt:
      "Protector, overgrip, temperatura y almacenaje: pequeños gestos que alargan meses la vida de tu pala y mantienen su tacto.",
    tags: ["padel", "cuidados", "mantenimiento"],
    metaTitle: "Cómo cuidar tu pala de pádel para que dure más | Zona Sport",
    metaDescription:
      "Protector, overgrip, temperatura y almacenaje: cómo cuidar tu pala de pádel para que dure más. Consejos y material en Zona Sport, Puebla de la Calzada.",
    author: AUTHOR,
    accent: ACCENT_PADEL,
    category: "Pádel",
    contentMd: `Una pala bien cuidada aguanta mucho más y mantiene su tacto. Y casi todo el cuidado es gratis o cuesta muy poco.

## El protector: tu mejor seguro

El golpe contra la pared o el suelo es la causa número uno de palas rotas. Un protector de cabeza cuesta poco y absorbe esos impactos. Póntelo desde el primer día: cuando la pala ya está descascarillada, el agua y el polvo entran en el núcleo y empieza a perder prestaciones.

## El overgrip marca la diferencia

Si el agarre baila, fallas golpes que sabes hacer. Cambia el overgrip cada cuatro o seis sesiones, o antes si sudas mucho. Es lo más barato que puedes hacer por tu juego.

## El gran enemigo: el calor

Nunca dejes la pala en el maletero del coche en verano. Con el calor, la goma EVA se reblandece y la cara se puede delaminar. Usa una funda térmica y guárdala a la sombra, en un sitio fresco y seco.

## Revisión rápida cada mes

- Comprueba que no haya **grietas** en el marco ni en la cara.
- Mira si el **puño** está flojo o agrietado.
- Limpia la **superficie rugosa** con un paño húmedo para que mantenga el efecto.

## Cuándo toca jubilarla

Si notas la pala "muerta", suena a hueco o ves la goma hundida, probablemente el núcleo está vencido. No hay reparación que lo arregle del todo.

Si quieres que le echemos un vistazo a la tuya, tráela a Zona Sport en C. Silos 3, Puebla de la Calzada. Te decimos con sinceridad si aún tiene cuerda o si conviene renovarla. Escríbenos antes por WhatsApp al 689 11 06 91 si quieres.`,
  },
  {
    slug: "zapatillas-de-padel-por-que-no-valen-las-de-running",
    title: "Zapatillas de pádel: por qué no te valen las de running",
    excerpt:
      "El movimiento del pádel es lateral y explosivo. Te explicamos qué buscar en una zapatilla de pádel y por qué la suela importa tanto.",
    tags: ["padel", "calzado", "guias"],
    metaTitle: "Zapatillas de pádel: por qué no valen las de running | Zona Sport",
    metaDescription:
      "Suela, sujeción lateral y amortiguación: por qué necesitas zapatillas específicas de pádel y no las de running. Pruébalas en Zona Sport (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_PADEL,
    category: "Pádel",
    contentMd: `Mucha gente empieza a jugar al pádel con sus zapatillas de running. Es un error que se paga con resbalones y tobillos torcidos. Te contamos por qué.

## El pádel se juega de lado

En running el pie va siempre hacia delante. En pádel haces arrancadas, frenadas y desplazamientos laterales constantes. Una zapatilla de running no está preparada para ese movimiento: no sujeta el lateral del pie y la suela no agarra bien en la pista.

## Qué buscar en una zapatilla de pádel

- **Suela de espiga (o mixta)**: agarra en pista de moqueta y hormigón y ayuda a frenar sin patinar.
- **Refuerzo lateral**: mantiene el pie estable en los apoyos cruzados.
- **Puntera reforzada**: protege en los arrastres típicos al rematar.
- **Amortiguación media**: suficiente para absorber, pero sin tanta altura como una asfaltera (cuanto más alta, más riesgo de torcer el tobillo).

## La suela: el detalle que más se nota

En una pista de cristal con polvo, una suela de running lisa resbala. La espiga de una zapatilla de pádel evacúa ese polvo y te da seguridad para apretar en cada bola.

## Talla y horma

Busca un ajuste firme pero sin apretar los dedos. El pie no debe bailar dentro, porque en los frenazos se va hacia delante y acabas con molestias en las uñas.

En Zona Sport tenemos calzado específico de pádel y te ayudamos a encontrar la horma que mejor te va. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te orientamos según cómo y dónde juegas.`,
  },
  {
    slug: "grip-y-overgrip-de-padel-guia-rapida",
    title: "Grip y overgrip de pádel: la guía rápida que necesitabas",
    excerpt:
      "Diferencia entre grip y overgrip, cuándo cambiarlos y cómo elegir entre liso o perforado según cómo sudes.",
    tags: ["padel", "accesorios", "guias"],
    metaTitle: "Grip y overgrip de pádel: guía rápida | Zona Sport",
    metaDescription:
      "Qué diferencia hay entre grip y overgrip, cuándo cambiarlos y cuál elegir según cómo sudes. Encuéntralos en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_PADEL,
    category: "Pádel",
    contentMd: `Es el accesorio más barato del pádel y el que más impacto tiene en tu juego. Si el agarre falla, fallas tú. Vamos al grano.

## Grip y overgrip no son lo mismo

- El **grip** es la cinta base que viene de fábrica en el puño. Da grosor y forma al agarre.
- El **overgrip** es una cinta fina que se enrolla encima del grip. Es lo que se ensucia, se desgasta y se cambia con frecuencia.

La idea es no desgastar nunca el grip original: el overgrip lo protege y se sustituye cuando hace falta.

## Liso o perforado

- **Perforado**: absorbe mejor el sudor. Perfecto si sudas mucho de manos o juegas en verano.
- **Liso**: ofrece un tacto más suave y pegajoso. Va bien si no sudas en exceso y buscas sensación firme.

Hay también modelos "tacky" muy pegajosos y otros más secos. Es cuestión de probar y quedarte con el que te dé seguridad.

## Cuándo cambiar el overgrip

Cámbialo cada cuatro o seis sesiones, o antes si lo notas resbaladizo, deshilachado o duro. Una señal clara: si tienes que apretar la pala más de la cuenta para que no se mueva, ya toca.

## Truco de grosor

Si la pala se te va de la mano, puedes poner un overgrip sin quitar el anterior para ganar grosor. Si te molesta el tamaño del puño, quita el viejo antes de poner el nuevo.

En Zona Sport tenemos grips y overgrips de varias texturas. Pregúntanos por WhatsApp al 689 11 06 91 cuál encaja con tu mano o pásate por la tienda en C. Silos 3, Puebla de la Calzada, y te dejamos tocarlos.`,
  },
  {
    slug: "ropa-de-padel-que-ponerse-para-jugar-comodo",
    title: "Ropa de pádel: qué ponerse para jugar cómodo todo el año",
    excerpt:
      "Tejidos técnicos, capas según la temporada y qué priorizar en camiseta, pantalón y calcetines para moverte sin agobios.",
    tags: ["padel", "ropa", "guias"],
    metaTitle: "Ropa de pádel: qué ponerse para jugar cómodo | Zona Sport",
    metaDescription:
      "Tejidos técnicos, capas por temporada y qué priorizar en ropa de pádel para jugar cómodo. Encuentra tu equipación en Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_PADEL,
    category: "Pádel",
    contentMd: `En pádel sudas, te desplazas y giras mucho. La ropa adecuada no te hace mejor jugador, pero la mala te molesta en cada punto. Esto es lo que recomendamos.

## Tejido técnico, nunca algodón

El algodón se empapa, pesa y se queda frío. Busca tejidos técnicos que transpiren y sequen rápido. Te mantienen seco y evitan rozaduras en partidos largos.

## Camiseta y parte de arriba

Una camiseta técnica de manga corta vale para casi todo el año. En invierno, añade una manga larga fina o una sudadera ligera para el calentamiento, que te quitas al entrar en calor. Tres capas finas calientan más y son más versátiles que una gruesa.

## Pantalón corto, falda o malla

Aquí manda la comodidad personal. Lo importante es que tenga bolsillos para las bolas y que no te apriete en los desplazamientos. Muchas jugadoras prefieren falda con malla integrada; otras, mallas o pantalón corto. No hay opción mejor, hay la que te deje moverte libre.

## No te olvides de los calcetines

Un buen calcetín técnico con refuerzo evita ampollas y mantiene el pie seco. Es de esas cosas que no se ven pero se notan al tercer set.

## Para el frío y el sol

- En invierno: cortavientos ligero y gorro fino para el calentamiento.
- En verano: gorra o visera y, si juegas al aire libre, ropa clara que no concentre tanto el calor.

En Zona Sport tienes equipación de pádel para hombre, mujer y junior. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te montamos un equipo cómodo para la temporada que viene.`,
  },

  {
    slug: "paletero-de-padel-como-elegir-el-tuyo",
    title: "Paletero de pádel: cómo elegir el tuyo (y qué meter dentro)",
    excerpt:
      "Capacidad, compartimento térmico y comodidad de transporte. Lo que importa al elegir paletero y cómo organizarlo bien.",
    tags: ["padel", "accesorios", "guias"],
    metaTitle: "Paletero de pádel: cómo elegir el tuyo | Zona Sport",
    metaDescription:
      "Capacidad, compartimento térmico y transporte: cómo elegir tu paletero de pádel y organizarlo. Encuéntralo en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_PADEL,
    category: "Pádel",
    contentMd: `El paletero es el compañero silencioso del paddlero. Bien elegido, te cabe todo y protege tus palas; mal elegido, vas cargando un bulto incómodo. Te ayudamos a acertar.

## Empieza por la capacidad

Piensa en cuántas palas llevas y qué más metes:

- Si solo llevas **una o dos palas** y lo justo, te basta un paletero compacto o incluso una mochila de pádel.
- Si cargas **varias palas, ropa de cambio, calzado y botellas**, busca un paletero grande con varios compartimentos.

No te pases de tamaño "por si acaso": un paletero enorme medio vacío es incómodo de llevar.

## El compartimento térmico

Muchos paleteros incluyen un compartimento térmico aislado. No es un capricho: protege las palas del calor del maletero, que es justo lo que reblandece la goma. Si juegas en verano y dejas el paletero en el coche, este detalle importa de verdad.

## Comodidad de transporte

- **Asas y bandolera acolchadas**: si caminas hasta la pista, lo agradeces.
- **Formato mochila**: cada vez más popular por repartir el peso en la espalda.
- **Bolsillo para zapatillas separado**: mantiene el calzado sucio lejos de la ropa limpia.

## Cómo organizarlo

Palas en el compartimento térmico, ropa y toalla en el principal, calzado en su bolsillo aparte, y los accesorios pequeños (overgrips, botes, llaves) en los bolsillos exteriores. Así no revuelves todo cada vez que buscas algo.

## Pruébalo cargado

Como toda mochila o bolsa, el paletero se valora **con peso dentro**, no vacío. En Zona Sport tienes paleteros y mochilas de pádel de distintos tamaños y te ayudamos a elegir según lo que sueles llevar. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91.`,
  },

  // =================================================================== RUNNING
  {
    slug: "como-elegir-zapatillas-de-running-segun-tu-pisada",
    title: "Cómo elegir zapatillas de running según tu pisada y tu peso",
    excerpt:
      "Amortiguación, drop, peso del corredor y tipo de pisada: los factores que de verdad importan al comprar zapatillas para correr.",
    tags: ["running", "calzado", "guias"],
    metaTitle: "Cómo elegir zapatillas de running según tu pisada | Zona Sport",
    metaDescription:
      "Amortiguación, drop, peso y tipo de pisada: cómo elegir zapatillas de running que te encajen. Te asesoramos en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_RUNNING,
    category: "Running",
    contentMd: `Comprar zapatillas de running sin criterio es la forma más rápida de acabar con molestias. Estos son los factores que sí importan.

## Tu peso y tus kilómetros

Cuanto más pesas y más entrenas, más amortiguación necesitas. Un corredor que sale tres veces por semana no necesita lo mismo que quien rueda a diario. Sé honesto con tu volumen real, no con el que te gustaría hacer.

## El tipo de pisada

- **Neutra**: el pie apoya de forma equilibrada. La mayoría de corredores entran aquí.
- **Pronadora**: el tobillo se hunde hacia dentro. Puede convenir una zapatilla con soporte.
- **Supinadora**: el apoyo se va hacia fuera. Suele pedir amortiguación neutra y flexible.

No te obsesiones: muchas molestias se resuelven antes con una zapatilla cómoda y bien tallada que con una "correctora".

## El drop

Es la diferencia de altura entre talón y puntera. Un drop alto (8-12 mm) descarga el gemelo y el tendón; uno bajo (0-6 mm) trabaja más el pie. Si vienes de drop alto, no bajes de golpe.

## La talla, sin atajos

Deja un dedo de margen en la puntera: el pie se hincha al correr y una talla justa daña las uñas a los pocos kilómetros. Y recuerda que la horma cambia según la marca: dos zapatillas del mismo número pueden calzar muy distinto, así que fíate de cómo te quedan, no solo del número.

## La superficie también cuenta

No es lo mismo rodar siempre por asfalto que combinar con caminos de tierra. Para asfalto, una zapatilla con buena amortiguación; si pisas tierra y monte a menudo, valora una de trail con taco para no resbalar.

## Pruébalas con calma

En Zona Sport te dejamos probarlas, andar y notar la amortiguación real. Si nos cuentas tu peso, tus kilómetros y dónde corres, afinamos mucho la recomendación y evitamos que te lleves un modelo que no es para ti. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91.`,
  },
  {
    slug: "pronador-o-supinador-como-saber-tu-tipo-de-pisada",
    title: "¿Pronador o supinador? Cómo saber tu tipo de pisada",
    excerpt:
      "Trucos sencillos para identificar tu pisada en casa, qué significa cada tipo y por qué no debes obsesionarte con ello.",
    tags: ["running", "pisada", "guias"],
    metaTitle: "Pronador o supinador: cómo saber tu pisada | Zona Sport",
    metaDescription:
      "Trucos para saber si eres pronador o supinador y qué zapatilla te conviene. Resuelve dudas sin agobios en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_RUNNING,
    category: "Running",
    contentMd: `"¿Soy pronador o supinador?" es la pregunta estrella en la tienda. Te damos formas caseras de saberlo y un poco de perspectiva.

## Qué significa cada tipo

Al apoyar el pie, el tobillo rota de forma natural para amortiguar. Según cuánto rote, hablamos de:

- **Pisada neutra**: rotación equilibrada. Es la más común.
- **Pronación**: el tobillo se hunde hacia dentro más de lo normal.
- **Supinación**: el apoyo se va hacia fuera.

## Trucos para identificarla en casa

1. **Mira tus zapatillas viejas**: si la suela se desgasta más por dentro, tiendes a pronar; si por fuera, a supinar.
2. **El test de la huella mojada**: moja el pie y písalo sobre cartón. Una huella muy completa suele ir con pronación; una con poco puente, con supinación.
3. **Fíjate en cómo se gastan las suelas con los kilómetros**, no en una sola salida.

## No te obsesiones

El tipo de pisada es solo una pieza más. El peso, los kilómetros, la superficie y, sobre todo, la comodidad pesan tanto o más. Hemos visto corredores "pronadores" perfectamente felices con zapatilla neutra y al revés. La clave es que no aparezcan molestias.

## Cuándo conviene mirar más a fondo

Si arrastras dolores recurrentes de rodilla, espinilla o cadera, ahí sí merece la pena un estudio de pisada con un profesional. Para el corredor popular sano, con una zapatilla cómoda y bien tallada suele bastar.

En Zona Sport te ayudamos a interpretar el desgaste de tus zapatillas y a elegir el siguiente par sin meterte miedo. Pásate por C. Silos 3, en Puebla de la Calzada, o pregúntanos por WhatsApp al 689 11 06 91.`,
  },
  {
    slug: "empezar-a-correr-de-cero-plan-y-consejos",
    title: "Empezar a correr de cero: plan sencillo y consejos para no abandonar",
    excerpt:
      "Un enfoque progresivo para quien sale a correr por primera vez: ritmo, frecuencia y los errores que llevan al abandono en tres semanas.",
    tags: ["running", "principiantes", "salud"],
    metaTitle: "Empezar a correr de cero: plan y consejos | Zona Sport",
    metaDescription:
      "Plan progresivo para empezar a correr de cero sin lesionarte ni abandonar. Consejos prácticos y material en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_RUNNING,
    category: "Running",
    contentMd: `Empezar a correr es de lo mejor que puedes hacer por tu salud, y de lo más fácil de abandonar si lo enfocas mal. Aquí tienes un plan realista.

## La regla de oro: progresa despacio

El error número uno es salir a tope el primer día. Las piernas aguantan, pero los tendones y articulaciones necesitan semanas para adaptarse. Si te pasas, llega la molestia y, con ella, el abandono.

## Empieza caminando y trotando

Durante las primeras semanas, alterna. Por ejemplo: un minuto trotando suave y dos caminando, repetido varias veces. Cada semana subes un poco el tiempo de trote. En un mes o mes y medio, mucha gente encadena 20-30 minutos seguidos.

## Frecuencia y descanso

Tres días por semana es perfecto para empezar, dejando un día de descanso entre medias. El descanso no es perder el tiempo: es cuando el cuerpo se adapta.

## El ritmo correcto

Deberías poder hablar mientras corres. Si vas ahogado, vas demasiado rápido. Ir lento al principio no es hacer trampa, es construir base.

## Lo que sí necesitas

- **Zapatillas con amortiguación** acordes a tu peso. Es la inversión que más importa.
- **Ropa técnica** que transpire (nada de algodón).
- Ganas de ser constante más que de ser rápido.

## Evita estos fallos

- Compararte con otros.
- Saltarte el calentamiento y los estiramientos suaves.
- Correr con zapatillas viejas o inadecuadas.

En Zona Sport te ayudamos a elegir tus primeras zapatillas según tu peso y tus objetivos, sin venderte de más. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y empezamos por lo importante.`,
  },
  {
    slug: "ropa-tecnica-para-correr-por-que-importa",
    title: "Ropa técnica para correr: por qué importa más de lo que crees",
    excerpt:
      "Transpiración, costuras, ajuste y reflectantes: qué diferencia una camiseta técnica de una normal y cómo elegir bien.",
    tags: ["running", "ropa", "guias"],
    metaTitle: "Ropa técnica para correr: por qué importa | Zona Sport",
    metaDescription:
      "Transpiración, costuras y ajuste: por qué la ropa técnica marca la diferencia al correr y cómo elegirla. Encuéntrala en Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_RUNNING,
    category: "Running",
    contentMd: `Puedes correr con una camiseta vieja de algodón, sí. Pero en cuanto pruebas ropa técnica, no vuelves atrás. Te explicamos por qué.

## El problema del algodón

El algodón absorbe el sudor y lo retiene. Resultado: una camiseta empapada que pesa, se enfría y roza. La ropa técnica hace lo contrario: aleja el sudor de la piel y lo evapora rápido, así te mantienes seco y a buena temperatura.

## Qué mirar en una prenda técnica

- **Tejido transpirable** que seque rápido.
- **Costuras planas** para evitar rozaduras en pezones, axilas e ingles, las zonas que más sufren en tiradas largas.
- **Ajuste correcto**: ni tan apretado que moleste ni tan suelto que ondee y roce.
- **Detalles reflectantes** si corres al amanecer o al anochecer. La visibilidad es seguridad.

## Capas según el frío

En invierno, olvídate del forro polar gordo. Funcionan mejor varias capas finas: base técnica, capa térmica ligera si hace mucho frío y un cortavientos plegable para el viento. Te quitas capas según entras en calor.

## La parte de abajo y los calcetines

Una malla o pantalón técnico evita rozaduras en muslos. Y no subestimes el calcetín técnico: el bueno previene ampollas y mantiene el pie seco, justo lo que el algodón no hace.

## Para el verano

Busca prendas claras, ligeras y con buena ventilación. Una gorra o visera ayuda con el sol, que en Extremadura aprieta de lo lindo.

En Zona Sport tienes ropa técnica de running para todas las estaciones. Pásate por C. Silos 3, en Puebla de la Calzada, o pregúntanos por WhatsApp al 689 11 06 91 y te montamos un kit cómodo según cuándo y dónde corres.`,
  },
  {
    slug: "cuanto-duran-las-zapatillas-de-running-y-cuando-cambiarlas",
    title: "¿Cuánto duran las zapatillas de running? Señales para cambiarlas a tiempo",
    excerpt:
      "Los kilómetros no lo dicen todo. Aprende a leer la suela y la entresuela para retirar tus zapatillas antes de que te pasen factura.",
    tags: ["running", "calzado", "cuidados"],
    metaTitle: "Cuánto duran las zapatillas de running | Zona Sport",
    metaDescription:
      "Cuándo cambiar tus zapatillas de running: señales en la suela y la entresuela que avisan antes de las molestias. Te ayudamos en Zona Sport (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_RUNNING,
    category: "Running",
    contentMd: `Estirar las zapatillas más de la cuenta sale caro: la amortiguación muere antes de que la suela se rompa, y entonces llegan las molestias. Aprende a leer las señales.

## La cifra orientativa

Una zapatilla de asfalto estándar suele rendir bien entre 600 y 800 kilómetros. Es solo una referencia: pesas, técnica y superficie cambian mucho ese número. Por eso conviene fijarse en el estado real, no solo en el contador.

## Señales de que están acabadas

- **Suela lisa** en el talón o el antepié: pierdes tracción y la pisada se descompensa.
- **Arrugas marcadas** en la espuma de la entresuela: la EVA ha perdido densidad y ya no amortigua igual.
- **La zapatilla se deforma** o se inclina hacia un lado al ponerla en una mesa.
- **Aparecen molestias** que no tenías en rodilla, espinilla o fascia. A veces la culpa es del calzado vencido.

## El truco de los dos pares

Si corres varios días por semana, tener dos pares en rotación hace que cada uno dure más: la espuma necesita 24-48 horas para recuperar su forma tras un uso intenso. Además, repartes el desgaste.

## No esperes al agujero

El error clásico es esperar a que la suela se rompa o asome el dedo. Para entonces llevas cientos de kilómetros corriendo sin amortiguación real. Cambia por sensación y por desgaste, no por rotura.

## Tráenoslas si tienes dudas

En Zona Sport te miramos las zapatillas en cinco minutos y te decimos con sinceridad si aún tienen recorrido o si conviene renovarlas. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91. Y cuando toque cambiar, te ayudamos a acertar con el siguiente par.`,
  },
  {
    slug: "correr-en-verano-en-extremadura-sin-morir-en-el-intento",
    title: "Correr en verano en Extremadura sin morir en el intento",
    excerpt:
      "Horas, hidratación, ropa y rutas con sombra para entrenar con calor extremeño sin pasarlo mal ni arriesgar la salud.",
    tags: ["running", "verano", "extremadura"],
    metaTitle: "Correr en verano en Extremadura: guía práctica | Zona Sport",
    metaDescription:
      "Horarios, hidratación, ropa y rutas con sombra para correr en verano en Extremadura sin riesgos. Consejos y equipación en Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_RUNNING,
    category: "Running",
    contentMd: `En Extremadura el verano no perdona. Correr con 38 grados al mediodía no es valiente, es imprudente. Así se entrena con calor sin pasarlo mal.

## Elige bien la hora

Las mejores franjas son antes de las 9:00 y después de las 21:00. A primera hora el suelo aún no irradia calor y el ambiente es más respirable. Evita por completo el tramo de 12:00 a 20:00 en los días de ola de calor.

## Hidrátate antes, durante y después

Bebe agua antes de salir, no solo cuando ya tienes sed. En salidas de más de una hora, lleva agua y da sorbos cada poco. Si sudas mucho o pasas de 90 minutos, añade sales para reponer el sodio que pierdes.

## Ropa pensada para el calor

- Prendas **claras y ligeras** que reflejen el sol.
- **Tejido técnico** muy transpirable.
- **Gorra o visera** y gafas de sol.
- Crema solar en hombros, cuello y cara.

## Busca sombra y agua

En la zona, la ribera del Guadiana ofrece tramos llanos y con sombra a ratos. Los parques urbanos con árboles son buena opción para series cortas a última hora. Evita el asfalto a pleno sol: acumula y devuelve calor.

## Escucha al cuerpo

Mareo, piel de gallina con calor, dejar de sudar o dolor de cabeza son señales de alarma. Para, busca sombra, hidrátate y, si no mejoras, pide ayuda. Ningún entreno vale un golpe de calor.

## Baja el ritmo sin culpa

Con calor, el corazón trabaja más para lo mismo. Es normal ir más lento. No te compares con tus marcas de primavera.

En Zona Sport tienes ropa técnica de verano, gorras y calcetines que ayudan de verdad. Pásate por C. Silos 3, en Puebla de la Calzada, o pregúntanos por WhatsApp al 689 11 06 91.`,
  },

  // ==================================================================== FÚTBOL
  {
    slug: "botas-de-futbol-fg-ag-o-turf-cual-elegir",
    title: "Botas de fútbol FG, AG o turf: cuál elegir según el campo",
    excerpt:
      "Césped natural, artificial o de moqueta: cada superficie pide una suela distinta. Te explicamos qué significan FG, AG y TF.",
    tags: ["futbol", "botas", "guias"],
    metaTitle: "Botas de fútbol FG, AG o turf: cuál elegir | Zona Sport",
    metaDescription:
      "FG, AG y TF explicados: qué suela de botas de fútbol te conviene según el campo donde juegas. Pruébalas en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_FUTBOL,
    category: "Fútbol",
    contentMd: `Elegir mal la suela de las botas no solo arruina el agarre: aumenta el riesgo de lesión y desgasta las botas antes de tiempo. Aclaremos las siglas.

## Qué significa cada una

- **FG (Firm Ground)**: tacos para **césped natural** seco o en buen estado. Es la suela clásica de tacos.
- **AG (Artificial Ground)**: tacos más numerosos y cortos, pensados para **césped artificial** de última generación. Reparten mejor la presión y duran más en este tipo de campo.
- **TF (Turf)**: suela de muchos tacos pequeños de goma para **moqueta o césped artificial muy viejo y duro**. También va bien para entrenar.

## La regla práctica

- Juegas en **tierra o césped artificial** (lo más común en muchos campos de la zona): tira a **AG** o **TF**.
- Juegas en **césped natural** de verdad: **FG**.
- Tienes un solo par para todo: **AG** suele ser la opción más versátil para el fútbol moderno.

## Por qué importa de verdad

Usar tacos FG largos en moqueta dura castiga las rodillas y los tobillos, porque el taco no penetra y se queda clavado. Y usar TF en césped natural blando te deja sin agarre. Cada suela tiene su sitio.

## El ajuste manda

Las botas deben ir ajustadas, casi como un guante, pero sin machacar los dedos. Una bota holgada hace que el pie baile y resta precisión y seguridad.

En Zona Sport te ayudamos a elegir la suela según dónde juegas habitualmente y te dejamos probar la horma. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y cuéntanos en qué campo juegas.`,
  },
  {
    slug: "botas-de-futbol-para-ninos-como-acertar",
    title: "Botas de fútbol para niños: cómo acertar con la talla y la suela",
    excerpt:
      "Crecimiento, seguridad y tipo de campo: lo que de verdad importa al comprar las botas del peque, sin gastar de más.",
    tags: ["futbol", "ninos", "botas"],
    metaTitle: "Botas de fútbol para niños: cómo acertar | Zona Sport",
    metaDescription:
      "Talla, suela y seguridad: cómo acertar con las botas de fútbol de tu hijo sin gastar de más. Te asesoramos en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_FUTBOL,
    category: "Fútbol",
    contentMd: `El pie del niño crece rápido y las botas se quedan pequeñas en un visto y no visto. Con un par de criterios aciertas y no tiras el dinero.

## La suela, según el campo

En fútbol base, la mayoría de partidos y entrenos son en césped artificial o tierra. Para eso, la suela **multitaco (AG)** o de **moqueta (TF)** es la más segura y versátil. Evita tacos de aluminio largos: en campos duros no penetran y aumentan el riesgo de torceduras.

## La talla: ni justa ni "para que le crezca"

Es tentador comprar dos números más "para que le duren". No lo hagas: una bota grande hace que el pie baile, resta control y favorece ampollas y torceduras. Lo correcto es dejar alrededor de un centímetro de margen entre el dedo más largo y la punta, y revisar cada dos o tres meses.

## Seguridad por encima de todo

- **Espinilleras obligatorias** desde que empieza a jugar partidos.
- **Calcetines de fútbol** que sujeten bien las espinilleras.
- Bota ligera y flexible, adecuada a su edad.

## No hace falta lo más caro

A estas edades, lo importante es que la bota ajuste bien, agarre en su campo y sea cómoda. Las prestaciones de gama alta no aportan nada a un niño que está aprendiendo, y se le quedan pequeñas igual de rápido.

## Mídele el pie sin prisa

En Zona Sport medimos el pie del peque y te ayudamos a elegir talla y suela según dónde juega su equipo. Tráelo a la tienda en C. Silos 3, en Puebla de la Calzada, mejor a una hora tranquila, o escríbenos por WhatsApp al 689 11 06 91 si quieres que te preparemos opciones.`,
  },
  {
    slug: "futbol-sala-que-zapatillas-y-equipacion-necesitas",
    title: "Fútbol sala: qué zapatillas y equipación necesitas",
    excerpt:
      "La pista pide suela específica y un calzado distinto al del césped. Te contamos qué buscar para jugar a fútbol sala con seguridad.",
    tags: ["futbol-sala", "calzado", "guias"],
    metaTitle: "Fútbol sala: zapatillas y equipación necesaria | Zona Sport",
    metaDescription:
      "Suela de goma, sujeción y equipación: qué necesitas para jugar a fútbol sala. Encuentra tu calzado en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_FUTBOL,
    category: "Fútbol",
    contentMd: `El fútbol sala se juega en pista lisa, no en césped. Eso cambia por completo el calzado que necesitas. Aquí tienes lo esencial.

## Zapatillas de sala, no botas

Para fútbol sala necesitas zapatillas de **suela de goma lisa (IC, indoor)**, que no marca el pavimento y agarra en pista interior. Nada de tacos: en suelo liso resbalan y no frenan. La suela suele ser de goma no marcante, justo para pistas de pabellón.

## Qué buscar en el calzado

- **Suela de goma adherente** y plana.
- **Sujeción lateral** para los cambios de dirección rápidos.
- **Amortiguación contenida**: la pista es dura y los apoyos, constantes.
- **Puntera resistente** para los disparos y los regates pegados al suelo.

## La equipación básica

- **Camiseta y pantalón** técnicos y ligeros, que transpiren.
- **Medias o calcetines de fútbol sala** que sujeten la espinillera.
- **Espinilleras**: aunque parezca un deporte "de interior", los choques existen.

## El ajuste, otra vez clave

Como en cualquier deporte de pista, el pie no debe bailar dentro de la zapatilla. En los frenazos se va hacia delante, y una talla holgada acaba molestando en las uñas y restando control del balón.

## Para entrenar y para competir

Si juegas en liga, te conviene un par solo para pista, para que la suela no llegue sucia ni gastada de la calle. Para empezar, con unas buenas zapatillas de sala vas sobrado.

En Zona Sport tenemos calzado de fútbol sala para adulto y niño y te ayudamos con la talla y la horma. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91.`,
  },
  {
    slug: "espinilleras-de-futbol-tipos-y-como-elegir-talla",
    title: "Espinilleras de fútbol: tipos y cómo elegir la talla correcta",
    excerpt:
      "Con o sin tobillera, de inserción o con sujeción: qué espinillera elegir según la edad y el nivel, y cómo acertar con la talla.",
    tags: ["futbol", "espinilleras", "guias"],
    metaTitle: "Espinilleras de fútbol: tipos y talla | Zona Sport",
    metaDescription:
      "Tipos de espinilleras de fútbol y cómo elegir la talla según la altura. Protección para niños y adultos en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_FUTBOL,
    category: "Fútbol",
    contentMd: `Las espinilleras son obligatorias y, bien elegidas, te ahorran más de un susto. Te contamos los tipos y cómo acertar con la talla.

## Tipos principales

- **De inserción (slip-in)**: una placa fina que se mete en una funda o se sujeta con la propia media. Ligeras y discretas, las prefieren muchos jugadores con nivel.
- **Con sujeción y tobillera**: incluyen cintas y protección del tobillo. Más completas y recomendables para niños y para quien quiere máxima protección.
- **Con velcro o manguito**: se ajustan al gemelo con una cinta o una funda elástica. Buen equilibrio entre sujeción y comodidad.

## Cómo elegir la talla

La talla se basa sobre todo en la **altura del jugador**. La regla práctica: la espinillera debe cubrir desde un par de dedos por encima del tobillo hasta un par de dedos por debajo de la rodilla. Ni tan corta que deje la espinilla al aire ni tan larga que moleste al correr.

La mayoría de marcas indican un rango de estatura por talla. Para niños, mejor ajustarse a ese rango que comprar grande "para que le dure".

## Para los más pequeños

En fútbol base, prioriza la protección y la sujeción: las espinilleras con tobillera y cintas se mueven menos y aguantan mejor los golpes y choques típicos de esas edades.

## Cómo se llevan bien

Van debajo de la media, sujetas para que no bailen. Si se mueven, no protegen donde deben. Algunos usan cinta o portaespinilleras para fijarlas.

En Zona Sport tenemos espinilleras para todas las edades y te ayudamos a acertar con la talla según la altura. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91.`,
  },
  {
    slug: "equipaciones-de-futbol-para-tu-equipo-o-tu-peque",
    title: "Equipaciones de fútbol: qué mirar para tu equipo o tu peque",
    excerpt:
      "Tejido, tallaje y comodidad por encima del diseño. Lo que conviene saber antes de comprar una equipación completa.",
    tags: ["futbol", "equipaciones", "ropa"],
    metaTitle: "Equipaciones de fútbol: qué mirar al comprar | Zona Sport",
    metaDescription:
      "Tejido técnico, tallaje y comodidad: qué mirar al comprar una equipación de fútbol para tu peque o tu equipo. Te ayudamos en Zona Sport (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_FUTBOL,
    category: "Fútbol",
    contentMd: `Una equipación de fútbol no es solo camiseta, pantalón y medias bonitos. Hay detalles que marcan la comodidad de toda la temporada. Te contamos qué priorizar.

## Tejido técnico, siempre

El fútbol es sudor y esfuerzo. Busca tejidos técnicos que transpiren y sequen rápido, en lugar de algodón que se empapa y pesa. La diferencia se nota en la segunda parte de cada partido.

## El tallaje, sin prisas

- Para **niños**, evita comprar muy grande "para que le dure": una camiseta enorme molesta y un pantalón holgado se cae. Mejor un punto holgado para crecer, pero sin exagerar.
- Para **adultos**, piensa si la quieres ajustada o más suelta según la posición y tu gusto. Lo importante es que no limite el movimiento.

## Las medias, ese detalle olvidado

Unas medias de fútbol de calidad sujetan bien las espinilleras y no se escurren. Las baratas se caen y aprietan el gemelo. Es de esas cosas pequeñas que se agradecen.

## Diseño, lo último

El color y el escudo son lo que más ilusión hacen, sobre todo a los peques. Perfecto, pero que no sea lo único que mires: una equipación incómoda se nota cada domingo.

## Para clubes y grupos

Si necesitas varias equipaciones iguales para un equipo, escuela o grupo de amigos, podemos ayudarte a organizar el pedido y cuadrar tallas. Cuéntanos cuántos sois y qué buscáis.

En Zona Sport tenemos equipaciones y prendas de fútbol para niños y adultos. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y lo vemos juntos, con calma y sin compromiso.`,
  },

  // ============================================================ NIÑOS Y BEBÉ
  {
    slug: "tallas-de-calzado-infantil-guia-para-acertar",
    title: "Tallas de calzado infantil: guía para acertar (y no quedarte corto)",
    excerpt:
      "El pie del niño crece rápido y a saltos. Te damos la regla del centímetro y cada cuánto conviene revisar la talla.",
    tags: ["ninos", "calzado", "guias"],
    metaTitle: "Tallas de calzado infantil: guía para acertar | Zona Sport",
    metaDescription:
      "La regla del centímetro, cada cuánto revisar y cómo medir el pie del niño para acertar con la talla. Te ayudamos en Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_NINOS,
    category: "Niños y bebé",
    contentMd: `Acertar con la talla del calzado infantil tiene truco: el pie crece rápido, a saltos, y cada marca talla un poco distinto. Aquí va lo que funciona.

## La regla del centímetro

Deja alrededor de **un centímetro** de margen entre el dedo más largo y la punta de la zapatilla. Es el espacio que necesita el pie para moverse y crecer un poco sin quedarse corto en dos semanas. Menos de eso, se queda pequeño enseguida; mucho más, el pie baila y favorece tropiezos y rozaduras.

## Revisa cada dos o tres meses

Hasta los doce años, el pie puede crecer uno o dos milímetros al mes. No esperes a que el niño se queje (a veces no lo hace y fuerza el pie en silencio). Hazte el hábito de comprobar el margen cada dos o tres meses.

## Cómo medir en casa

Pon el pie del niño sobre un papel, marca el talón y la punta del dedo más largo, y mide. Hazlo de pie y por la tarde, cuando el pie está un poco más hinchado. Compara con la guía de tallas de la marca, porque no todas coinciden.

## Cuidado con heredar calzado muy usado

Pasar zapatillas entre hermanos está bien si están en buen estado, pero un calzado muy gastado tiene la entresuela deformada por la pisada del primero. Eso obliga al segundo niño a un apoyo que no es el suyo.

## Mejor probárselas

Las tallas orientan, pero la horma cambia según la marca y el modelo. Por eso lo ideal es probar.

En Zona Sport medimos el pie del peque y te ayudamos a elegir talla y horma sin agobios. Tráelo a la tienda en C. Silos 3, Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te orientamos.`,
  },
  {
    slug: "primeras-zapatillas-del-bebe-cuando-y-cuales",
    title: "Las primeras zapatillas del bebé: cuándo y cuáles",
    excerpt:
      "Antes de andar, el pie necesita libertad. Te contamos cuándo poner el primer calzado y qué características debe tener.",
    tags: ["bebe", "calzado", "ninos"],
    metaTitle: "Primeras zapatillas del bebé: cuándo y cuáles | Zona Sport",
    metaDescription:
      "Cuándo poner las primeras zapatillas al bebé y qué características buscar: flexibles, ligeras y respetuosas. Te asesoramos en Zona Sport (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_NINOS,
    category: "Niños y bebé",
    contentMd: `Las primeras zapatillas del bebé generan muchas dudas. La idea principal es sencilla: antes de andar bien, cuanto menos calzado, mejor.

## Antes de caminar: pie libre

Mientras el bebé no anda, el pie necesita moverse con libertad para desarrollar musculatura y equilibrio. En casa, descalzo o con calcetines antideslizantes es lo mejor. El calzado rígido a estas edades no aporta y limita.

## Cuándo poner el primer calzado de verdad

Cuando el peque empieza a dar pasos y, sobre todo, a salir a la calle, llega el momento del primer calzado. Su función es **proteger del frío y del suelo**, no "enseñar a andar": eso lo hace el propio pie.

## Qué características buscar

- **Flexible**: debe doblarse con facilidad en la zona de los dedos. Si la suela es rígida como una tabla, descártala.
- **Ligero**: cuanto menos pese, mejor para sus pasos inseguros.
- **Suela fina y antideslizante**: que note el suelo pero no resbale.
- **Espacio para los dedos**: puntera ancha donde el pie se mueva a gusto.
- **Sujeción suave** con velcro, fácil de poner y quitar.

## La talla, con margen pero sin pasarse

Como en todo el calzado infantil, deja un margen para crecer, pero sin que el pie baile. Y revisa con frecuencia: a estas edades crecen muy rápido.

## Déjate aconsejar

En Zona Sport te ayudamos a elegir un primer calzado flexible y respetuoso, y medimos el pie del bebé con cuidado. Pásate por la tienda en C. Silos 3, Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te orientamos sin compromiso.`,
  },
  {
    slug: "ropa-deportiva-para-ninos-que-priorizar",
    title: "Ropa deportiva para niños: qué priorizar de verdad",
    excerpt:
      "Comodidad, libertad de movimiento y tejidos que aguanten lavados. Lo que importa al vestir a un peque que no para quieto.",
    tags: ["ninos", "ropa", "guias"],
    metaTitle: "Ropa deportiva para niños: qué priorizar | Zona Sport",
    metaDescription:
      "Comodidad, libertad de movimiento y resistencia: qué priorizar en la ropa deportiva de tu hijo. Encuéntrala en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_NINOS,
    category: "Niños y bebé",
    contentMd: `Los niños corren, saltan, se manchan y sudan. Su ropa deportiva tiene que aguantar todo eso sin molestarles. Te contamos en qué fijarte.

## Comodidad y libertad de movimiento

Lo primero es que la ropa **no limite**. Costuras que no rocen, cinturas elásticas que no aprieten y un corte que les deje moverse a sus anchas. Un niño incómodo deja de disfrutar del deporte, y eso es justo lo que no queremos.

## Tejidos que transpiren y aguanten

- **Transpirables**: los peques sudan mucho jugando. Mejor tejidos técnicos o algodón ligero que no se queden empapados y fríos.
- **Resistentes a los lavados**: la ropa infantil pasa por la lavadora sin descanso. Busca prendas que no se deformen ni destiñan a las primeras.

## Tallaje: un punto holgado, sin exagerar

Comprar muy grande "para que le dure" suele salir mal: la ropa baila, los pantalones se caen y las mangas estorban. Un punto holgado para crecer está bien; dos tallas de más, no.

## Por capas para el cole y el deporte

Una camiseta técnica, una sudadera ligera y un cortavientos cubren casi todas las situaciones del curso. Así el peque se adapta al frío de la mañana y al calor del recreo quitándose o poniéndose capas.

## Que elija también él

Si el niño participa en elegir colores o diseño, se pone la ropa con más gusto. Combínalo con tu criterio de comodidad y tejido y todos contentos.

En Zona Sport tienes ropa deportiva infantil pensada para el día a día y para el deporte. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te ayudamos con tallas y combinaciones.`,
  },
  {
    slug: "vuelta-al-cole-equipacion-deportiva-sin-agobios",
    title: "Vuelta al cole: la equipación deportiva sin agobios ni sustos de talla",
    excerpt:
      "Chándal, zapatillas y bolsa de educación física: cómo organizar la compra de septiembre para que dure el curso.",
    tags: ["ninos", "vuelta-al-cole", "guias"],
    metaTitle: "Vuelta al cole: equipación deportiva sin agobios | Zona Sport",
    metaDescription:
      "Chándal, zapatillas y bolsa de EF: cómo organizar la vuelta al cole deportiva para que dure el curso. Te ayudamos en Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_NINOS,
    category: "Niños y bebé",
    contentMd: `Septiembre llega con prisas y listas interminables. Con la parte deportiva del cole organizada, la vuelta es mucho menos estresante. Aquí va una guía rápida.

## Lo esencial para educación física

- **Zapatillas cómodas y flexibles**, adecuadas para correr y saltar en el patio o el pabellón.
- **Chándal o conjunto deportivo** que transpire y aguante lavados.
- **Camisetas técnicas** de recambio, porque sudan y se manchan.
- **Bolsa o mochila** para llevar la ropa de cambio.

## La talla, sin esperar a octubre

Mide el pie del peque antes de comprar las zapatillas: en verano puede haber pegado un estirón. Deja un centímetro de margen y recuerda revisarlo a mitad de curso, porque seguirá creciendo.

## Pensar el curso entero

En lugar de comprar de golpe todo a contrarreloj, piensa en capas: una sudadera y un cortavientos cubren el frío de la mañana; una camiseta técnica, el calor del recreo. Así estiras la ropa todo el año.

## Calzado del cole vs. calzado de deporte

Si el niño hace deporte fuera del cole (fútbol, pádel, atletismo), puede necesitar calzado específico además del de educación física. No mezcles: las zapatillas de patio no rinden igual en un campo o una pista.

## Evita los agobios de última hora

Las semanas previas al inicio del curso son las de más jaleo. Si puedes, adelanta la compra de zapatillas y chándal.

En Zona Sport te ayudamos a preparar la vuelta al cole deportiva, medimos el pie y cuadramos tallas sin prisas. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y lo dejamos resuelto.`,
  },

  // ===================================================================== MARCAS
  {
    slug: "marca-joma-por-que-gusta-tanto",
    title: "Joma: por qué esta marca española gusta tanto en fútbol y pádel",
    excerpt:
      "Un repaso honesto a Joma, marca de Toledo con fuerte presencia en fútbol, fútbol sala, running y pádel. Qué esperar de ella.",
    tags: ["marcas", "joma", "futbol"],
    metaTitle: "Joma: por qué gusta tanto esta marca | Zona Sport",
    metaDescription:
      "Repaso honesto a Joma, marca española con fuerza en fútbol, fútbol sala y pádel. Conoce qué esperar y encuéntrala en Zona Sport (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_MARCAS,
    category: "Marcas",
    contentMd: `Joma es una de esas marcas que ves por todos los campos y pistas, y no es casualidad. Aquí va un repaso honesto, sin exagerar.

## Una marca española con raíces

Joma es una marca española, de Toledo, con muchas décadas a sus espaldas. Eso se nota en su fuerte presencia en el deporte de base de nuestro país: equipa a muchos clubes, escuelas y federaciones.

## Dónde brilla

- **Fútbol y fútbol sala**: es probablemente su terreno más fuerte. Botas, zapatillas de sala y equipaciones con buena relación calidad-precio.
- **Pádel**: zapatillas con suela específica y ropa pensada para la pista.
- **Running y entrenamiento**: una gama amplia para el corredor popular.
- **Equipaciones de equipo**: muy presentes en el deporte amateur por su precio y disponibilidad de tallas.

## Qué esperar de ella

Joma encaja muy bien con quien busca **producto fiable a precio razonable**, sin pagar el sobreprecio de las marcas más mediáticas. No es la marca de las grandes campañas de superestrellas, y precisamente por eso suele ofrecer mucho por lo que cuesta.

## Para quién la recomendamos

- Para **fútbol base** y equipos: tallaje amplio y buen precio.
- Para quien empieza en **pádel** y quiere calzado y ropa que cumplan.
- Para el **corredor popular** que no necesita lo más premium.

Como siempre, lo importante no es la marca del logo, sino que el producto te ajuste y te sirva para lo que juegas.

En Zona Sport trabajamos con varias marcas y te ayudamos a comparar sin casarnos con ninguna. Si quieres ver qué tenemos de Joma o de otras, pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91.`,
  },
  {
    slug: "marca-john-smith-deporte-accesible",
    title: "John Smith: deporte accesible para toda la familia",
    excerpt:
      "Una marca con catálogo amplio y precios contenidos, ideal para iniciarse y para vestir a toda la familia sin disparar el gasto.",
    tags: ["marcas", "john-smith", "familia"],
    metaTitle: "John Smith: deporte accesible para la familia | Zona Sport",
    metaDescription:
      "John Smith, marca de catálogo amplio y precio contenido para iniciarse y vestir a la familia. Conócela y encuéntrala en Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_MARCAS,
    category: "Marcas",
    contentMd: `John Smith es de esas marcas que cumplen sin hacer ruido. Si buscas equipar a la familia sin disparar el presupuesto, merece que la conozcas.

## Catálogo amplio y para todos

Lo más característico de John Smith es la **amplitud de su catálogo**: calzado, ropa y complementos para distintos deportes y para todas las edades, desde los más pequeños hasta adultos. Eso la hace muy práctica cuando quieres vestir a varios miembros de la familia de una vez.

## Precio contenido

Su punto fuerte es la **relación calidad-precio**. No compite con las gamas premium ni lo pretende: su sitio es el del deporte accesible, el de iniciarse, el del día a día y el de la educación física. Para eso, cumple de sobra.

## Dónde encaja bien

- **Iniciación deportiva**: para empezar en un deporte sin invertir mucho.
- **Educación física y cole**: ropa y zapatillas resistentes a precio razonable.
- **Uso casual y familiar**: prendas cómodas para el día a día.
- **Niños**, donde el calzado se queda pequeño rápido y no conviene gastar de más.

## Qué esperar (con honestidad)

Es una marca de **gama accesible**, no de alto rendimiento. Si buscas la última tecnología para competir, no es su terreno. Pero si quieres producto correcto, cómodo y a buen precio para el día a día y la iniciación, ahí cumple muy bien.

En Zona Sport trabajamos con marcas para todos los presupuestos y te ayudamos a elegir según para qué la necesitas, sin empujarte a gastar más de la cuenta. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te enseñamos opciones.`,
  },
  {
    slug: "marca-8000-montana-y-outdoor",
    title: "+8000: la marca para iniciarse en montaña y outdoor",
    excerpt:
      "Calzado y ropa de montaña con buena relación calidad-precio. Por qué +8000 es una buena puerta de entrada al trekking.",
    tags: ["marcas", "8000", "montana"],
    metaTitle: "+8000: marca para iniciarse en montaña | Zona Sport",
    metaDescription:
      "+8000, marca de calzado y ropa de montaña con buena relación calidad-precio para iniciarse en el trekking. Conócela en Zona Sport (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_MARCAS,
    category: "Marcas",
    contentMd: `Si quieres empezar a salir al monte sin gastarte una fortuna en el primer equipo, +8000 es una marca que conviene tener en el radar. Te contamos por qué.

## Una marca centrada en outdoor

+8000 está especializada en **montaña y aire libre**: botas y zapatillas de trekking, ropa técnica, forros, cortavientos y complementos para salir al campo. Es una marca pensada para el senderista y el montañero popular más que para la alta competición.

## Su gran baza: la relación calidad-precio

Lo que más se valora de +8000 es que ofrece producto de montaña **a un precio asequible**. Para quien se inicia en el trekking y no quiere invertir mucho de golpe en su primer equipo, es una puerta de entrada muy razonable.

## Dónde encaja

- **Iniciación al senderismo y trekking** de dificultad baja y media.
- **Rutas de fin de semana** por sierras como la de San Pedro o la zona de Las Villuercas.
- **Ropa de abrigo y cortavientos** para el día a día en el campo.
- Para quien quiere **probar la montaña** antes de dar el salto a gamas más caras.

## Qué tener en cuenta

Como toda marca de gama accesible, su sitio es el del uso popular, no el de la alta montaña extrema. Para empezar y para rutas exigentes pero no técnicas, cumple muy bien. Si más adelante te enganchas y subes de nivel, ya valorarás opciones más especializadas.

## Pruébate el calzado de montaña

El calzado de trekking hay que probarlo con calcetín de montaña y con margen para la bajada. En Zona Sport te ayudamos con la talla y la horma. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te orientamos según las rutas que quieras hacer.`,
  },
  {
    slug: "marca-jhayber-padel-y-deporte",
    title: "Jhayber: una marca cómoda para pádel y deporte de calle",
    excerpt:
      "Calzado y ropa con sello español, frecuentes en pádel y en el día a día. Qué esperar de Jhayber y para quién encaja.",
    tags: ["marcas", "jhayber", "padel"],
    metaTitle: "Jhayber: marca cómoda para pádel y deporte | Zona Sport",
    metaDescription:
      "Jhayber, marca española de calzado y ropa frecuente en pádel y deporte de calle. Conoce qué esperar y encuéntrala en Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_MARCAS,
    category: "Marcas",
    contentMd: `Jhayber es una marca con solera en el deporte español, y la verás bastante en pistas de pádel y en zapatillas del día a día. Aquí va un repaso honesto.

## Sello español y trayectoria

Jhayber es una marca española con muchos años en el sector. Esa trayectoria le da un buen conocimiento del deporte de base y del calzado cómodo, que es donde se mueve con soltura.

## Dónde la verás más

- **Pádel**: calzado con suela específica y ropa para la pista, a precios accesibles.
- **Calzado de calle y casual**: zapatillas cómodas para el día a día.
- **Deporte popular**: producto pensado para quien practica por afición y salud.

## Qué esperar de ella

Jhayber encaja con quien busca **comodidad y buen precio**. No es una marca de gama premium ni lo pretende: su punto fuerte es ofrecer calzado y ropa correctos, cómodos y asequibles para el deporte popular y el uso diario.

## Para quién la recomendamos

- Para quien **empieza en el pádel** y quiere calzado que cumpla sin gastar mucho.
- Para quien busca **zapatillas cómodas** para andar y para el día a día.
- Para el deportista de fin de semana que prioriza comodidad y precio.

Como siempre decimos, lo importante no es el logo, sino que el producto te ajuste y te sirva para lo que haces. Jhayber es una opción más a comparar dentro de su rango.

En Zona Sport trabajamos con varias marcas y te ayudamos a elegir sin casarnos con ninguna. Si quieres ver qué tenemos de Jhayber o de alternativas, pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91.`,
  },
  {
    slug: "marca-mizuno-cuando-merece-la-pena",
    title: "Mizuno: cuándo merece la pena dar el salto a esta marca",
    excerpt:
      "Una marca japonesa muy valorada en running y deportes de sala. Para quién tiene sentido y qué la diferencia.",
    tags: ["marcas", "mizuno", "running"],
    metaTitle: "Mizuno: cuándo merece la pena esta marca | Zona Sport",
    metaDescription:
      "Mizuno, marca japonesa muy valorada en running y deportes de sala. Para quién tiene sentido dar el salto. Conócela en Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_MARCAS,
    category: "Marcas",
    contentMd: `Mizuno es una marca con mucho prestigio entre corredores y jugadores de sala. No es la más barata, así que la pregunta es: ¿cuándo merece la pena? Vamos a ello.

## Una marca japonesa con reputación técnica

Mizuno es una marca japonesa con larga tradición y muy buena fama en el mundo del **running** y los **deportes de sala** (voleibol, balonmano, fútbol sala). Su reputación viene de un calzado bien construido y duradero, valorado por corredores exigentes.

## Dónde destaca

- **Running**: zapatillas conocidas por su pisada estable y su durabilidad. Muchos corredores populares y de club son fieles a la marca.
- **Deportes de sala**: muy presente en pistas de voleibol y balonmano por su agarre y sujeción.
- **Calidad de construcción**: producto pensado para aguantar kilómetros y temporadas.

## Cuándo tiene sentido el salto

Mizuno encaja bien cuando:

- Ya **corres con regularidad** y quieres un calzado que aguante y dé estabilidad.
- Buscas **durabilidad** y no te importa pagar algo más por ella.
- Practicas **deportes de sala** y valoras el agarre y la sujeción.

## Cuándo quizá no

Si estás empezando y sales esporádicamente, puede que no necesites su gama todavía: hay opciones más sencillas y económicas para iniciarte. Cuando subas volumen y exigencia, ahí es donde la marca luce.

Lo de siempre: la mejor zapatilla es la que te ajusta y te resulta cómoda, sea de la marca que sea. La reputación ayuda, pero la prueba en pie manda.

En Zona Sport te ayudamos a comparar marcas según tu nivel y tu bolsillo, sin empujarte a lo más caro. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91.`,
  },

  // ================================================================= TEMPORADA
  {
    slug: "banadores-y-natacion-como-elegir-bien",
    title: "Bañadores y natación: cómo elegir bien para piscina y verano",
    excerpt:
      "Resistencia al cloro, ajuste y tipo de prenda. Lo que conviene saber para acertar con bañadores y material de natación.",
    tags: ["natacion", "temporada", "guias"],
    metaTitle: "Bañadores y natación: cómo elegir bien | Zona Sport",
    metaDescription:
      "Resistencia al cloro, ajuste y material de natación: cómo elegir bañador y gafas para piscina y verano. Encuéntralos en Zona Sport (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_TEMPORADA,
    category: "Temporada",
    contentMd: `Tanto si nadas para entrenar como si vas a la piscina en verano, acertar con el bañador y el material te ahorra disgustos. Te contamos lo importante.

## Resistencia al cloro: lo primero

El cloro castiga mucho los tejidos. Un bañador barato pierde elasticidad y se transparenta en pocas semanas de piscina. Para uso frecuente, busca tejidos **resistentes al cloro**, que aguantan mucho más y mantienen la forma.

## El ajuste, según el uso

- Para **entrenar y nadar largos**, el bañador debe ir ajustado para no frenar en el agua: bañador de competición o jammer en ellos, bañador de una pieza en ellas.
- Para **piscina recreativa y playa**, prima la comodidad: bermudas de baño y bikinis o bañadores más sueltos.

## El material que marca la diferencia

- **Gafas de natación**: con buen ajuste para que no entre agua y, si nadas al aire libre, con protección solar. Mejor que la cinta sea regulable.
- **Gorro**: protege el pelo del cloro y mejora la hidrodinámica. De silicona si nadas a menudo.
- **Toalla** de secado rápido y **chanclas** para el borde de la piscina.

## Para los peques

En niños, prioriza bañadores cómodos y resistentes y unas buenas gafas que ajusten a su cara. Si empieza en natación, el gorro suele ser obligatorio en muchas piscinas.

## Cuida el material

Aclara el bañador y las gafas con agua dulce tras cada baño en piscina: el cloro y el salitre acortan su vida. No los dejes secar al sol arrugados.

En Zona Sport tienes bañadores y material de natación para toda la familia, de cara al verano y para la piscina cubierta. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91.`,
  },
  {
    slug: "chanclas-de-verano-cuales-elegir-segun-el-uso",
    title: "Chanclas de verano: cuáles elegir según el uso",
    excerpt:
      "De dedo, de pala o deportivas: cada chancla tiene su sitio. Cómo elegir para playa, piscina o el día a día sin acabar con rozaduras.",
    tags: ["chanclas", "temporada", "guias"],
    metaTitle: "Chanclas de verano: cuáles elegir según el uso | Zona Sport",
    metaDescription:
      "De dedo, de pala o deportivas: cómo elegir chanclas para playa, piscina o calle sin rozaduras. Encuéntralas en Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_TEMPORADA,
    category: "Temporada",
    contentMd: `Parece la compra más sencilla del verano, pero una chancla mal elegida te deja rozaduras y resbalones. Te contamos cuál va mejor según el uso.

## Los tipos principales

- **De dedo (flip-flop)**: ligeras y frescas, perfectas para la playa y la piscina. La sujeción va entre los dedos.
- **De pala o tira ancha**: la tira cruza el empeine sin pasar entre los dedos. Más cómodas para quien no soporta la chancla de dedo, y mejor sujeción para andar.
- **Deportivas o de descanso**: con suela más gruesa y acolchada, pensadas para usar tras el deporte o para caminar más rato.

## Para piscina y vestuarios

Aquí manda la **suela antideslizante**: los bordes de piscina y los vestuarios resbalan. Una chancla con buen agarre evita más de un susto. Además, en la piscina pública es casi obligatoria por higiene.

## Para el día a día

Si vas a andar bastante, evita las chanclas más finas y planas: no amortiguan y acaban cargando el pie. Busca algo con algo de cuerpo en la suela y buena sujeción del empeine.

## Cuidado con las rozaduras

Una chancla nueva de dedo puede rozar los primeros días. Si vas a caminar mucho, mejor estrénala poco a poco o elige una de pala. Y huye de las que son pura plancha de plástico rígido.

## Calidad de la suela

Una suela demasiado dura o demasiado fina se nota a las pocas horas. Busca un punto intermedio: que amortigüe algo y agarre bien.

En Zona Sport tienes chanclas para playa, piscina y calle, para toda la familia. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te enseñamos opciones según para qué las quieres.`,
  },
  {
    slug: "gorras-y-proteccion-solar-para-hacer-deporte",
    title: "Gorras y protección solar para hacer deporte en Extremadura",
    excerpt:
      "El sol extremeño no es broma. Cómo elegir gorra, visera y gafas para entrenar protegido sin pasar calor de más.",
    tags: ["complementos", "sol", "temporada"],
    metaTitle: "Gorras y protección solar para el deporte | Zona Sport",
    metaDescription:
      "Gorra, visera y gafas para entrenar protegido del sol extremeño sin pasar calor. Encuentra tus complementos en Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_TEMPORADA,
    category: "Temporada",
    contentMd: `En Extremadura el sol aprieta gran parte del año, y entrenar sin protección se paga. Te contamos cómo cubrirte sin acabar ahogado de calor.

## Gorra o visera, según lo que busques

- **Gorra técnica**: cubre la cabeza entera, protege del sol y, si es transpirable, ayuda a evacuar el sudor. Ideal para running y senderismo bajo sol fuerte.
- **Visera**: deja la cabeza al aire por arriba, así que es más fresca, pero protege menos el cuero cabelludo. Buena opción para pádel y tenis o para quien pasa calor con gorra.

Busca tejido ligero y transpirable: una gorra de algodón se empapa y agobia.

## Las gafas de sol cuentan

Para correr o pedalear bajo sol fuerte, unas gafas deportivas protegen del deslumbramiento y del viento. Mejor con buena protección UV y un ajuste que no se mueva con el sudor.

## No te olvides de la crema

La gorra cubre la cabeza, pero el sol llega a cara, cuello, orejas y hombros. Una crema solar resistente al sudor, aplicada antes de salir, completa la protección. En tiradas largas, conviene reaplicar.

## La ropa también protege

Una camiseta técnica clara protege más que entrenar sin camiseta bajo el sol de mediodía. El blanco y los colores claros reflejan parte del calor.

## Y el sentido común

Por mucha protección que lleves, en plena ola de calor lo más sensato es **cambiar la hora**: entrenar a primera o última hora del día. Ninguna gorra evita un golpe de calor a las tres de la tarde en julio.

En Zona Sport tienes gorras, viseras y complementos para entrenar protegido todo el año. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te recomendamos según tu deporte.`,
  },
  {
    slug: "abrigos-y-termicos-para-el-invierno-deportivo",
    title: "Abrigos y térmicos para el invierno deportivo: cómo abrigarse bien",
    excerpt:
      "El sistema de capas explicado para entrenar en frío: base térmica, capa intermedia y cortavientos. Calienta más con menos.",
    tags: ["invierno", "ropa", "temporada"],
    metaTitle: "Abrigos y térmicos para el invierno deportivo | Zona Sport",
    metaDescription:
      "El sistema de capas para entrenar en frío: base térmica, intermedia y cortavientos. Abrígate bien con menos. Encuentra tus prendas en Zona Sport (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_TEMPORADA,
    category: "Temporada",
    contentMd: `Para hacer deporte en invierno no necesitas el abrigo más gordo, necesitas el sistema de capas adecuado. Calienta más, pesa menos y te adaptas mejor. Te lo explicamos.

## El secreto: tres capas finas

Olvídate del forro polar enorme. Funcionan mejor varias capas finas que puedes quitar y poner según entras en calor:

1. **Base térmica**: pegada al cuerpo, transpirable, que aleje el sudor de la piel. Nada de algodón.
2. **Capa intermedia**: un forro fino o una sudadera técnica que aísle el calor.
3. **Cortavientos o chaqueta**: corta el viento y la llovizna. Plegable, para llevarla si sobra.

## Por qué funciona mejor

Tres capas finas atrapan más aire (y el aire aísla) que una gruesa. Y, sobre todo, te dejan regular: cuando el cuerpo entra en calor, te quitas una capa y no acabas empapado en sudor, que es lo que de verdad te enfría.

## No te olvides de las extremidades

- **Gorro o cinta** para las orejas: por la cabeza se pierde mucho calor.
- **Guantes finos**: las manos se enfrían rápido y luego cuesta recuperarlas.
- **Cuello o buff**: versátil y muy útil contra el viento.

## Para el día a día, no solo entrenar

El mismo principio vale para ir abrigado a ver un partido o pasear: una buena capa térmica y un cortavientos resuelven más que un plumas pesado, y abultan mucho menos.

## El frío extremeño engaña

En la zona del Guadiana, la humedad hace que se sienta más frío del que marca el termómetro. Abrígate las primeras veces y ajusta según notes.

En Zona Sport tienes térmicos, forros y cortavientos para montar tu sistema de capas. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te ayudamos a combinarlas.`,
  },

  {
    slug: "polos-y-polares-para-la-media-estacion",
    title: "Polos y polares para la media estación: la capa que más usas",
    excerpt:
      "Ni frío de invierno ni calor de verano. Cómo elegir polos técnicos y forros polares para esos días templados que dominan el año.",
    tags: ["ropa", "temporada", "guias"],
    metaTitle: "Polos y polares para la media estación | Zona Sport",
    metaDescription:
      "Cómo elegir polos técnicos y forros polares para la media estación, la capa que más usas. Encuéntralos en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_TEMPORADA,
    category: "Temporada",
    contentMd: `En Extremadura, buena parte del año no hace ni frío de verdad ni calor. Para esos días templados, los polos y los forros polares son la capa que más vas a usar. Te contamos cómo elegir.

## El polo técnico: cómodo y versátil

Un polo deportivo no es solo para el pádel o el golf: es una prenda fresca y cómoda para entrenar suave, pasear o el día a día. Busca **tejido técnico** que transpire en lugar de algodón puro, sobre todo si lo usas para moverte. Te mantiene seco y no se queda pegado con el sudor.

## El forro polar: calor ligero que regula

El polar es el rey de la media estación. Abriga sin pesar, transpira y se quita con facilidad cuando entras en calor. Funciona genial como **capa intermedia**: encima de una camiseta técnica y, si refresca o sopla viento, bajo un cortavientos.

- **Polar fino**: para días suaves y como segunda capa en el deporte.
- **Polar grueso o con cuello alto**: para mañanas frías y para estar parado al aire libre.

## Por capas, siempre

La gracia de estas prendas es combinarlas. Una camiseta técnica de base, un polar fino encima y un cortavientos en la mochila cubren casi cualquier día de otoño o primavera en la zona. Te pones y quitas según el momento.

## Para toda la familia

Polos y polares funcionan igual de bien para adultos y niños. Para los peques, un polar ligero es perfecto para el cole y el recreo: abriga por la mañana y se lo quitan al jugar.

## Acierta con la prenda templada

En Zona Sport tienes polos técnicos y forros polares de distintos gramajes para montar tu capa de media estación. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te ayudamos a combinarlos según cómo los vayas a usar.`,
  },

  // ============================================================ CUIDADO Y GUÍAS
  {
    slug: "como-lavar-la-ropa-deportiva-sin-estropearla",
    title: "Cómo lavar la ropa deportiva sin estropearla (ni que huela)",
    excerpt:
      "Temperatura, suavizante, secado y el truco contra el mal olor que no se va. Alarga la vida de tus prendas técnicas.",
    tags: ["cuidados", "ropa", "guias"],
    metaTitle: "Cómo lavar la ropa deportiva sin estropearla | Zona Sport",
    metaDescription:
      "Temperatura, suavizante y secado: cómo lavar la ropa deportiva para que dure y no huela. Consejos prácticos de Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_CUIDADO,
    category: "Cuidado y guías",
    contentMd: `La ropa técnica dura mucho más si la lavas bien, y mucho menos si la tratas como una camiseta de algodón. Estos son los errores típicos y cómo evitarlos.

## El suavizante es tu enemigo

Parece buena idea, pero el suavizante **tapa los poros** del tejido técnico y arruina su transpiración. Resultado: la prenda deja de evacuar el sudor y, encima, retiene el olor. No uses suavizante con ropa deportiva técnica.

## Agua fría y programa suave

Lava en **frío o a baja temperatura** (30 grados como mucho). El calor daña las fibras elásticas y las membranas técnicas. Un programa corto y suave es más que suficiente para ropa que solo lleva sudor.

## Del revés y sin masificar

- Lava las prendas **del revés**: protege el exterior y limpia mejor la cara que toca la piel.
- No llenes la lavadora a tope: la ropa necesita moverse para limpiarse bien.
- Cierra cremalleras y velcros para que no enganchen otras prendas.

## Secado: al aire, sin secadora

Tiende la ropa técnica **a la sombra y al aire**. La secadora y el sol directo castigan las fibras y los estampados. Además, al aire seca rápido porque para eso está diseñada.

## El truco contra el olor persistente

Si una prenda ya huele aunque la laves, deja en remojo con un poco de **vinagre blanco** y agua fría antes del lavado normal. El vinagre neutraliza las bacterias que causan el olor sin dañar el tejido. Funciona mejor que cualquier perfume que solo lo tapa.

## Plantillas y calcetines

Las plantillas, a mano y sin suavizante. Los calcetines técnicos, igual que el resto: en frío y al aire.

Cuida así tus prendas y te durarán temporadas. Y cuando toque renovar, en Zona Sport tienes ropa técnica para todos los deportes. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91.`,
  },
  {
    slug: "guia-de-tallas-como-acertar-comprando-deporte",
    title: "Guía de tallas: cómo acertar comprando ropa y calzado de deporte",
    excerpt:
      "Cada marca talla distinto. Te enseñamos a medirte en casa, a leer las tablas de tallas y a evitar devoluciones.",
    tags: ["guias", "tallas", "cuidados"],
    metaTitle: "Guía de tallas: cómo acertar comprando deporte | Zona Sport",
    metaDescription:
      "Cómo medirte en casa, leer las tablas de tallas y evitar devoluciones al comprar ropa y calzado de deporte. Te ayudamos en Zona Sport (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_CUIDADO,
    category: "Cuidado y guías",
    contentMd: `"¿Qué talla cojo?" es la duda eterna al comprar deporte, y con razón: cada marca talla un poco distinto. Con un par de medidas y algo de criterio, aciertas casi siempre.

## Mídete en casa (cuesta cinco minutos)

Ten a mano una cinta métrica y apunta:

- **Pecho**: en la parte más ancha, con la cinta horizontal.
- **Cintura**: a la altura del ombligo, sin apretar.
- **Cadera**: en la parte más ancha.
- **Pie**: de talón a punta del dedo más largo, de pie y por la tarde.

Con esos números puedes comparar con la tabla de cada marca, en lugar de fiarte solo de "soy una M".

## Lee la tabla de tallas de cada marca

No existe una talla universal. Una M de una marca puede equivaler a una L de otra. Por eso conviene mirar **la tabla concreta** del producto y guiarte por las medidas en centímetros, no por la letra.

## Calzado: el centímetro manda

En zapatillas, deja un dedo (alrededor de un centímetro) entre el dedo más largo y la punta. El pie se hincha con el ejercicio. Y recuerda que la horma cambia según la marca: dos zapatillas del mismo número pueden calzar distinto.

## Ajustado o suelto, según el uso

- Ropa de **competición o para nadar**: más ajustada.
- Ropa para **entrenar a gusto o uso casual**: un punto más holgada.

No es lo mismo una camiseta para hacer series que una sudadera para abrigarte.

## Ante la duda, pruébatelo

Las tablas orientan mucho, pero probarse es la forma segura de acertar y evitar devoluciones. En Zona Sport te dejamos probar con calma y te ayudamos a interpretar las tallas de cada marca. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te orientamos antes de comprar.`,
  },
  {
    slug: "como-elegir-mochila-deportiva-segun-el-uso",
    title: "Cómo elegir mochila deportiva según el uso que le vas a dar",
    excerpt:
      "Capacidad, espalda y compartimentos. Qué mochila te conviene para el gimnasio, el día a día, la montaña o llevar el portátil.",
    tags: ["complementos", "mochilas", "guias"],
    metaTitle: "Cómo elegir mochila deportiva según el uso | Zona Sport",
    metaDescription:
      "Capacidad, espalda y compartimentos: qué mochila deportiva te conviene para gimnasio, día a día o montaña. Encuéntrala en Zona Sport (Puebla de la Calzada).",
    author: AUTHOR,
    accent: ACCENT_CUIDADO,
    category: "Cuidado y guías",
    contentMd: `La mejor mochila es la que encaja con lo que vas a llevar dentro. Antes de fijarte en el color, piensa en el uso. Te ayudamos a elegir.

## Empieza por la capacidad

La capacidad se mide en litros, y cada uso pide la suya:

- **15-20 litros**: gimnasio, día a día, llevar el portátil y poco más.
- **20-30 litros**: excursión de un día con comida, agua y una capa de abrigo.
- **30 litros o más**: rutas largas o escapadas de varios días con material.

Comprar una mochila enorme "por si acaso" suele acabar en cargarla de cosas que no usas y andar incómodo.

## La espalda y las cinchas, lo que más importa

Una mochila bien puesta no tira de los hombros: buena parte del peso debe caer en la **cintura** gracias al cinturón. Para uso de montaña, busca respaldo acolchado y transpirable y cinchas regulables. Para ciudad, prioriza comodidad y que el respaldo no dé calor.

## Compartimentos según lo que lleves

- ¿Llevas **portátil**? Que tenga compartimento acolchado específico.
- ¿Vas al **gimnasio**? Un bolsillo separado para las zapatillas o la ropa sudada se agradece.
- ¿Sales a la **montaña**? Bolsillos laterales para botellas, sitio para el cortavientos y, si nadas o sudas, una funda estanca para el móvil.

## Distribuye bien el peso

Lo pesado, pegado a la espalda y centrado; lo ligero, fuera. Y no pases del 10 % de tu peso corporal en salidas de día: cargar de más te pasa factura en la espalda.

## Pruébatela con peso

Una mochila se prueba **con peso real puesto**, no vacía colgada en un perchero. En Zona Sport te dejamos cargarla y ajustarla para ver cómo te queda. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 y te enseñamos opciones según tu uso.`,
  },
  {
    slug: "complementos-deportivos-imprescindibles-que-no-fallan",
    title: "Complementos deportivos imprescindibles que no fallan",
    excerpt:
      "Calcetines técnicos, botella, riñonera, gorra y bolsa: los pequeños extras que mejoran cualquier entrenamiento.",
    tags: ["complementos", "guias", "accesorios"],
    metaTitle: "Complementos deportivos imprescindibles | Zona Sport",
    metaDescription:
      "Calcetines técnicos, botella, riñonera y más: los complementos deportivos que mejoran cualquier entrenamiento. Encuéntralos en Zona Sport (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_CUIDADO,
    category: "Cuidado y guías",
    contentMd: `No hace falta mucho para entrenar mejor, pero hay un puñado de complementos pequeños que marcan la diferencia y casi nadie valora hasta que los prueba. Estos son los que recomendamos.

## Calcetines técnicos: los grandes olvidados

Parecen un detalle, pero un buen calcetín técnico evita ampollas, mantiene el pie seco y sujeta mejor. La diferencia con un calcetín de algodón normal se nota a la hora de entrenamiento. Es de lo mejor que puedes hacer por tus pies.

## Una botella o bidón en condiciones

Hidratarse es básico, y tener una botella cómoda de llevar invita a beber. Para correr, un bidón de mano o de cintura; para el gimnasio o la bici, una botella con buen tapón que no gotee.

## Riñonera o cinturón de running

Llevar las llaves, el móvil y la tarjeta sin que boten ni molesten cambia la experiencia de salir a correr. Una riñonera ajustada y ligera lo resuelve sin que notes que la llevas.

## Gorra, gafas y protección

Para entrenar al aire libre, una gorra o visera y unas gafas de sol protegen del sol extremeño y del deslumbramiento. Pequeños, baratos y muy útiles.

## Bolsa de deporte práctica

Una bolsa con un compartimento separado para la ropa sudada o las zapatillas mantiene el resto limpio y seco. Para quien va al gimnasio o entrena fuera de casa, es un acierto.

## Toalla y neceser pequeños

Una toalla de secado rápido y un neceser básico hacen que ducharse fuera de casa sea cómodo. Ocupan poco y se agradecen.

Ninguno de estos extras es caro, y juntos mejoran mucho el día a día deportivo. En Zona Sport los tienes todos y te ayudamos a elegir según tu deporte. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91.`,
  },

  // ============================================================== TIENDA LOCAL
  {
    slug: "zona-sport-tu-tienda-deportiva-en-puebla-de-la-calzada",
    title: "Zona Sport: tu tienda deportiva en Puebla de la Calzada",
    excerpt:
      "Quiénes somos, qué encontrarás y por qué comprar en una tienda local con asesoramiento marca la diferencia frente al online frío.",
    tags: ["tienda", "puebla-de-la-calzada", "local"],
    metaTitle: "Zona Sport: tu tienda deportiva en Puebla | Zona Sport",
    metaDescription:
      "Tienda deportiva multimarca en Puebla de la Calzada (Badajoz): asesoramiento real, marcas para todos los bolsillos y trato cercano. Visítanos en C. Silos 3.",
    author: AUTHOR,
    accent: ACCENT_TIENDA,
    category: "Tienda local",
    contentMd: `En un mundo de compras online frías y devoluciones interminables, una tienda deportiva de barrio con asesoramiento de verdad sigue teniendo todo el sentido. Esa es Zona Sport.

## Quiénes somos

Somos una tienda deportiva **multimarca** en Puebla de la Calzada, en plena comarca de Badajoz. Equipamos a corredores, paddleros, futbolistas, montañeros, familias y a cualquiera que quiera moverse, sin importar el nivel ni el presupuesto.

## Qué vas a encontrar

- **Pádel**: palas, calzado, ropa y accesorios para empezar o para subir de nivel.
- **Running**: zapatillas y ropa técnica para cada tipo de corredor.
- **Fútbol y fútbol sala**: botas, equipaciones, espinilleras y calzado de sala.
- **Niños y bebé**: calzado y ropa deportiva para cada edad.
- **Montaña, natación y temporada**: lo que pide cada estación.

Trabajamos con varias marcas, de las accesibles a las más técnicas, para que encuentres lo que necesitas a tu medida.

## Por qué una tienda local marca la diferencia

- **Te probamos y te medimos**: el pie, la horma, la pala en mano. Eso el online no lo hace.
- **Te aconsejamos con honestidad**, sin empujarte a gastar de más.
- **Te resolvemos dudas al momento**, en persona o por WhatsApp.
- **Sin devoluciones eternas**: si algo no encaja, lo ves antes de comprarlo.

## Cómo encontrarnos

Estamos en **C. Silos 3, Puebla de la Calzada (Badajoz)**. ¿Tienes una duda antes de pasarte? Escríbenos por **WhatsApp al 689 11 06 91** y te atendemos encantados. Y si prefieres reservar algo y recogerlo en tienda, también te lo ponemos fácil.

Nos vemos por la tienda.`,
  },
  {
    slug: "encordado-de-raquetas-en-tienda-cuando-y-por-que",
    title: "Encordado de raquetas en tienda: cuándo y por qué hacerlo",
    excerpt:
      "Un buen encordado cambia cómo juegas. Te contamos cada cuánto encordar, cómo elegir tensión y por qué hacerlo en tienda.",
    tags: ["tienda", "raquetas", "servicios"],
    metaTitle: "Encordado de raquetas en tienda: cuándo y por qué | Zona Sport",
    metaDescription:
      "Cada cuánto encordar, cómo elegir la tensión y por qué hacerlo en tienda. Servicio de encordado en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_TIENDA,
    category: "Tienda local",
    contentMd: `El encordado es el motor de tu raqueta de tenis o pádel-tenis, y casi nadie le presta atención hasta que el cordaje se rompe. Te explicamos por qué importa tanto.

## El cordaje manda más de lo que crees

Puedes tener una raqueta estupenda, pero si el cordaje está pasado o mal tensado, no sacarás partido. El cordaje afecta a la potencia, al control, al tacto y al cuidado del brazo. Renovarlo a tiempo es de lo más rentable que puedes hacer por tu juego.

## Cada cuánto encordar

Hay una regla orientativa: **encorda al año tantas veces como juegues a la semana**. Si juegas dos veces por semana, unas dos veces al año. Y, por supuesto, en cuanto se rompa o lo notes "muerto" y sin respuesta.

Aunque no se rompa, el cordaje pierde tensión con el tiempo y deja de rendir. Un cordaje viejo transmite peor y puede cargar el codo.

## La tensión, según lo que busques

- **Más tensión**: más control y precisión, pero menos potencia y más dureza para el brazo.
- **Menos tensión**: más potencia y comodidad, pero menos control.

La tensión adecuada depende de tu nivel, tu técnica y tus molestias. Por eso conviene hablarlo, no copiar la de otro.

## Por qué hacerlo en tienda

Encordar bien requiere una máquina adecuada y mano. Un encordado hecho en tienda garantiza la tensión correcta y uniforme, el patrón adecuado y un acabado que aguanta. Además, te asesoramos sobre el tipo de cordaje según lo que busques.

## Tráenos tu raqueta

En Zona Sport te ofrecemos servicio de encordado y te ayudamos a elegir cordaje y tensión según tu juego y tu brazo. Pásate por C. Silos 3, en Puebla de la Calzada, o escríbenos por WhatsApp al 689 11 06 91 para consultar plazos y dejárnosla cuando te venga bien.`,
  },
  {
    slug: "recogida-gratis-en-tienda-como-funciona",
    title: "Recogida gratis en tienda: cómo funciona y por qué te interesa",
    excerpt:
      "Reserva lo que quieres, lo preparamos y te lo llevas sin gastos de envío. Te explicamos cómo aprovechar la recogida en tienda.",
    tags: ["tienda", "servicios", "local"],
    metaTitle: "Recogida gratis en tienda: cómo funciona | Zona Sport",
    metaDescription:
      "Reserva tu producto, lo preparamos y lo recoges sin gastos de envío en Puebla de la Calzada. Así funciona la recogida en tienda de Zona Sport.",
    author: AUTHOR,
    accent: ACCENT_TIENDA,
    category: "Tienda local",
    contentMd: `Comprar online está bien, pero los gastos de envío y las esperas a veces no compensan, sobre todo si nos tienes cerca. Por eso la recogida en tienda es una opción muy práctica.

## En qué consiste

Eliges lo que quieres, nos lo dices y te lo **preparamos en la tienda** para que pases a recogerlo cuando te venga bien. Sin gastos de envío y sin esperar a un repartidor.

## Por qué te interesa

- **Te ahorras los gastos de envío**: especialmente útil en compras pequeñas, donde el envío encarece de más.
- **Lo ves antes de llevártelo**: compruebas la talla, la horma y el producto en mano antes de cerrar la compra.
- **Sin esperas largas ni franjas de reparto**: pasas cuando puedas.
- **Si algo no encaja, lo resolvemos al momento**, en persona, sin devoluciones por mensajería.

## Cómo reservar

Es muy sencillo: escríbenos por **WhatsApp al 689 11 06 91** diciéndonos qué te interesa (producto, talla, color), te confirmamos disponibilidad y te avisamos cuando esté listo para recoger. También puedes preguntarnos cualquier duda antes de decidir.

## Una ventaja extra: el asesoramiento

Al recoger en tienda, aprovechas para que te aconsejemos en persona. ¿Dudas entre dos tallas o dos modelos? Te dejamos probar y comparar antes de quedarte con uno. Eso, comprando solo online, no lo tienes.

## Dónde recoger

Estamos en **C. Silos 3, Puebla de la Calzada (Badajoz)**. Cuando quieras reservar algo o consultar disponibilidad, escríbenos por WhatsApp y lo dejamos preparado. Así combinas la comodidad de elegir con calma y la tranquilidad de ver el producto antes de llevártelo.`,
  },
  {
    slug: "atencion-por-whatsapp-resuelve-dudas-antes-de-comprar",
    title: "Atención por WhatsApp: resuelve tus dudas antes de comprar",
    excerpt:
      "Antes de gastar, pregunta. Te contamos cómo usar nuestro WhatsApp para acertar con tallas, modelos y disponibilidad sin moverte de casa.",
    tags: ["tienda", "whatsapp", "servicios"],
    metaTitle: "Atención por WhatsApp: resuelve dudas antes de comprar | Zona Sport",
    metaDescription:
      "Pregunta por tallas, modelos y disponibilidad antes de comprar. Atención cercana por WhatsApp en Zona Sport, Puebla de la Calzada (Badajoz).",
    author: AUTHOR,
    accent: ACCENT_TIENDA,
    category: "Tienda local",
    contentMd: `Comprar deporte sin asesoramiento es jugársela con la talla, la horma o el modelo. Por eso, antes de gastar, lo mejor que puedes hacer es preguntar. Y para eso está nuestro WhatsApp.

## Para qué te sirve escribirnos

- **Dudas de talla**: te ayudamos a interpretar la tabla de cada marca y a elegir según tus medidas.
- **Comparar modelos**: te contamos diferencias reales entre dos zapatillas, palas o productos, con honestidad.
- **Consultar disponibilidad**: te decimos si tenemos lo que buscas, en tu talla y color.
- **Resolver el "no sé qué necesito"**: cuéntanos tu deporte, nivel y objetivo y te orientamos.

## Cómo aprovecharlo al máximo

Cuanta más información nos des, mejor te ayudamos. Por ejemplo:

- Para **calzado**: tu talla habitual, para qué deporte y dónde lo usarás.
- Para una **pala de pádel**: tu nivel, tu físico y cómo juegas.
- Para **ropa**: tus medidas y si la quieres ajustada o más suelta.

Con esos datos afinamos mucho y evitamos que te lleves algo que no es lo tuyo.

## Sin compromiso y sin agobios

Preguntar no obliga a comprar. Nuestro objetivo es que aciertes, no colocarte lo primero. Si lo que necesitas es esperar, probar en tienda o incluso que te digamos que aún no te hace falta cambiar de zapatillas, te lo diremos con sinceridad.

## Y si prefieres venir

Si te queda cerca, siempre puedes pasarte por la tienda y verlo en persona. Lo uno no quita lo otro: muchos clientes preguntan primero por WhatsApp y luego vienen a probar y recoger.

Escríbenos por **WhatsApp al 689 11 06 91** o visítanos en **C. Silos 3, Puebla de la Calzada (Badajoz)**. Estamos encantados de ayudarte a acertar.`,
  },
];
