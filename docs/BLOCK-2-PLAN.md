# Bloque 2 — Reestructuración de categorías (textil / calzado / accesorios)

> Estado: **PLAN — pendiente de OK**. Nada de esto se ha aplicado todavía a la
> branch dev ni a producción. Documento para revisión.

## 1. Resumen ejecutivo

Convertimos el árbol de categorías (hoy una mezcla de género/deporte/tipo) en una
taxonomía **género → familia**: 5 raíces (`hombre`, `mujer`, `nino`, `nina`,
`accesorios`) + 13 hijas. Los productos se reasignan **por su `name`** (módulo
`lib/categories/classify.ts`, cobertura 99,6%). Para soportar UNISEX adulto sin
duplicar productos, `Product.categoryId` (FK única) pasa a relación
**many-to-many** vía pivote `ProductCategory`, manteniendo `primaryCategoryId`
para breadcrumbs/canonical.

Estrategia **expand/contract** sin downtime: (1) migración aditiva → (2) script
de datos idempotente → (3) migración contractiva. Cada paso requiere **OK manual**
y se prueba en la branch Neon **dev-claude-code** antes de tocar producción.

Puntos de OK: (a) migración aditiva en dev · (b) script `--dry-run` · (c) script
real en dev + CSV · (d) generar (sin aplicar) la contractiva.

---

## 2. Árbol de categorías nuevas (18 categorías)

`hombre`, `mujer`, `accesorios` **ya existen** como Category → se **reutilizan**
como raíz (no se redirigen). `nino`, `nina` se **crean**. Las hijas se crean todas.
Slugs de hijas con prefijo del padre (ver Decisión 1, §12).

| name | slug (único) | URL | parent | position | metaTitle | metaDescription |
|---|---|---|---|---|---|---|
| Hombre | `hombre` | /hombre | — | 1 | Hombre — Ropa y calzado deportivo \| Zona Sport | Equipación deportiva de hombre: textil y calzado de las mejores marcas. Envío a toda España y recogida en tienda en Puebla de la Calzada. |
| Mujer | `mujer` | /mujer | — | 2 | Mujer — Ropa y calzado deportivo \| Zona Sport | Ropa y zapatillas deportivas de mujer. Marcas top, asesoramiento real y envío a toda España. |
| Niño | `nino` | /nino | — | 3 | Niño — Ropa y calzado deportivo \| Zona Sport | Material deportivo para niño: textil y calzado resistente. Asesoramos la talla en tienda. |
| Niña | `nina` | /nina | — | 4 | Niña — Ropa y calzado deportivo \| Zona Sport | Ropa y calzado deportivo para niña. Marcas multideporte y envío a toda España. |
| Accesorios | `accesorios` | /accesorios | — | 5 | Accesorios deportivos \| Zona Sport | Mochilas, balones, calcetines, pádel y complementos deportivos. Envío a toda España. |
| Textil hombre | `hombre-textil` | /hombre/textil | hombre | 1 | Ropa de hombre — Camisetas, sudaderas, pantalones \| Zona Sport | Textil deportivo de hombre: camisetas, sudaderas, chándales, pantalones y abrigos. |
| Calzado hombre | `hombre-calzado` | /hombre/calzado | hombre | 2 | Zapatillas y calzado de hombre \| Zona Sport | Zapatillas de running, pádel, fútbol y casual para hombre. |
| Textil mujer | `mujer-textil` | /mujer/textil | mujer | 1 | Ropa de mujer — Mallas, camisetas, sudaderas \| Zona Sport | Textil deportivo de mujer: mallas, tops, camisetas, sudaderas y abrigos. |
| Calzado mujer | `mujer-calzado` | /mujer/calzado | mujer | 2 | Zapatillas y calzado de mujer \| Zona Sport | Zapatillas de running, pádel y casual para mujer. |
| Textil niño | `nino-textil` | /nino/textil | nino | 1 | Ropa de niño \| Zona Sport | Camisetas, sudaderas, chándales y conjuntos deportivos para niño. |
| Calzado niño | `nino-calzado` | /nino/calzado | nino | 2 | Zapatillas y botas de niño \| Zona Sport | Zapatillas y botas deportivas para niño. |
| Textil niña | `nina-textil` | /nina/textil | nina | 1 | Ropa de niña \| Zona Sport | Camisetas, sudaderas y conjuntos deportivos para niña. |
| Calzado niña | `nina-calzado` | /nina/calzado | nina | 2 | Zapatillas y botas de niña \| Zona Sport | Zapatillas y botas deportivas para niña. |
| Mochilas | `accesorios-mochilas` | /accesorios/mochilas | accesorios | 1 | Mochilas deportivas \| Zona Sport | Mochilas deportivas multimarca. |
| Balones | `accesorios-balones` | /accesorios/balones | accesorios | 2 | Balones — Fútbol, baloncesto y más \| Zona Sport | Balones de fútbol, baloncesto y deporte. |
| Calcetines | `accesorios-calcetines` | /accesorios/calcetines | accesorios | 3 | Calcetines deportivos \| Zona Sport | Calcetines técnicos y packs deportivos. |
| Pádel | `accesorios-padel` | /accesorios/padel | accesorios | 4 | Pádel — Palas, paleteros y accesorios \| Zona Sport | Palas, paleteros y complementos de pádel. |
| Otros | `accesorios-otros` | /accesorios/otros | accesorios | 5 | Complementos deportivos \| Zona Sport | Gorras, guantes, gafas, espinilleras y más complementos. |

