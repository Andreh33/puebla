/**
 * Plantillas de blog editorial Zona Sport.
 *
 * Cada plantilla incluye:
 *  - Estructura semántica con H2/H3
 *  - Listas, tabla, blockquote y código/destacados cuando aplica
 *  - Placeholders entre dobles llaves `{{NOMBRE_PRODUCTO}}` que el editor
 *    debe sustituir manualmente.
 *
 * Las plantillas están redactadas en castellano (es-ES) y pensadas para los
 * cuatro flujos editoriales que la tienda gestionará con más frecuencia:
 *  1. Guías de compra
 *  2. Comparativas
 *  3. Noticias de la tienda
 *  4. Eventos locales
 */

export type BlogTemplate = {
  id: string;
  title: string;
  description: string;
  /** Sugerencia de tags para precargar en el formulario. */
  suggestedTags: string[];
  /** Sugerencia de slug base. */
  suggestedSlug: string;
  /** Sugerencia de excerpt corto. */
  suggestedExcerpt: string;
  contentMd: string;
};

// ----------------------------------------------------------------------------
// 1. Guía de compra
// ----------------------------------------------------------------------------

const GUIA_RUNNING_PRINCIPIANTES = `## Por qué la zapatilla correcta marca la diferencia

Empezar a correr es una de las decisiones más sanas que puedes tomar, pero
también una de las que más rápido se tuerce si el material no acompaña. La
zapatilla es, sin discusión, **la pieza más importante del equipamiento** de
un corredor principiante: amortigua impactos, guía la pisada y protege
articulaciones todavía no adaptadas al gesto del trote.

En esta guía repasamos los criterios que utilizamos en la tienda de Zona
Sport (C. Silos, 3, Puebla de la Calzada) para recomendar el primer par de
zapatillas a quienes acaban de empezar.

> Consejo de tienda: nunca compres una zapatilla solo por estética. La
> diferencia entre el modelo correcto y "el que estaba rebajado" se nota a
> los 3 kilómetros.

## Qué tipo de pisada tienes

Antes de elegir modelo, conviene tener una idea de cómo apoya tu pie. Hay
tres patrones principales:

- **Pronador**: el pie cae hacia dentro al apoyar. Es el patrón más común.
- **Supinador**: el pie cae hacia fuera. Menos frecuente y suele requerir
  amortiguación específica.
- **Neutro**: el pie se mantiene alineado. Permite la gama más amplia de
  modelos.

Si no estás seguro, en Zona Sport hacemos un análisis visual gratuito de
pisada en tienda. Tráete tus zapatillas usadas: el desgaste de la suela
cuenta toda la historia.

## Características que importan

### Amortiguación

Para empezar, busca **amortiguación media-alta**. La rodilla y el tendón de
Aquiles necesitan un colchón generoso mientras se adaptan al impacto.

### Drop

El drop es la diferencia de altura entre talón y antepié. Para
principiantes recomendamos un drop entre **8 y 10 mm**: facilita la
transición desde el calzado de calle y reduce sobrecargas en el gemelo.

### Peso

Un peso entre **260 y 310 g** (talla 42) es la zona ideal: lo bastante
ligero para no notarlo, lo bastante robusto para durar.

### Horma

La horma debe ser cómoda **desde el primer paso**. Si necesitas "domarla",
no es tu modelo. Deja un dedo de margen entre el dedo gordo y la puntera.

## Comparativa rápida de tres modelos típicos

| Modelo                  | Drop  | Peso   | Uso recomendado              |
| ----------------------- | ----- | ------ | ---------------------------- |
| {{MODELO_AMORTIGUADO}}  | 10 mm | 290 g  | Rodajes suaves, asfalto      |
| {{MODELO_MIXTO}}        | 8 mm  | 275 g  | Asfalto y caminos de tierra  |
| {{MODELO_LIGERO}}       | 6 mm  | 240 g  | Series y ritmos rápidos      |

Recuerda: esta tabla es orientativa. Cada marca interpreta el drop y la
horma de forma distinta, así que **probárselas siempre antes de comprar**.

## Errores frecuentes a evitar

1. **Comprar una talla justa**. El pie se hincha al correr; necesitas medio
   número más que en tu zapato de calle.
2. **Reutilizar las viejas zapatillas de fitness**. La suela de gimnasio no
   está diseñada para impacto repetido en asfalto.
3. **Cambiarlas demasiado tarde**. La amortiguación se degrada hacia los
   **700-1000 km**. Pasada esa cifra, vuelven los dolores.
4. **Estrenar zapatillas en una carrera**. Mínimo dos rodajes previos.

## Cuánto invertir

Para un primer par, la franja sensata está entre **70 y 110 €**. Por debajo
es difícil encontrar amortiguación seria; por encima entras en gama
competición que no aporta nada al principiante.

## Próximos pasos

Cuando vayas sumando kilómetros, te recomendamos tener **dos pares en
rotación**: alarga la vida de ambos y previene lesiones.

Si quieres que te ayudemos a elegir, pásate por la tienda o escríbenos por
WhatsApp. Te enseñamos el catálogo, te medimos el pie y te dejamos probar
sin compromiso.
`;

