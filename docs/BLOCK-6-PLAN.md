# Bloque 6 — `garmentType` + filtro "Tipo de prenda" (textil)

> Estado: **PLAN — pendiente de OK** (revisión del arquitecto antes de Fase 1).
> Reglas vigentes: cero prod en este momento (eso es Fase 4), sin push hasta Fase 4,
> **jamás** `migrate dev`, no se toca `ProductSize.stock` (3472 filas / 3471 unidades)
> ni el FTS, `Product.categoryId` antigua sigue **intacta** (es la fuente de la Pasada 1),
> `primaryCategoryId` y el pivote `categories[]` **intactos**. Rama
> `features/garment-type-filter` **NO** se crea aún (Fase 1).

Estrategia: **calco del Bloque 3** (`footwearType`). Patrón ya probado en dev y prod,
conocemos sus dolores, hay tests que blindan el filtro combinado. Este bloque hace para
el **textil** lo que el Bloque 3 hizo para el calzado.

---

## 1. Resumen ejecutivo

Añadimos `Product.garmentType` (`String?` nullable) para clasificar la **ropa** por tipo
de prenda (**15 valores**) y un filtro "Tipo de prenda" multi en las 4 páginas de textil
(`/[seccion]/textil`). Población: `inferGarmentType` de **4 pasadas** (override de token →
categoría antigua → token genérico → fuzzy opcional), + etiquetado manual (selector en
ficha admin + acción bulk). El filtro se integra en el **mismo `AND`** de Prisma que el
resto (intersección estricta, nunca OR). Blindado con tests Vitest.

**Ámbito: SOLO productos textil.** "Es textil" = vinculado por m2m a un nodo `*-textil`
(`hombre-textil`, `mujer-textil`, `nino-textil`, `nina-textil`). Calzado y accesorios:
`garmentType` permanece NULL. No mezclamos vocabularios con `footwearType`.

**Cobertura validada con datos crudos de prod (763 textil):** 761/763 = **99,7%**
(P0=5, P1=479, P2=277, NULL=2). Ver §7.

---

## 2. Cambio en `prisma/schema.prisma` (D1)

```diff
 model Product {
   footwearType String?       // running|trail|tenis|padel|casual|baloncesto|futbol|futbol_sala|chanclas
+  garmentType  String?       // camiseta|sudadera|chaqueta|abrigo|cortavientos|chandal|conjunto|pantalon|bermuda|mallas|banador|falda|calentador|vestido|chaleco
+  @@index([garmentType])
 }
```

**Decisión: `String?` (no enum Prisma)** — idéntico criterio que `footwearType`: un enum
genera churn de migración (`ALTER TYPE`, y aquí evitamos `migrate dev`); la lista vive
controlada en código (`GARMENT_TYPES`), validada por Zod en admin + el clasificador.

---

## 3. SQL de la migración aditiva (preview — a mano, `migrate deploy`) (D9)

```sql
-- migration: product_garmenttype_additive
ALTER TABLE "Product" ADD COLUMN "garmentType" TEXT;
CREATE INDEX "Product_garmentType_idx" ON "Product"("garmentType");
```
100% aditivo. Cero DROP. Sin efecto sobre FTS, `ProductSize`, ni datos existentes.
Compatible con el código viejo (columna nueva nullable) → aplicable en prod vía
`migrate deploy` sin tocar datos. **No hay PR contractiva** (no se quita nada).

---

## 4. Vocabulario controlado — **15 valores** (D2 + A1)

Todo lowercase, snake_case. Fuente única en `lib/categories/garment.ts`.

| valor | incluye |
|---|---|
| `camiseta` | camisetas, polos, mangas largas (sub-distinguir = futuro, como tenis/padel) |
| `sudadera` | sudaderas, polares, fleeces |
| `chaqueta` | chaquetas técnicas, softshell |
| `abrigo` | parkas, plumíferos, abrigos pesados, anoraks |
| `cortavientos` | cortavientos, chubasqueros, k-ways |
| `chandal` | chándales completos |
| `conjunto` | conjuntos infantiles/bebé, sets coordinados |
| `pantalon` | pantalones largos (NO mallas) |
| `bermuda` | shorts, bermudas, pantalón corto |
| `mallas` | mallas técnicas, leggings, ciclistas |
| `banador` | bañadores, slip de baño |
| `falda` | faldas, faldas-pantalón |
| `calentador` | calentadores deportivos |
| `vestido` | **(A1 NUEVO)** vestidos |
| `chaleco` | **(A1 NUEVO)** chalecos |