> `metaTitle`/`metaDescription` son sugerencias ajustables. `/hombre`,`/mujer`,
> `/nino`,`/nina` serán **hubs** (Bloque 4); `/accesorios` listado con subcategorías.

---

## 3. Clasificador (anexo — código en `lib/categories/classify.ts`)

Fuente única ya commiteada (no se copia aquí). Estrategia: (1) primera palabra
normalizada con precedencia calzado→padel-gear→mochilas→balones→calcetines→otros→
textil; (2) regla `\bPADEL\b` palabra completa → pádel solo si la 1ª palabra no fue
tipo concreto (evita falsos positivos *Bullpadel* / "…OF PADEL"); (3) pasada 2 de
escaneo del name; (4) `UNCLASSIFIED`. Lo usan `scripts/classify-report.ts` y
`scripts/migrate-categories.ts`.

---

## 4. Conteos previstos post-migración (verificados en dev, 1362 productos)

| categoría destino | productos | observaciones |
|---|---|---|
| /hombre/textil | 315 | género dominante HOMBRE |
| /hombre/calzado | 125 | |
| /mujer/textil | 188 | |
| /mujer/calzado | 60 | |
| /nino/textil | 189 | 188 NINO + 1 BEBE (duplicado en niña) |
| /nino/calzado | 83 | |
| /nina/textil | 72 | 71 NINA + 1 BEBE (duplicado) |
| /nina/calzado | 107 | |
| /accesorios/otros | 112 | género ignorado |
| /accesorios/calcetines | 36 | |
| /accesorios/balones | 28 | incluye baloncesto (subcat genérica) |
| /accesorios/mochilas | 27 | |
| /accesorios/padel | 15 | palas, paleteros, raqueteros, toallita |
| **migration-errors.csv** | **6** | 5 UNCLASSIFIED + 1 NO_ESPECIFICADO+calzado |

Suma: 1356 colocados + 1 fila pivote extra (BEBE) + 6 a revisar = 1362. ✅
Reconciliación familia×género al 100%. Los 6 de errores: `MIZUNO WAVE ULTIMA 17`,
`JOMA VIPER … RVIPES2612`, `JOLUVI HEAT STORMY/DIPA/TERRAIN` (UNCLASSIFIED) +
`Bota Alta +8000 TOVIR Negro (copia)` (NO_ESPECIFICADO+calzado).

---

## 5. Mapeo género → categoría(s) destino

`assignCategories(product)` → `{ primary: string; all: string[] }`:

| gender | familia | entradas pivote (`all`) | `primaryCategoryId` |
|---|---|---|---|
| HOMBRE | textil/calzado | `[/hombre/<fam>]` (1) | /hombre/\<fam\> |
| MUJER | textil/calzado | `[/mujer/<fam>]` (1) | /mujer/\<fam\> |
| NINO | textil/calzado | `[/nino/<fam>]` (1) | /nino/\<fam\> |
| NINA | textil/calzado | `[/nina/<fam>]` (1) | /nina/\<fam\> |
| UNISEX (adulto) | textil/calzado | `[/hombre/<fam>, /mujer/<fam>]` (2) | /hombre/\<fam\> |
| BEBE / UNISEX junior | textil/calzado | `[/nino/<fam>, /nina/<fam>]` (2) | /nino/\<fam\> |
| NO_ESPECIFICADO + textil/calzado | — | — → `migration-errors.csv` | — |
| cualquiera + **accesorios** | accesorios:\<sub\> | `[/accesorios/<sub>]` (1, **ignora género**) | /accesorios/\<sub\> |