// ----------------------------------------------------------------------------
// 2. Comparativa
// ----------------------------------------------------------------------------

const COMPARATIVA_PALAS_PADEL = `## Cinco palas de pádel por menos de 100 € para empezar bien

El pádel sigue creciendo en Extremadura y cada semana llegan a la tienda
jugadores que se han enganchado en una pista municipal y buscan **su
primera pala seria**. La buena noticia: hoy se pueden encontrar palas
competentes por debajo de 100 €, sin recurrir al material de bazar que se
descose en dos meses.

En esta comparativa hemos seleccionado cinco modelos disponibles en la
tienda física y/o por encargo, todos por menos de 100 €. Hablamos de
**materiales, forma, balance y para quién encaja cada uno**.

> Importante: las palas baratas no son sinónimo de mala calidad. La
> diferencia con la gama alta está en la goma EVA de alta densidad y los
> tejidos de carbono 18K, no en el rendimiento básico que necesita un
> intermedio.

## Cómo elegir una pala antes de mirar precios

### Forma

- **Redonda**: punto dulce central amplio. Ideal para defensa y control.
  Apta para iniciación.
- **Lágrima**: equilibrio control-potencia. La forma más versátil.
- **Diamante**: potencia y remate. Solo recomendable a partir de nivel
  intermedio-avanzado.

### Balance

- **Bajo (control)**: peso hacia el puño. Más maniobrable.
- **Medio**: el más universal.
- **Alto (potencia)**: peso hacia la cabeza. Pega más fuerte pero exige
  técnica.

### Peso

Para jugadores adultos lo razonable está entre **355 y 375 g**. Por debajo
suele ser pala junior o muy específica; por encima provoca codo en
principiantes.

## Las cinco palas seleccionadas

### 1. {{PALA_1}} — 89 €

Forma redonda, balance bajo, 360 g. La pala que más recomendamos para
quien acaba de empezar. Tolera el impacto fuera del centro y no castiga el
brazo.

### 2. {{PALA_2}} — 95 €

Lágrima con cara de carbono 3K, 365 g. El salto natural tras seis meses de
juego: gana potencia sin perder demasiado control.

### 3. {{PALA_3}} — 79 €

Redonda con goma EVA blanda, 360 g. La opción **anti codo** por
excelencia. Si has tenido molestias, esta es tu pala.

### 4. {{PALA_4}} — 99 €

Híbrida lágrima-diamante, balance medio-alto, 370 g. Para jugador
intermedio que ya sabe rematar y quiere algo más de pegada.

### 5. {{PALA_5}} — 75 €

Polivalente redonda, fibra de vidrio, 360 g. La opción más económica
fiable del listado. Cumple sin sorpresas durante una temporada entera.

## Tabla comparativa

| Pala       | Forma      | Balance | Peso  | Cara    | Recomendado para     |
| ---------- | ---------- | ------- | ----- | ------- | -------------------- |
| {{PALA_1}} | Redonda    | Bajo    | 360 g | Fibra   | Iniciación pura      |
| {{PALA_2}} | Lágrima    | Medio   | 365 g | Carbono | Intermedio en curso  |
| {{PALA_3}} | Redonda    | Bajo    | 360 g | Fibra   | Sensibles al codo    |
| {{PALA_4}} | Híbrida    | Alto    | 370 g | Carbono | Intermedio agresivo  |
| {{PALA_5}} | Redonda    | Medio   | 360 g | Fibra   | Presupuesto ajustado |

## Nuestra recomendación

Si tuviéramos que elegir **una sola** para alguien que acaba de empezar,
sería la **{{PALA_1}}**: punto dulce generoso, peso comedido y precio muy
ajustado. La {{PALA_3}} se la entregamos a quien ya ha tenido alguna
molestia en el codo.

## Cómo cuidar tu pala para que dure

1. Guárdala siempre en su funda, **no en el coche** (el calor degrada la
   goma).
2. Limpia la cara con un paño húmedo tras cada partido.
3. Usa protector de cabeza: las palas se desconchan por los golpes contra
   el suelo, no por el juego.
4. Revisa el grip cada 2-3 meses.

¿Dudas con tu elección? Pásate por la tienda, las tenemos todas para
sopesar y, si nos avisas, te las dejamos probar en pista.
`;