```ts
export const GARMENT_TYPES = [
  "camiseta","sudadera","chaqueta","abrigo","cortavientos","chandal","conjunto",
  "pantalon","bermuda","mallas","banador","falda","calentador","vestido","chaleco",
] as const;
export type GarmentType = (typeof GARMENT_TYPES)[number];
```

`GARMENT_TYPE_LABELS` (ES, para UI):
```ts
export const GARMENT_TYPE_LABELS: Record<GarmentType, string> = {
  camiseta: "Camisetas y polos",
  sudadera: "Sudaderas y polares",
  chaqueta: "Chaquetas",
  abrigo: "Abrigos",
  cortavientos: "Cortavientos",
  chandal: "Chándales",
  conjunto: "Conjuntos",
  pantalon: "Pantalones",
  bermuda: "Bermudas y shorts",
  mallas: "Mallas y leggings",
  banador: "Bañadores",
  falda: "Faldas",
  calentador: "Calentadores",
  vestido: "Vestidos",   // A1
  chaleco: "Chalecos",   // A1
};
```

---

## 5. `lib/categories/garment.ts` (D3)

Paralelo a `lib/categories/footwear.ts`. Fuente única para: auto-mapeo (clasificador),
validación admin (Zod), y filtro público. Exporta `GARMENT_TYPES`, `GarmentType`,
`GARMENT_TYPE_LABELS` e `inferGarmentType` (§6).

---

## 6. Clasificador `inferGarmentType` — **4 pasadas** (D4 + A2 + A3)

```ts
export function inferGarmentType(opts: {
  categorySlug: string | null;   // slug de Product.categoryId (ANTIGUA)
  name: string;
}): GarmentType | null
```

Orden **estricto**. Cambio clave respecto al Bloque 3: una **Pasada 0** de override por
token, porque `vestido` (2) y `chaleco` (3) viven dentro de categorías antiguas que la
Pasada 1 etiquetaría como otra prenda → el token debe **ganar** a la categoría.

```ts
// Token override (A2): tokens que SIEMPRE ganan a la categoría antigua.
const TOKEN_OVERRIDE = new Set(["VESTIDO","VESTIDOS","CHALECO","CHALECOS"]);

function inferGarmentType({ categorySlug, name }) {
  const tok = firstToken(name);             // 1er término, upper, sin acentos/símbolos

  // Pasada 0 — override por token conflictivo (A2)
  if (TOKEN_OVERRIDE.has(tok)) return PASADA2.get(tok) ?? null;

  // Pasada 1 — mapeo por categoría antigua (D4)
  if (PASADA1[categorySlug ?? ""]) return PASADA1[categorySlug];

  // Pasada 2 — token genérico (D4 + A3)
  if (PASADA2.has(tok)) return PASADA2.get(tok);

  // Pasada 3 — fallback fuzzy (opcional): buscar tokens en CUALQUIER posición del
  //            nombre; lo que clasifique se marca "low_confidence" en el CSV de errores.
  // ...

  return null; // → bulk admin manual
}
```

**Normalización del token** (`firstToken`): primer término del `name`, mayúsculas, sin
acentos castellanos (Á/É/Í/Ó/Ú/Ü/Ñ → A/E/I/O/U/U/N), sin símbolos. (Verificado: con esto
`CHÁNDAL`→`CHANDAL`, `BAÑADOR`→`BANADOR`, `PANTALÓN`→`PANTALON`, `PLUMÍFERO`→`PLUMIFERO`,
`K-WAY`→`KWAY`.)

### Pasada 1 — mapeo por `categoryId` ANTIGUO (D4)
```
camisetas → camiseta      sudaderas → sudadera     chandal → chandal
abrigos → abrigo          cortavientos → cortavientos   conjuntos → conjunto
pantalones → pantalon     mallas → mallas          banador → banador
banadores → banador       faldas → falda           pantalon-corto → bermuda
```
Cubre las categorías antiguas "puras". Validado en prod: **484** productos (ver §7).
Nota: `sudaderas` y `pantalones` existen como slug pero hoy tienen **0** textil (esas
prendas entran por Pasada 2 vía token); las entradas son no-ops inofensivos.

