# Bloque 3 — `footwearType` + filtro "Tipo de calzado"

> Estado: **PLAN — pendiente de OK**. Nada aplicado a dev ni a producción.
> Reglas vigentes: cero prod, sin push, sin `migrate dev`, no se toca
> `ProductSize.stock` ni el FTS, `Product.categoryId` sigue intacto (expand/contract).

## 1. Resumen ejecutivo

Añadimos `Product.footwearType` (String? nullable) para clasificar el calzado por
uso (running, trail, tenis, pádel, casual, baloncesto, fútbol, fútbol sala,
chanclas) y un filtro "Tipo de calzado" en las 4 páginas de calzado. Infra:
columna + índice (migración aditiva a mano + `migrate deploy`), módulo único
`lib/categories/footwear.ts`, selector en el admin, filtro en el sidebar público
integrado en el **mismo `AND`** de Prisma que el resto (blindado con test Vitest).

⚠️ **Hallazgo que condiciona el bloque:** el auto-mapeo previsto desde `sportUse`
**no es viable** — ver §4/§5.

## 2. Cambio en `prisma/schema.prisma`

```diff
 model Product {
   // …
   sportUse     String?
+  footwearType String?       // running|trail|tenis|padel|casual|baloncesto|futbol|futbol_sala|chanclas
   // …
+  @@index([footwearType])
 }
```

**Decisión: `String?` (no enum Prisma).** Justificación:
- Un `enum` Prisma genera **churn de migración** cada vez que se añade/quita un
  valor (crea `ALTER TYPE`, y en este repo evitamos `migrate dev`).
- La lista de valores ya está **controlada en código** por `FOOTWEAR_TYPES`
  (constante exportada), validada por Zod en el admin y por el clasificador. No
  necesitamos que Postgres la imponga.
- `String?` es además consistente con `sportUse String?` que ya existe.

`FOOTWEAR_TYPES` se define en `lib/categories/footwear.ts` (junto al clasificador),
fuente única para auto-mapeo + admin + filtro público:
```ts
export const FOOTWEAR_TYPES = ["running","trail","tenis","padel","casual","baloncesto","futbol","futbol_sala","chanclas"] as const;
export type FootwearType = (typeof FOOTWEAR_TYPES)[number];
```

## 3. SQL de la migración aditiva (preview — a mano, `migrate deploy`)

```sql
-- migration: product_footweartype_additive
ALTER TABLE "Product" ADD COLUMN "footwearType" TEXT;
CREATE INDEX "Product_footwearType_idx" ON "Product"("footwearType");
```
100% aditivo. Cero DROP. Sin efecto sobre FTS, `ProductSize`, ni datos existentes.

## 4. Auto-mapeo → `footwearType` · ⚠️ HALLAZGO Y DECISIÓN

**El plan original (auto-mapear desde `sportUse`) NO funciona con los datos reales:**
- De los **375** productos en familia calzado (`Category.slug LIKE '%-calzado'`),
  **los 375 tienen `sportUse = NULL`** (100%). El auto-mapeo por `sportUse`
  clasificaría **0 productos**.
- Probé un auto-mapeo alternativo **por `name`** (RUN, TRAIL, INDOOR/SALA, BOTA,
  CHANCLA, BASKET…): cobertura **31,5% (118/375)**, **257 sin clasificar** (nombres
  de modelo tipo "JOMA POINT/SLAM", "MIZUNO WAVE", "BABOLAT MOVEA/PREMURA",
  "+8000 TIGOR" — sin keyword de tipo).

Distribución del auto-mapeo por nombre (borrador):
```
 37 chanclas · 23 futbol · 23 casual · 16 futbol_sala · 7 running · 5 trail · 4 padel · 3 baloncesto · 257 (null)
```

**Función propuesta (señal dual, fuente única `lib/categories/footwear.ts`):**
```ts
export function inferFootwearType(sportUse: string | null, name: string): FootwearType | null
```
1. Si `sportUse` tiene valor → tabla de keywords de `sportUse` (futureproof: PRICATs
   futuros que sí traigan `sportUse` se clasifican solos).