// ----------------------------------------------------------------------------
// 3. Noticias de la tienda
// ----------------------------------------------------------------------------

const NOTICIAS_TIENDA = `## {{EVENTO}}: lo que tienes que saber

En Zona Sport llevamos meses preparando **{{EVENTO}}** y por fin tenemos
fecha confirmada. Si eres cliente de la tienda, vecino de Puebla de la
Calzada o de cualquiera de los municipios que atendemos, te interesa.

> Apunta: **{{FECHA}}** en la tienda física, C. Silos, 3. Acceso libre y
> sin reserva.

## En qué consiste

{{EVENTO}} es una jornada centrada en {{TEMATICA}}, pensada para que
puedas:

- **Probar producto sin compromiso** de las marcas invitadas.
- **Resolver dudas técnicas** con personal especializado.
- **Aprovechar precios especiales** solo durante la jornada.
- **Llevarte un detalle de bienvenida** mientras existan unidades.

Habrá demos, sorteos y, si el tiempo acompaña, una salida corta de prueba
con material para quien se anime.

## Marcas y productos protagonistas

Estaremos centrando la jornada en estas referencias:

1. **{{MARCA_1}}** — Categoría destacada: {{CATEGORIA_1}}.
2. **{{MARCA_2}}** — Novedades de temporada con descuento aplicado solo
   ese día.
3. **{{MARCA_3}}** — Material técnico para probar in situ.

Si tienes algún modelo concreto en el radar, puedes **reservarlo por
WhatsApp** con antelación. Te lo apartamos hasta el cierre del evento.

## Horario y cómo llegar

| Tramo            | Horario        | Actividad                       |
| ---------------- | -------------- | ------------------------------- |
| Mañana           | 10:00 - 14:00  | Apertura, demos y atención      |
| Tarde            | 17:00 - 20:00  | Sesión técnica + sorteos        |

Aparcamiento gratuito en la plaza adyacente. Si vienes desde Mérida o
Badajoz, la N-V y la A-5 nos dejan a la puerta.

## Compromiso con el cliente local

Esta jornada es una forma más de devolver algo al barrio. Llevamos años
viendo crecer a corredores, paddleros y senderistas con nuestro material y
queremos que la tienda física **siga siendo un punto de encuentro real**,
no solo un escaparate. La venta online es cómoda, pero hay decisiones —el
tallaje real de una zapatilla, el equilibrio exacto de una pala, el ajuste
de una mochila técnica— que solo se resuelven bien probando el producto en
persona.

Por eso seguimos invirtiendo en la tienda de C. Silos: nuevos expositores,
ampliación del catálogo de pádel, zona dedicada a outdoor y, sobre todo,
formación continua del personal para que la recomendación nunca sea "lo
que más se vende", sino **lo que mejor encaja con tu uso real**.

Si has comprado en Zona Sport en el último año, **identifícate al entrar**:
tendrás un descuento adicional aplicado solo durante esa jornada y entrarás
automáticamente en el sorteo principal.

## Confirma asistencia (opcional)

No es obligatorio, pero si nos avisas por WhatsApp ayudas a dimensionar
mejor el catering y los regalos. El número es el habitual: lo encuentras
en el pie de la web.

## Nos vemos en la tienda

Estamos disponibles para cualquier duda antes del evento. Escríbenos por
WhatsApp, pásate cuando te venga bien o sigue las novedades desde nuestras
redes. Lo importante es que ese día **estés**, charlemos un rato y te
lleves algo bueno.
`;