### Pasada 2 — token (primer término del `name`) (D4 + A3 nuevos)
```
BERMUDA, BERMUDAS                  → bermuda
CALENTADOR, CALENTADORES           → calentador
CHAQUETA, CHAQUETAS                → chaqueta
CAMISETA, CAMISETAS, POLO          → camiseta
LEGGING, LEGGINGS, MALLA, MALLAS   → mallas
CHANDAL                            → chandal
ABRIGO, ABRIGOS, PARKA, PLUMIFERO  → abrigo
BANADOR, BANADORES                 → banador
CHUBASQUERO, CORTAVIENTOS, KWAY    → cortavientos
FALDA, FALDAS                      → falda
SUDADERA, SUDADERAS, FORRO, POLAR  → sudadera
PANTALON, PANTALONES               → pantalon
SHORT, SHORTS                      → bermuda
CONJUNTO, CONJUNTOS, SET           → conjunto
ANORAK, ANORAKS                    → abrigo      (A3 NUEVO)
TOP, TOPS                          → camiseta    (A3 NUEVO)
SOFT, SOFTSHELL, SOFT-SHELL        → chaqueta    (A3 NUEVO)
VESTIDO, VESTIDOS                  → vestido      (A3 NUEVO · también en TOKEN_OVERRIDE)
CHALECO, CHALECOS                  → chaleco      (A3 NUEVO · también en TOKEN_OVERRIDE)
```

### Pasada 3 — fallback fuzzy (opcional)
Si P0/P1/P2 no clasifican: buscar los mismos tokens en **cualquier posición** del nombre
(no solo el primero). Lo que clasifique se marca `low_confidence` en el CSV de errores
para revisión manual. Productos que no caigan en ninguna pasada → **NULL** → bulk admin
(igual que los 207 calzados NULL del Bloque 3).

---

## 7. Cobertura esperada post-ajustes (validada con datos crudos de prod)

Simulación del clasificador (diccionarios A1-A3) sobre los **763** textil:

| pasada | nº | nota |
|---|---|---|
| Pasada 0 | 5 | `vestido`×2 + `chaleco`×3 — antes mal etiquetados por P1 |
| Pasada 1 | 479 | los 484 anteriores menos los 5 que P0 captura |
| Pasada 2 | 277 | sin cambios |
| **NULL** | **2** | `sujetador`, `shorty` (NOPUBLIK, ropa interior) → bulk admin |

**Total clasificado: 761/763 = 99,7%.** Distribución resultante (los 15 valores):
camiseta 171 · pantalon 104 · sudadera 89 · chandal 86 · conjunto 85 · mallas 60 ·
abrigo 48 · banador 40 · chaqueta 31 · cortavientos 21 · falda 13 · bermuda 11 ·
calentador 2 · vestido 2 · chaleco 3.

(El recuento real se confirma con el `--dry-run` del script tras escribir `garment.ts`.)

---

## 8. Ámbito: solo textil (D5)

```ts
// "Es textil" = vinculado por m2m a un nodo *-textil. MISMA query que la exploración.
const textilWhere = { categories: { some: { categoryId: { in: textilNodeIds } } } };
// textilNodeIds = ids de hombre-textil, mujer-textil, nino-textil, nina-textil
```
El backfill solo recorre este conjunto (763). Calzado y accesorios → `garmentType` NULL.

---

## 9. Filtro público multi en `/[seccion]/textil` (D6)

Calco del filtro de `footwearType` en `/[seccion]/calzado`:
- **Query param `?prenda=camiseta,sudadera`** (CSV, multi).
- **Parse:** `searchParams.get("prenda")?.split(",").filter(Boolean)` → `string[]`.
- **Serialize:** toggle → `sp.set("prenda", next.join(","))` o `sp.delete` si vacío.
- **`buildProductWhere`** (`lib/public-queries.ts`): mismo array `AND` (intersección
  estricta, nunca OR):
  ```ts
  if (filters.prenda?.length) andClauses.push({ garmentType: { in: filters.prenda } });
  ```
- **Talla** sigue **stock-aware** (misma lógica del Bloque 3, intacta).
- **Facetas** independientes por prenda (`getCategoryFacets` añade `garmentTypes`,
  groupBy `garmentType` con `status ACTIVE` + categoría).
- **`ProductFilters.tsx`**: nuevo `<FilterGroup>` "Tipo de prenda" condicional, **solo
  visible si `showGarmentFilter`** (= `familia === "textil"`). Reutiliza el `FilterGroup`
  ya tipado. Chips activos con `onRemove` como el resto.