2. Si no → fallback a keywords de `name`.
3. Si nada casa → `null`.

Tabla `sportUse` (para el futuro) — orden importa (`futbol_sala` ANTES que `futbol`):
| `sportUse` contiene | tipo |
|---|---|
| RUNNING, JOGGIN, JOGGING | running |
| TRAIL, MONTAÑISMO, TREKKING, MONTAÑA, SENDERISMO | trail |
| TENIS | tenis |
| PADEL, PÁDEL | padel |
| URBAN, CASUAL, LIFESTYLE, MODA | casual |
| BALONCESTO, BASKET | baloncesto |
| FUTBOL SALA, FÚTBOL SALA, FUTSAL, SALA | futbol_sala |
| FUTBOL, FÚTBOL | futbol |
| CHANCLA, CHANCLAS, SANDALIA | chanclas |
| resto / vacío | null |

Tabla `name` (la que aplica HOY) — mismas familias, keywords sobre el nombre
normalizado con word-boundary; `INDOOR`/`SALA` → futbol_sala, `BOTA`/`FG`/`AG` →
futbol, marcas casual (`MUSTANG`) → casual.

### Decisión necesaria (te la dejo para OK)
- **Opción A — manual only:** `footwearType` arranca NULL en los 375; se etiqueta a
  mano desde el admin. Cero riesgo de misclasificación, pero 375 a mano.
- **Opción B (recomendada) — name-based seed + manual:** auto-mapea el ~31,5% obvio
  (chanclas/futbol_sala/running/trail/casual/etc.), deja 257 NULL para etiquetado
  manual progresivo. El filtro público solo muestra tipos con productos. Mejor
  arranque sin coste, mejora con el tiempo.
- **Opción C — lookup marca+modelo:** mapear "MIZUNO WAVE"→running,
  "BABOLAT MOVEA/PREMURA"→padel, "JOMA SLAM/OPEN"→padel/tenis… Alto esfuerzo,
  frágil, mantenimiento continuo. **No recomendada.**

Mi voto: **Opción B**, con `inferFootwearType` dual (sportUse-first, name-fallback).
La infraestructura del bloque (columna, admin, filtro, facetas, test) es el valor
real y se construye igual; `footwearType` se va poblando.

## 5. Verificación previa (ejecutada en dev)

```
Productos en familia calzado: 375
Reparto por sportUse: 375 (NULL)   ← 100% vacío
Auto-mapeo por nombre: 118 clasificados (31,5%) · 257 NULL
```
No hay valores raros tipo FITNESS/INDOOR como `sportUse` (porque `sportUse` está
vacío). La señal real es el `name`, con la cobertura limitada de arriba.

## 6. Edición desde admin (`/admin/productos/[id]`)

- `<Select>` "Tipo de calzado" en la pestaña "General" de `ProductEditor.tsx`.
- 9 opciones (`FOOTWEAR_TYPES`) + "(sin asignar)" (= `null`).
- **Solo visible si el producto está en familia calzado** — comprobar con
  `primaryCategory.slug.endsWith('-calzado')` (el editor ya carga la categoría).
- Guarda con la mutación normal del editor (`lib/products/mutations.ts`).
- Validación Zod: `z.enum(FOOTWEAR_TYPES).nullable()`.

## 7. UI del filtro público

- Grupo `<FilterGroup>` "Tipo de calzado" en el sidebar de `ProductFilters.tsx`,
  **solo** en las 4 páginas de calzado (`/hombre/calzado`, `/mujer/calzado`,
  `/nino/calzado`, `/nina/calzado`). NO en accesorios ni textil → se pasa por prop
  (p.ej. `showFootwearFilter`) desde la página, true solo si la categoría es
  `*-calzado`.
- Checkboxes con contador por tipo (de la faceta, según los demás filtros).
- **Multi-selección** (recomendado) — coherente con marca/color/talla que ya son
  multi. Query param `?tipo=running,trail` (CSV, igual que `marca`/`color`/`talla`).

## 8. Integración con `buildProductWhere` y `getCategoryFacets`

