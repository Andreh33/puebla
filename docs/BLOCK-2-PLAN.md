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

Orden de aplicación y puntos de OK:
- (a) aplicar migración aditiva en dev
- (b) ejecutar `migrate-categories.ts --dry-run` (resumen, sin escribir)
- (c) ejecutar el script en real en dev (resumen + `migration-errors.csv`)
- (d) generar (sin aplicar) la migración contractiva

---

## 2. Árbol de categorías nuevas (18 categorías)

`hombre`, `mujer`, `accesorios` **ya existen** como Category → se **reutilizan**
como raíz. `nino`, `nina` se **crean**. Las hijas se crean todas. Como
`Category.slug` es `@unique` global, los slugs de las hijas llevan prefijo del
padre (`hombre-textil`), y la **URL pública** se compone `/<padre>/<familia>` vía
ruta anidada (frontend, fuera de este bloque de datos).

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

> Nota: `metaTitle`/`metaDescription` son sugerencias; ajustables. Las raíces
> `/hombre`,`/mujer`,`/nino`,`/nina` serán páginas **hub** (Bloque 4); `/accesorios`
> es listado normal con subcategorías.

---

## 3. Clasificador (anexo — código en `lib/categories/classify.ts`)

No se copia aquí el código (fuente única ya commiteada). Estrategia:
1. **Primera palabra** normalizada (sin tildes, sin signos iniciales). Orden:
   calzado → padel-gear → mochilas → balones → calcetines → otros → textil.
2. **Regla ambigüedad** `\bPADEL\b` (palabra completa) → `accesorios:padel`, **solo
   si** la 1ª palabra no fue un tipo concreto (evita falsos positivos de la marca
   *Bullpadel* y de marketing tipo "…OF PADEL").
3. **Pasada 2**: escaneo del name completo (para nombres marca-primero), misma
   precedencia, excluyendo tokens ambiguos (`TOP`, `GRIP`, `MEDIA`…).
4. Si nada casa → `UNCLASSIFIED`.

Lo usan: `scripts/classify-report.ts` (verificación) y `scripts/migrate-categories.ts`.

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
| **migration-errors.csv** | **6** | 5 UNCLASSIFIED + 1 NO_ESPECIFICADO+calzado ("Bota Alta … (copia)") |

Suma: 1356 productos colocados + 1 fila pivote extra (BEBE) + 6 a revisar = 1362. ✅
Reconciliación familia×género al 100% (ver `scripts/classify-report.ts`).

UNCLASSIFIED a etiquetar a mano: `MIZUNO WAVE ULTIMA 17`, `JOMA VIPER … RVIPES2612`,
`JOLUVI HEAT STORMY/DIPA/TERRAIN` (marca+modelo sin palabra de tipo).

---

## 5. Mapeo género → categoría(s) destino

`assignCategories(product)` → `{ primary: string; all: string[] }`:

| gender del producto | familia | entradas en pivote (`all`) | `primaryCategoryId` |
|---|---|---|---|
| HOMBRE | textil/calzado | `[/hombre/<fam>]` (1) | /hombre/\<fam\> |
| MUJER | textil/calzado | `[/mujer/<fam>]` (1) | /mujer/\<fam\> |
| NINO | textil/calzado | `[/nino/<fam>]` (1) | /nino/\<fam\> |
| NINA | textil/calzado | `[/nina/<fam>]` (1) | /nina/\<fam\> |
| UNISEX (adulto) | textil/calzado | `[/hombre/<fam>, /mujer/<fam>]` (2) | /hombre/\<fam\> (criterio fijo) |
| BEBE / UNISEX junior | textil/calzado | `[/nino/<fam>, /nina/<fam>]` (2) | /nino/\<fam\> |
| NO_ESPECIFICADO + textil/calzado | — | — → `migration-errors.csv` | — |
| cualquiera + **accesorios** | accesorios:\<sub\> | `[/accesorios/<sub>]` (1, **ignora género**) | /accesorios/\<sub\> |

> Con los datos actuales: los 30 UNISEX son todos accesorios (no duplican) y solo
> hay 1 producto BEBE (textil) → la duplicación m2m hoy afecta a **1 producto**.
> El m2m sigue siendo necesario para futuras importaciones de UNISEX adulto.

---

## 6. Diff de `prisma/schema.prisma`

Como habrá **3 relaciones** Product↔Category, Prisma exige nombrarlas todas.

```diff
 model Product {
   // …
   categoryId        String
-  category          Category      @relation(fields: [categoryId], references: [id])
+  category          Category      @relation("LegacyCategory", fields: [categoryId], references: [id])  // SE MANTIENE durante expand
+  primaryCategoryId String?                                                                            // NUEVO (nullable temporal)
+  primaryCategory   Category?     @relation("PrimaryCategory", fields: [primaryCategoryId], references: [id])
+  categories        ProductCategory[]                                                                  // NUEVO m2m
   // …
+  @@index([primaryCategoryId])
 }

 model Category {
   // …
-  products        Product[]
+  products        Product[]          @relation("LegacyCategory")    // relación antigua (se mantiene en expand)
+  primaryFor      Product[]          @relation("PrimaryCategory")   // NUEVO
+  categoryLinks   ProductCategory[]  @relation("CategoryProducts")  // NUEVO
   // …
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

**Se mantiene intacto en la fase expand:** `Product.categoryId`, la relación
`category`/`products` (renombrada a `LegacyCategory`, mismo SQL), y todos los datos.
`onDelete: Cascade` en el pivote por ambos lados. No se usa `@map`.

---

## 7. SQL de la migración aditiva (preview — NO aplicada)

Lo que generaría `prisma migrate dev --create-only --name product_categories_m2m_additive`
(el rename de relación es a nivel de schema Prisma, no genera SQL):

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

// Árbol de categorías destino (slug → {name, parentSlug, position, meta})
const TREE = [ …las 18 de la sección 2… ];

// Mapa familia → subcategoría destino
function familyToSlug(fam, gender): { primary, all[] }   // sección 5

async function main() {
  // STEP 1 — Categorías: upsert por slug (idempotente). Crea raíces primero,
  //          luego hijas (necesitan parentId). Reutiliza hombre/mujer/accesorios.
  // STEP 2 — Para cada producto: classify(name) + assignCategories(gender,fam).
  //          Si UNCLASSIFIED o (NO_ESPECIFICADO && !accesorio) → errores[].
  // STEP 3 — Idempotente: si product.primaryCategoryId != null → SKIP.
  //          Si no: set primaryCategoryId + upsert ProductCategory por cada `all`.
  // STEP 4 — RedirectRule: para cada categoría vieja, redirección 301 a la nueva
  //          URL con MÁS productos migrados desde ella (sección 9).
  // STEP 5 — Resumen por categoría + escribe migration-errors.csv (productId,name,gender,motivo).
}
```