- **`[categoria]/[familia]/page.tsx`**: pasa `showGarmentFilter = (familia === "textil")`.
- **`catalogo/page.tsx`**: `garmentTypes: []` por defecto.

---

## 10. Admin (D7)

- **`ProductEditor`**: selector "Tipo de prenda" en pestaña General, 15 opciones +
  "(sin asignar)" (`null`). **Solo visible si** el producto es familia textil
  (`primaryCategory.slug.endsWith('-textil')`), mismo patrón que el selector de calzado.
  Zod: `z.enum(GARMENT_TYPES).nullable()`.
- **Bulk admin**: nueva `BulkActionType` "Asignar tipo de prenda" + columna en
  `ProductsTable` + filtro `sinTipoPrenda` en `listProducts`. Dialog con dropdown de 15
  tipos; **solo si todos los seleccionados son familia textil**. Para etiquetar el
  residuo NULL en lote.

Archivos tocados (calco del Bloque 3):
`lib/validators.ts` (ProductSchema += garmentType) · `lib/products/queries.ts`
(filtro `sinTipoPrenda` + columna en payload) · `lib/products/mutations.ts`
(`bulkSetGarmentType` + guard familia textil) · `app/admin/productos/_actions.ts`
(BulkActionType) · `app/admin/productos/page.tsx` (parsea `sinTipoPrenda`) ·
`app/admin/productos/ProductsTable.tsx` (columna + dialog bulk + filtro) ·
`app/admin/productos/[id]/page.tsx` (serializa garmentType) ·
`app/admin/productos/[id]/ProductEditor.tsx` (selector condicional familia=textil).

---

## 11. Tests Vitest (OBLIGATORIO) (D8)

Archivo **nuevo** `tests/unit/garment-filter-where.test.ts` (independiente, no tocar el de
calzado). `buildProductWhere` es función pura → se asevera la estructura del `where` sin
BD ni mock. **4 escenarios:**
- **(a) prenda single:** `{ prenda:["camiseta"] }` → `AND` incluye `garmentType:{ in:["camiseta"] }`.
- **(b) prenda multi:** `{ prenda:["camiseta","sudadera"] }` → `garmentType:{ in:[...] }` con ambos.
- **(c) prenda + talla:** combinados en el mismo `AND`, talla con `stock:{ gt:0 }`.
- **(d) prenda + género:** combinados en el mismo `AND` (intersección, no OR raíz).

Extra: test de `inferGarmentType` (P0 override vestido/chaleco gana a P1; P1 por categoría;
P2 por token; NULL para sujetador/shorty).

---

## 12. Migración expand/contract (D9)

- **PR aditiva**: `ADD COLUMN garmentType` + index (§3). Compatible con código viejo →
  `migrate deploy` en prod sin tocar datos.
- **Script `scripts/migrate-garmenttype.ts`** (calco de `migrate-footweartype.ts`):
  recorre el conjunto textil (§8), aplica `inferGarmentType`, escribe `garmentType`.
  - **`--dry-run` obligatorio** antes de modo real (output literal de pasadas + NULL).
  - **IDEMPOTENTE**: actualiza **solo** productos textil con `garmentType IS NULL`
    (`where: { ...textilWhere, garmentType: null }`). Re-ejecuciones **no duplican ni
    pisan** valores ya asignados (ni los del backfill ni los puestos a mano en bulk admin).
  - `guardHost()` como los scripts del Bloque 5 (requiere host dev salvo
    `ALLOW_PROD_MIGRATION=1`). CSV de errores para `low_confidence` / NULL.
- **No hay PR contractiva** (es columna nueva, no se quita nada).

---

## 13. Dependencias documentadas — 3 abrigos JOLUVI

Los **3 abrigos `JOLUVI HEAT`** (`STORMY`, `DIPA LONG`, `TERRAIN MUJER`) tienen
`primaryCategoryId NULL` desde el Bloque 2 y **NO están vinculados al pivote `*-textil`**.
Son parte de los **6 errores conocidos del Bloque 2** (`scripts/migration-errors.csv`).

→ **NO entran en este backfill** (el script solo recorre textil-pivote, §8). Cuando se
resuelvan esos 6 errores manualmente (tarea pendiente desde Bloque 2: asignar
`primaryCategory` + m2m), un **re-run** de `migrate-garmenttype.ts` los recogerá
automáticamente — de ahí la exigencia de **idempotencia** (§12). No bloqueante.

---

## 14. Diferido — `sujetador` / `shorty` (NOPUBLIK, ropa interior)