- En `buildProductWhere` (`lib/public-queries.ts`): añadir `footwearType` al **mismo
  array `AND`** donde van color/talla (NUNCA OR ni campo suelto). Patrón idéntico al
  fix de filtros combinados ya probado:
  ```ts
  // Respeta el patrón del fix de filtros combinados: cada filtro va en su propio
  // AND, intersección estricta. footwearType es escalar → in[].
  if (filters.tipo?.length) andClauses.push({ footwearType: { in: filters.tipo } });
  ```
- En `parseCategoryParams`: parsear `tipo` como lista CSV (igual que `talla`).
- En `getCategoryFacets`: añadir faceta `footwearTypes` (groupBy `footwearType`
  where `status ACTIVE` + categoría), para el contador del sidebar.
- `ProductFilters` y `FiltersData` ganan el campo `footwearTypes: FacetItem[]`.

## 9. Test Vitest del bug combinado (OBLIGATORIO)

Patrón del repo: unit puro (`tests/unit/*.test.ts`, `import` + `expect`).
`buildProductWhere` es **función pura** (devuelve el `where`, sin BD) → se testea
aseverando la **estructura del objeto** (no hace falta mock de Prisma).

`tests/unit/product-filters-where.test.ts`:
- **(a) Regresión bug original:** `buildProductWhere({ filters: { color:["negro"], talla:["40"], marca:["joma"] }})` → el `where.AND` contiene una cláusula `sizes: { some: { size: { equals:"40" } } }` y otra de color, **ANDed** (no OR a nivel raíz). Se asevera que talla está como `some:{size equals 40}` (intersección) y que no hay ninguna cláusula que permita otras tallas → blinda "no aparece talla 43".
- **(b) Filtro nuevo combinado:** `+ tipo:["padel"]` → el `where` incluye además
  `footwearType: { in:["padel"] }` dentro del AND, junto a los otros 3. Se asevera
  que los 4 coexisten (intersección).
- **(c) Stock + talla:** *requiere* que el filtro de talla sea **stock-aware**
  (`sizes: { some: { size equals t, stock: { gt: 0 } } }`). ⚠️ Eso es un cambio de
  **Bloque 1-facetas** (hoy el filtro de talla NO exige stock>0). **Decisión:** o
  incluimos ese pequeño cambio en B3 (recomendado, va en el mismo AND), o el
  escenario (c) se difiere a Bloque 1-facetas. Si se incluye: el test asevera que
  `talla:["40"]` produce `some:{ size equals 40, stock:{gt:0} }`.

Además un test de `inferFootwearType` (varias entradas sportUse y name → tipo).

## 10. Actualización de redirecciones

Al final del bloque, las dos RedirectRule de deporte se afinan (UPDATE de `to`):
```
/running  : /hombre/calzado  →  /hombre/calzado?tipo=running
/montana  : /hombre/calzado  →  /hombre/calzado?tipo=trail
```
Se ejecuta como `UPDATE` idempotente en `RedirectRule` (parte del
`scripts/migrate-footweartype.ts`, STEP final, o script pequeño aparte). Acción
explícita, documentada aquí.

## 11. Orden de aplicación (puntos de OK)

- **(a)** Migración aditiva en dev (schema `footwearType` + SQL a mano + `migrate deploy`).
- **(b)** `scripts/migrate-footweartype.ts --dry-run` — resumen de qué clasificaría
  (con la opción elegida en §4).
- **(c)** Script en modo real en dev.
- **(d)** UI admin (selector en `ProductEditor`).
- **(e)** UI público (filtro lateral en las 4 páginas de calzado + facetas).
- **(f)** Test Vitest del bug combinado (3 escenarios).
- **(g)** UPDATE de RedirectRule (`/running`, `/montana`).

## Decisiones que necesito que confirmes antes de (a)
1. **§4 — estrategia de población de `footwearType`:** A (manual), **B (name-seed +
   manual, recomendada)**, o C (lookup marca+modelo).
2. **§7 — filtro multi** (`?tipo=running,trail`) — confirmas.
3. **§9(c) — incluir el filtro de talla stock-aware en B3** (pequeño cambio en el
   AND) o diferirlo a Bloque 1-facetas.