// ----------------------------------------------------------------------------
// 4. Eventos locales
// ----------------------------------------------------------------------------

const EVENTOS_LOCALES = `## {{EVENTO_DEPORTIVO}} en {{MUNICIPIO}}: guía completa

La comarca tiene cada vez más actividad deportiva amateur, y desde Zona
Sport queremos darle visibilidad a las pruebas que se organizan cerca de
casa. Este post recoge **todo lo que necesitas saber sobre
{{EVENTO_DEPORTIVO}}**: recorrido, inscripción, equipación recomendada y
consejos prácticos.

> Si vas a participar y te falta material, recuerda que la tienda está a
> 10 minutos en coche del punto de salida.

## Datos clave del evento

- **Fecha**: {{FECHA}}
- **Hora de salida**: {{HORA}}
- **Lugar**: {{LUGAR}}, {{MUNICIPIO}} (Badajoz)
- **Distancia**: {{DISTANCIA}}
- **Inscripción**: {{PRECIO}} (cierra el {{FECHA_LIMITE}})
- **Organiza**: {{ORGANIZADOR}}

## Perfil y recorrido

El recorrido transcurre por {{DESCRIPCION_RECORRIDO}}, con un desnivel
acumulado de aproximadamente {{DESNIVEL}}. No es una prueba técnica, pero
sí exige **calzado adecuado al terreno** —mixto en gran parte— y
preparación previa si no estás acostumbrado a la distancia.

### Puntos destacados

1. **Kilómetro 0-3**: salida controlada por casco urbano, asfalto.
2. **Kilómetro 3-{{KM_CENTRAL}}**: tramo central por pistas y caminos.
   Cuidado con la grava suelta.
3. **Últimos kilómetros**: vuelta al asfalto, ritmo libre y entrada a meta
   por la plaza.

## Qué llevar

| Imprescindible            | Recomendado                  |
| ------------------------- | ---------------------------- |
| Dorsal y chip             | Gorra o visera               |
| Calzado mixto             | Gafas de sol                 |
| Hidratación propia        | Manguitos (si la mañana es fresca) |
| Geles o barrita           | Cambio de ropa para meta     |

En la tienda tenemos preparado un **kit básico de carrera popular** con
calcetines técnicos, riñonera de hidratación y geles, listo para llevar.
Si lo necesitas, pásate los días previos o pídelo por WhatsApp y te lo
dejamos preparado.

## Consejos de los que ya han corrido

- **No estrenes material el día de la prueba**. Calcetines, zapatillas y
  ropa, todo probado en al menos un rodaje previo.
- **Desayuna 2-3 horas antes**. Café, tostada con aceite y plátano: la
  fórmula clásica funciona.
- **Calienta sin pasarte**. 10 minutos de trote suave y movilidad
  articular bastan.
- **Sal con cabeza**. El error universal es salir rápido. Marca un ritmo
  que puedas sostener al menos hasta el kilómetro central.

## Recogida de dorsales

La organización suele habilitar la recogida la tarde previa en
{{LUGAR_RECOGIDA}} y un par de horas antes de la salida en la zona de
meta. Lleva DNI; si has inscrito a alguien más, una autorización firmada.

## Después de la prueba

Tras cruzar meta, **hidratación, estiramientos suaves y comer en menos de
una hora**. Recuperarás antes y minimizarás agujetas. En la zona de
avituallamiento final suele haber fruta y bebida isotónica.

Si necesitas reponer material (zapatillas, ropa técnica, complementos) los
días posteriores, pásate por la tienda. Solemos tener **descuento para
participantes** las dos semanas siguientes presentando el dorsal.

## Nos vemos en la línea de salida

Desde Zona Sport apoyamos todo lo que sume al deporte local. Si organizas
una prueba en la comarca y quieres que la difundamos, **escríbenos por
WhatsApp o pásate por la tienda**. Compartimos canal y, cuando podemos,
patrocinamos material para sorteos.

¡A disfrutar de la carrera!
`;