> Datos actuales: los 30 UNISEX son todos accesorios (no duplican) y solo hay 1
> producto BEBE (textil) → la duplicación m2m hoy afecta a **1 producto**.

---

## 6. Diff de `prisma/schema.prisma`

3 relaciones Product↔Category → Prisma exige nombrarlas todas.

```diff
 model Product {
   categoryId        String
-  category          Category      @relation(fields: [categoryId], references: [id])
+  category          Category      @relation("LegacyCategory", fields: [categoryId], references: [id])  // SE MANTIENE en expand
+  primaryCategoryId String?                                                                            // NUEVO (nullable temporal)
+  primaryCategory   Category?     @relation("PrimaryCategory", fields: [primaryCategoryId], references: [id])
+  categories        ProductCategory[]                                                                  // NUEVO m2m
+  @@index([primaryCategoryId])
 }

 model Category {
-  products        Product[]
+  products        Product[]          @relation("LegacyCategory")    // se mantiene en expand
+  primaryFor      Product[]          @relation("PrimaryCategory")   // NUEVO
+  categoryLinks   ProductCategory[]  @relation("CategoryProducts")  // NUEVO
 }

+model ProductCategory {
+  productId  String
+  categoryId String
+  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
+  category   Category @relation("CategoryProducts", fields: [categoryId], references: [id], onDelete: Cascade)
+  @@id([productId, categoryId])
+  @@index([categoryId])
+}
```

Se mantiene intacto en expand: `Product.categoryId`, su relación (solo se le pone
nombre `LegacyCategory` — **no cambia ninguna columna SQL**), y todos los datos.
`onDelete: Cascade` en el pivote por ambos lados. Sin `@map` (ver Decisión 2, §12).

---

## 7. SQL de la migración aditiva (preview — NO aplicada)

Lo que generaría `prisma migrate dev --create-only --name product_categories_m2m_additive`
(el rename de relación es a nivel Prisma, no genera SQL):

```sql
-- CreateTable
CREATE TABLE "ProductCategory" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId","categoryId")
);
-- CreateIndex
CREATE INDEX "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");
-- AlterTable
ALTER TABLE "Product" ADD COLUMN "primaryCategoryId" TEXT;
-- CreateIndex
CREATE INDEX "Product_primaryCategoryId_idx" ON "Product"("primaryCategoryId");
-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_primaryCategoryId_fkey"
  FOREIGN KEY ("primaryCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

100% aditivo y reversible. No toca `categoryId`, no toca `ProductSize`, no borra nada.

---

## 8. Pseudocódigo de `scripts/migrate-categories.ts`

```
import { PrismaClient } from "@prisma/client";
import { classify } from "../lib/categories/classify";
const DRY_RUN = process.argv.includes("--dry-run");
const TREE = [ …las 18 categorías de §2… ];
function assignCategories(name, gender): { primary, all[] } | { error: motivo }   // §5