2 productos (`SHORTY NOPUBLIK SEATTLE`, `SUJETADOR NOPUBLIK SEATTLE CROSS`) quedan **NULL
legítimamente** — son ropa interior/base layer, fuera de los 15 valores. Acción: bulk
admin futuro o, si el volumen de ropa interior crece, ampliación de vocabulario en un
bloque posterior. El diseño ya contempla NULL → bulk (no requiere nada especial ahora).

---

## 15. Plan de pasos por fases (puntos de OK)

> Cada paso necesita OK explícito del arquitecto antes del siguiente. Cualquier escritura
> a prod requiere `--dry-run` previo + output literal + OK.

### Fase 0 — Planificación documentada
- **0.1** Crear este `docs/BLOCK-6-PLAN.md`.
- **0.2** Commit del plan. Revisión del arquitecto. **Sin OK, no se avanza a Fase 1.**

### Fase 1 — Trabajo en DEV (rama nueva)
- **1.1** `git checkout master`, `git pull`, crear rama `features/garment-type-filter`.
- **1.2** Aditiva en `schema.prisma`: `Product.garmentType String?` + `@@index`. Generar
  el SQL aditivo **a mano** (o con `prisma migrate diff`), **sin `migrate dev`**.
- **1.3** Aplicar la aditiva en el branch **dev** de Neon (SQL directo / `migrate resolve`
  + raw SQL si hace falta).
- **1.4** Crear `lib/categories/garment.ts` (`GARMENT_TYPES` + `LABELS` + `inferGarmentType`
  con Pasadas 0-3).
- **1.5** Tests unitarios del clasificador (similar a footwear).
- **1.6** Script `scripts/migrate-garmenttype.ts` (calco del de footwear, idempotente).
- **1.7** Ejecutar `--dry-run` contra **dev**. Output literal.
- **1.8** Esperar OK con los conteos antes del modo real.

### Fase 2 — Backfill DEV + admin
- **2.1** Ejecutar el script real contra **dev**.
- **2.2** Verificar conteos vs esperados (~761/763; el resto NULL para bulk).
- **2.3** Actualizar los 8 archivos de admin (§10).
- **2.4** Smoke admin: filtrar `sinTipoPrenda`, bulk asignar, edición individual.

### Fase 3 — Filtro público en DEV
- **3.1** `lib/public-queries.ts`: extender `buildProductWhere` + `getCategoryFacets`
  (calco de `footwearType`).
- **3.2** `components/public/ProductFilters.tsx`: nuevo `FilterGroup` "Tipo de prenda"
  condicional.
- **3.3** `[categoria]/[familia]/page.tsx`: `showGarmentFilter = (familia === "textil")`.
- **3.4** `catalogo/page.tsx`: `garmentTypes: []` default.
- **3.5** Tests Vitest del filtro (§11).
- **3.6** Smoke público en dev: `/hombre/textil?prenda=camiseta` funciona.

### Fase 4 — Deploy a PRODUCCIÓN (Plan B atómico, igual que Bloque 5)
- **4.1** Working tree limpio, dev verde.
- **4.2** Backup Neon point-in-time (branch `pre-bloque6-backup-YYYYMMDD`).
- **4.3** Pre-loaded del script contra prod: `--dry-run` primero, output literal, **OK**.
- **4.4** Merge `features/garment-type-filter` → `master`, push.
- **4.5** Vercel deploya; `migrate deploy` aplica la aditiva (compatible).
- **4.6** Script real contra prod desde shell aislada con `DATABASE_URL_UNPOOLED`.
- **4.7** Smoke prod: `/hombre/textil?prenda=camiseta` devuelve productos.
- **4.8** Bulk admin del residuo NULL en prod, sin urgencia.

---

## 16. Restricciones innegociables

- **Stock no se toca** (sigue 3472 filas / 3471 unidades).
- **FTS no se toca.**
- **`categoryId` antigua NO se toca** (es la fuente de la Pasada 1).
- **`primaryCategoryId` NO se toca.**
- **`categories[]` (pivote m2m) NO se toca.**
- **NUNCA `prisma migrate dev`.**
- **NO mezclar** este bloque con la contractiva del Bloque 2 (sigue diferida en
  `prisma/migrations-pending/`).
- **Cada paso requiere OK explícito** antes del siguiente.
- **Cualquier escritura a prod**: `--dry-run` previo + output literal + OK.
- La rama `features/garment-type-filter` **NO se crea hasta Fase 1**.
