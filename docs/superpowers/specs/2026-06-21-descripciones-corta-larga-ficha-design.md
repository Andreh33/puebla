# Reorganización de descripciones en la ficha (corta arriba, técnica abajo)

Fecha: 2026-06-21
Estado: aprobado, pendiente de plan de implementación

## Objetivo

Replicar en nuestra ficha de producto la disposición de la web antigua del
cliente (zonasportpuebla.es, WooCommerce):

- **Debajo del precio**: la descripción corta/comercial (resumen de 1-2 frases).
- **Abajo del todo**: la descripción larga/técnica completa, bajo el título
  "Descripción técnica".

Y rellenar ambos textos para todos nuestros productos **tal cual del archivo**
de export de WooCommerce que ya tenemos en local — sin generar nada, sin
recortar, sin scrapear el sitio.

## Estado actual (antes del cambio)

Ficha `app/(public)/producto/[slug]/page.tsx`:

- **Debajo del precio** (slot entre el selector de talla y el botón de añadir,
  pasado a `ProductActions` como `descriptionSlot`): se renderiza
  `product.technicalDescription` con la etiqueta "Descripción técnica".
- **Abajo del todo** (sección ancha `lg:col-span-2`): se renderiza
  `product.description` con el título `<h2>Descripción</h2>`.
- La tabla "Ficha técnica" (`<dl>` con marca, modelo, composición…) es
  independiente y no se toca.

Campos en BD (`prisma/schema.prisma`, modelo `Product`):

- `description String? @db.Text` — hoy contiene la descripción larga del CSV
  (alimentada por `scripts/feed-descriptions.ts` el 2026-06-19). Alimenta el
  SEO (meta description y schema.org product).
- `technicalDescription String? @db.Text` — campo nuevo (migración
  `20260620000000_product_technical_description_additive`), hoy mayormente
  vacío.
- `metaDescription String?` — hoy contiene la corta recortada a ~160.

Endpoint `app/api/admin/import-woo/route.ts`, acción `set_descriptions`: casa por
`externalId = woocommerce:<wooId>`, solo toca `isCustomized:false`, escribe
`description` y `metaDescription`.

Datos del archivo `wp/wc-product-export-16-6-2026-1781596350587.csv`
(verificado con el parser `lib/importer/woocommerce.ts`):

- 1.475 productos. **1.472 con "Descripción corta"**, **1.395 con "Descripción"**
  (larga). 1.392 con ambas, 80 solo corta, 3 solo larga, 0 sin ninguna.
- La corta es el resumen que en WooCommerce sale debajo del precio; la larga es
  el texto técnico que sale en la pestaña/sección de abajo.

## Diseño

### 1. Semántica de campos (sin migración de esquema)

Reutilizamos los dos campos existentes intercambiando dónde se pintan:

| Campo BD               | Nuevo significado            | Dónde se pinta        | Origen del dato                       |
| ---------------------- | ---------------------------- | --------------------- | ------------------------------------- |
| `description`          | corta / comercial            | **Debajo del precio** | columna "Descripción corta" del CSV   |
| `technicalDescription` | larga / técnica              | **Abajo del todo**    | columna "Descripción" (larga) del CSV |

`description` sigue siendo el campo que alimenta el SEO (meta/schema.org); la
corta es lo ideal para meta, así que no hay regresión de SEO.

### 2. Ficha pública `producto/[slug]/page.tsx`

- El slot de **debajo del precio** pasa a renderizar `product.description`
  (texto comercial limpio, **sin** el rótulo "Descripción técnica"; un título
  discreto "Descripción" o sin título).
- La sección de **abajo del todo** pasa a renderizar
  `product.technicalDescription` con el título **"Descripción técnica"** (antes
  iba `description` con título "Descripción").
- Se mantiene el doble render HTML-sanitizado vs ReactMarkdown que ya existe
  (las descripciones de Woo vienen como HTML).
- Si el campo de abajo está vacío, no se muestra la sección (o se muestra el
  mensaje de "sin descripción" existente).
- La tabla "Ficha técnica" (`<dl>`) y el `InfoAccordion` se quedan igual.
- `generateMetadata` y `productSchema` siguen usando `product.description`
  (ahora la corta). Sin cambios funcionales relevantes.

### 3. Editor /admin `app/admin/productos/[id]/ProductEditor.tsx`

- Ajustar etiquetas/ayudas para reflejar las nuevas posiciones:
  - Campo `description` → ayuda "se muestra debajo del precio".
  - Campo `technicalDescription` → ayuda "se muestra abajo del todo, como
    Descripción técnica" (hoy dice "justo debajo de la descripción normal").
- Los dos `Textarea` y el botón "✨ Generar descripción" se mantienen.

### 4. Backfill de datos (directo a producción)

- Extender la acción del endpoint (`set_descriptions` o variante nueva
  `set_split_descriptions`) para aceptar por item `{ wooId, description, technicalDescription }`
  y escribir ambos campos, solo en `isCustomized:false`, escribiendo únicamente
  los campos presentes y no vacíos. Idempotente.
- Extender/duplicar el feeder local (`scripts/feed-descriptions.ts` → p.ej.
  `scripts/feed-split-descriptions.ts`) para que, por cada grupo del CSV con
  `wooId`, mande:
  - `description` ← `p.shortDescription` (corta) tal cual.
  - `technicalDescription` ← `p.description` (larga) tal cual.
  - **Sin** generar nada para los 3 productos sin corta: se quedan con el hueco.
- Mantener el `metaDescription` actual (ya es la corta recortada); opcionalmente
  refrescarlo, pero no es necesario.
- Lanzar contra producción (`https://zonasport.vercel.app`) con
  `SETUP_TOKEN`, por lotes, como el feed anterior.

## Decisiones cerradas

- **Fuente**: CSV de WooCommerce local, no scraping.
- **Verbatim**: textos tal cual del archivo, sin generación ni mínimo de
  palabras. Los 3 productos sin corta se quedan sin texto debajo del precio.
- **Respeto a ediciones manuales**: solo `isCustomized:false`.
- **Aplicación**: directo a producción.

## Fuera de alcance

- No se cambia el esquema de BD (ambos campos ya existen).
- No se toca la tabla "Ficha técnica" estructurada ni el acordeón de info.
- No se generan descripciones automáticas.
- No se scrapea zonasportpuebla.es.

## Verificación

- `npm run build` / typecheck OK.
- Tras el backfill: revisar 2-3 fichas en producción (una con corta+larga, una
  solo-corta, una solo-larga) y confirmar que arriba sale la corta y abajo la
  técnica.
- Conteos del feeder: ~1.472 con corta, ~1.395 con larga aplicadas a los
  productos no customizados.