async function main() {
  // STEP 1 — Categorías: upsert por slug (idempotente). Raíces primero, luego
  //          hijas (parentId). Reutiliza hombre/mujer/accesorios.
  // STEP 2 — Por producto: classify(name) + assignCategories(gender,fam).
  // STEP 3 — Idempotente (skip si primaryCategoryId != null). Si OK:
  //          set primaryCategoryId + upsert ProductCategory por cada `all`.
  //          Si error (UNCLASSIFIED | NO_ESPECIFICADO no-accesorio):
  //          → DEJAR primaryCategoryId = NULL y categories = [] (sin pivote),
  //            y añadir fila a migration-errors.csv. (ver Decisión 3, §12)
  // STEP 4 — RedirectRule: upsert 301 por cada slug viejo → URL nueva (§9).
  // STEP 5 — Resumen por categoría + escribe migration-errors.csv.
}
```

- **Idempotencia:** skip = `Product.primaryCategoryId IS NOT NULL`. Categorías por
  `upsert(slug)`. Pivote por `upsert(@@id)`. `RedirectRule` por `upsert(from)`.
- **Transacciones:** modo real en `prisma.$transaction` por **lotes de 100**.
- **`migration-errors.csv`:** `productId,name,gender,motivo`.
- **Ejecución:** `--dry-run` (steps 1-4 en memoria, sin escribir, **obligatorio**)
  → real (`npx tsx --env-file=.env.local scripts/migrate-categories.ts`).
- **Nunca** toca `ProductSize.stock` ni borra productos.

---

## 9. Plan de redirecciones 301 (tabla concreta, calculada por volumen en dev)

Criterio: cada slug viejo → la nueva URL donde migra la **pluralidad** de sus
productos. **Reutilizadas (NO redirigen):** `hombre`, `mujer`, `accesorios`.

| slug viejo (nº prod) | → destino 301 | distribución real |
|---|---|---|
| `/calzado` (328) | **/hombre/calzado** | H125 · niña80 · niño62 · M59 · err2 |
| `/camisetas` (156) | **/hombre/textil** | H79 · M54 · niño19 · niña4 |
| `/conjuntos` (82) | **/nino/textil** | niño60 · niña15 · H6 · M1 |
| `/chandal` (79) | **/hombre/textil** | H35 · niño33 · M6 · niña5 |
| `/infantil` (59) | **/nino/textil** (+ enlace a /nina/textil) | niño36 · niña23 |
| `/bebe` (53) | **/nina/calzado** | niña-calz25 · niño-calz18 · niña-tex9 · niño-tex1 |
| `/abrigos` (51) | **/hombre/textil** | H22 · M11 · niña10 · niño5 · err3 |
| `/mallas` (45) | **/mujer/textil** | M44 · M-calz1 |
| `/banador` (36) | **/hombre/textil** | H18 · niño17 · niña1 |
| `/cortavientos` (21) | **/mujer/textil** | M15 · H5 · niña1 |
| `/faldas` (13) | **/mujer/textil** | M13 |
| `/padel` (10) | **/accesorios/padel** | padel10 |
| `/complementos-padel` (4) | **/accesorios/padel** | padel4 |
| `/banadores` (4) | **/nina/textil** | niña3 · M1 |
| `/baloncesto` (3) | **/nino/calzado** | niño-calz3 |
| `/chanclas` (2) | **/nina/calzado** | niña-calz2 |
| `/uncategorized` (1) | **/accesorios/mochilas** | mochilas1 |
| `/ropa` (1) | **/mujer/textil** | M1 |
| `/pantalon-corto` (1) | **/mujer/textil** | M1 |
| `/bota-alta` (1) | **/hombre/calzado** (su único producto va a errors.csv) | err:no_gender1 |

### Categorías vacías (0 productos)
Hay **~43 categorías seed sin productos** (`/sudaderas`, `/zapatilla`, `/calcetin`,
`/anorack-parka`, etc.). No estorban (no se mostrarían), pero:
- **Enlazadas en el nav** (Header/Footer `SPORT_NAV`): `/running`, `/montana`
  (además de `/padel` y `/calzado` ya cubiertos). **Decisión pendiente:** redirigir
  `/running` y `/montana` a un destino sensato (p.ej. `/hombre/calzado` o
  `/catalogo`) **o** actualizar el nav en Bloque 4. Lo dejo apuntado; no es parte
  del script de datos.
- El resto (seed huérfano) → opcional limpiarlas en un paso posterior; no las toca
  esta migración.

**Además:** quitar de `next.config.ts` los redirects `/nino`→/catalogo y
`/nina`→/catalogo (ahora son hubs). Las `RedirectRule` las sirve `middleware.ts`.

---

## 10. Migración contractiva (`product_categories_m2m_contract`) — solo se GENERA

Se genera al final con `--create-only`, **no se aplica** hasta el PR de producción:

```sql
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";
DROP INDEX "Product_categoryId_status_idx";
ALTER TABLE "Product" ALTER COLUMN "primaryCategoryId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "categoryId";
```

Y a nivel Prisma: la relación `LegacyCategory` desaparece y `primaryCategory` se
**renombra a `category`** (la app vuelve a `product.category`, ahora apuntando a
`primaryCategoryId`). Ver Decisión 2 (§12).

**Requisitos previos (punto de no retorno):**
1. `grep -rn "categoryId" app/ components/ lib/` → 0 referencias a `Product.categoryId`.
   Inventario actual: **37 archivos** tocan `categoryId`/`category` (críticos:
   `lib/public-queries.ts` buildProductWhere/getCategoryFacets, `lib/products/queries.ts`
   y `mutations.ts`, importers `process-job`/`process-woocommerce-job`/`miravia/sync`,
   `app/admin/productos/[id]/ProductEditor.tsx`, `app/(public)/[categoria]/page.tsx`).
2. `SELECT COUNT(*) FROM "Product" WHERE "primaryCategoryId" IS NULL` → 0
   (salvo los de `migration-errors.csv`, que se etiquetan antes a mano).
3. Backup hecho (§11).

---

## 11. Runbook de aplicación a producción (se añadirá a `docs/MIGRATIONS.md`)

1. **Backup completo de prod** (`pg_dump` branch `main` de Neon) +
   backup específico de `product_size`.
2. **Deploy migración aditiva** (PR 1): pivote + `primaryCategoryId` nullable. No
   rompe nada (el código sigue usando `categoryId`).
3. **Ejecutar `migrate-categories.ts`** contra prod (fuera de build): `--dry-run` →
   revisar → real.
4. **Verificar** conteos (== §4) + revisar `migration-errors.csv` + etiquetar a mano
   los 6.
5. **PR 2**: código a `primaryCategory`/`categories[]`, hubs (Bloque 4), rutas
   anidadas, quitar redirects de `next.config`, actualizar nav.
6. **PR 3 (contractiva)**: tras los 2 requisitos de §10.

Cada deploy = una migración Prisma; `migrate deploy` las aplica en orden. Cero
`db push`.

---

## 12. Decisiones de diseño — detalle y justificación

**D1 — Slugs de hijas con prefijo del padre (`hombre-textil`).**
El schema actual tiene `Category.slug @unique` **global** (no compuesto). Lo
**mantenemos** para no romper los lookups existentes por slug único
(`getCategoryBySlug(slug)`, sitemap, etc.). Con prefijo padre la unicidad global se
cumple sin colisiones. La URL pública `/hombre/textil` se resolverá con una **ruta
anidada de App Router** `app/(public)/[seccion]/[familia]/page.tsx`, que busca la
categoría por `slug = ${seccion}-${familia}` (o por `parent.slug + nombre`). El slug
`hombre-textil` nunca es visible para el usuario.
*Alternativa (no elegida):* `@@unique([parentId, slug])` con slugs limpios
(`textil`) — más bonito pero exige quitar el `@unique` global de `slug` y reescribir
todos los lookups por slug a lookups con contexto de padre (más churn y riesgo).
**→ Nota para el frontend (Bloque listados):** crear la ruta anidada `[seccion]/[familia]`.

**D2 — Renombrar relación a `LegacyCategory` (churn temporal).**
Es **solo el nombre de la relación en el schema Prisma** (`@relation("LegacyCategory")`).
**NO cambia ningún nombre de columna SQL** — la columna sigue siendo `categoryId` y
la FK `Product_categoryId_fkey`. En la contracción (§10) se elimina `LegacyCategory`
y `primaryCategory` se renombra a `category`, de modo que **la app vuelve a usar
`product.category`** (apuntando ya a `primaryCategoryId`). El churn es transitorio y
solo en TypeScript/Prisma.

**D3 — Los 6 productos sin categorizar.**
El script los deja con **`primaryCategoryId = NULL` y `categories = []`** (sin
entradas en el pivote). Efecto: **no se muestran en público** (los listados filtran
por categoría), pero **existen en BD** intactos (incluido su stock). Se registran en
`migration-errors.csv` y se podrán ver en `/admin/productos` con un **filtro "Sin
categorizar"** (`where: { primaryCategoryId: null }`) que añadiremos al panel para
etiquetarlos a mano. No se borran, no se inventan categorías comodín.

**D4 — Redirecciones por volumen (tabla concreta en §9).**
Calculadas ejecutando el clasificador sobre los productos reales de dev. Donde un
slug viejo reparte entre varias destino, gana la de mayor volumen y el resto quedan
como enlace secundario en la página destino (Bloque 4). Pendiente: decidir destino
de `/running` y `/montana` (vacías pero enlazadas en nav). Se quitan los redirects
`/nino`,`/nina` de `next.config.ts`.

**D5 — m2m hoy afecta a 1 producto.** Confirmado. Se mantiene por futureproofing
(importaciones futuras de pádel y marcas con UNISEX adulto en textil/calzado).