// ----------------------------------------------------------------------------
// Export
// ----------------------------------------------------------------------------

export const BLOG_TEMPLATES: BlogTemplate[] = [
  {
    id: "guia-running-principiantes",
    title: "Guía de compra: zapatillas de running para principiantes",
    description:
      "Estructura completa para una guía editorial larga sobre elección de zapatillas para empezar a correr.",
    suggestedTags: ["running", "guia-de-compra", "principiantes", "zapatillas"],
    suggestedSlug: "guia-zapatillas-running-principiantes",
    suggestedExcerpt:
      "Cómo elegir tu primer par de zapatillas de running: tipo de pisada, drop, amortiguación y errores que debes evitar.",
    contentMd: GUIA_RUNNING_PRINCIPIANTES,
  },
  {
    id: "comparativa-palas-padel-100",
    title: "Comparativa: 5 palas de pádel por menos de 100 €",
    description:
      "Comparativa con tabla, análisis por modelo y recomendación final para jugadores de iniciación e intermedios.",
    suggestedTags: ["padel", "comparativa", "palas", "presupuesto"],
    suggestedSlug: "comparativa-palas-padel-menos-100-euros",
    suggestedExcerpt:
      "Cinco palas competentes por menos de 100 €, analizadas por forma, balance y para qué tipo de jugador encaja cada una.",
    contentMd: COMPARATIVA_PALAS_PADEL,
  },
  {
    id: "noticias-tienda-evento",
    title: "Noticias de la tienda: evento especial",
    description:
      "Plantilla para anunciar jornadas, presentaciones de marca, ventas privadas o aniversarios en la tienda física.",
    suggestedTags: ["tienda", "noticias", "eventos", "puebla-de-la-calzada"],
    suggestedSlug: "noticias-tienda-evento-especial",
    suggestedExcerpt:
      "Te contamos los detalles del próximo evento en la tienda: marcas invitadas, demos, sorteos y horarios.",
    contentMd: NOTICIAS_TIENDA,
  },
  {
    id: "eventos-locales-carrera",
    title: "Eventos locales: carrera popular / torneo de pádel",
    description:
      "Plantilla para cubrir una prueba deportiva de la comarca: datos, recorrido, recomendaciones y logística.",
    suggestedTags: ["eventos", "carrera-popular", "deporte-local", "extremadura"],
    suggestedSlug: "evento-deportivo-local",
    suggestedExcerpt:
      "Recorrido, inscripción, equipación recomendada y consejos prácticos para correr la próxima prueba popular de la comarca.",
    contentMd: EVENTOS_LOCALES,
  },
];

export function getTemplateById(id: string): BlogTemplate | undefined {
  return BLOG_TEMPLATES.find((t) => t.id === id);
}