- **Idempotencia:** clave de skip = `Product.primaryCategoryId IS NOT NULL`. Las
  categorías por `upsert` on `slug`. El pivote por `upsert` on `@@id(productId,categoryId)`.
  `RedirectRule` por `upsert` on `from`.
- **Transacciones:** modo real aplica en `prisma.$transaction` por **lotes de 100**
  productos (evita transacción gigante; cada lote atómico).
- **`migration-errors.csv`:** columnas `productId,name,gender,motivo`
  (`UNCLASSIFIED` | `NO_ESPECIFICADO_no_accesorio`).
- **Ejecución:**
  - `npx tsx --env-file=.env.local scripts/migrate-categories.ts --dry-run` → steps
    1-4 en memoria, sin escribir a BD, imprime qué haría + CSV simulado. **Obligatorio antes del real.**
  - `npx tsx --env-file=.env.local scripts/migrate-categories.ts` → aplica de verdad.
- **Nunca** toca `ProductSize.stock` ni borra productos.

---

## 9. Plan de redirecciones 301

Criterio: cada slug viejo redirige a la **nueva URL donde migró la pluralidad**
de sus productos (lo calcula el script en STEP 4). Cuando empata o se reparte,
se elige la de mayor volumen y las demás quedan como enlace secundario en la
página destino (Bloque 4 / listados). Reutilizadas (no redirigen): `hombre`,
`mujer`, `accesorios`.

| slug viejo | → destino (criterio volumen) |
|---|---|
| `calzado` | /hombre/calzado |
| `camisetas`, `conjuntos`, `chandal`, `abrigos`, `cortavientos`, `ropa`, `pantalon-corto` | /hombre/textil |
| `mallas`, `faldas`, `banador`, `banadores` | /mujer/textil |
| `infantil` | /nino/textil (+ enlace a /nina/textil) |
| `bebe` | /nino/calzado |
| `padel`, `complementos-padel` | /accesorios/padel |
| `baloncesto` | /nino/calzado (son botas; sus balones ya van por name a /accesorios/balones) |
| `chanclas`, `bota-alta` | /hombre/calzado |
| `uncategorized` | /accesorios/mochilas (su único producto es una mochila) |

> Los destinos definitivos los fija el script por volumen real; la tabla son los
> esperados. Se escriben en `RedirectRule` (las sirve `middleware.ts`).
> **Además:** quitar de `next.config.ts` los redirects `/nino`→/catalogo y
> `/nina`→/catalogo (ahora son hubs).

---

## 10. Migración contractiva (`product_categories_m2m_contract`) — solo se GENERA

Se genera al final del Bloque 2 con `--create-only`, **no se aplica** hasta el PR
de producción. Hace:

```sql
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";
-- DropIndex (el @@index([categoryId, status]) antiguo)
DROP INDEX "Product_categoryId_status_idx";
-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "primaryCategoryId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "categoryId";
```

**Requisitos previos para aplicarla (punto de no retorno):**
1. `grep -rn "categoryId" app/ components/ lib/` → **0 referencias** a `Product.categoryId`
   (todo el código usa `primaryCategory`/`categories[]`).
2. `SELECT COUNT(*) FROM "Product" WHERE "primaryCategoryId" IS NULL` → **0**.
3. Backup hecho (sección 11).

---

## 11. Runbook de aplicación a producción (se añadirá a `docs/MIGRATIONS.md`)

1. **Backup completo de prod** (`pg_dump` de la branch `main` de Neon) →
   `/backups/pre-categorias-refactor-<fecha>.sql` + backup específico de
   `product_size`.
2. **Deploy migración aditiva** (PR 1): crea pivote + `primaryCategoryId` nullable.
   No rompe nada (todo el código sigue usando `categoryId`).
3. **Ejecutar `scripts/migrate-categories.ts`** contra prod (con `DATABASE_URL` de
   prod, fuera de build). Primero `--dry-run`, revisar, luego real.
4. **Verificar** conteos en prod (== sección 4) + revisar `migration-errors.csv`.
5. **PR 2**: cambiar el código de la app a `primaryCategory`/`categories[]`,
   páginas hub (Bloque 4), rutas anidadas, quitar redirects de `next.config`.
6. **PR 3 (contractiva)**: tras confirmar los 2 requisitos de la sección 10,
   aplicar `product_categories_m2m_contract`.

Cada deploy = una migración Prisma; `migrate deploy` las aplica en orden. Cero
`db push`. (Ver `docs/MIGRATIONS.md` para el flujo general y el gate de baseline.)
