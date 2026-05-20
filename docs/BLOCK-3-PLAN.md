# Bloque 3 — `footwearType` + filtro "Tipo de calzado"

> Estado: **PLAN — pendiente de OK** (reglas marca+modelo de §4 y arranque de pasos).
> Reglas vigentes: cero prod, sin push, sin `migrate dev`, no se toca
> `ProductSize.stock` ni el FTS, `Product.categoryId` sigue intacto (expand/contract).

## 1. Resumen ejecutivo

Añadimos `Product.footwearType` (String? nullable) para clasificar el calzado por
uso (9 tipos) y un filtro "Tipo de calzado" multi en las 4 páginas de calzado.
Población: `inferFootwearType` de **3 pasadas** (sportUse → name → marca+modelo),
+ etiquetado manual (selector en ficha admin + acción bulk). Integración del filtro
en el **mismo `AND`** de Prisma que el resto, y de paso el filtro de talla pasa a ser
**stock-aware** (`stock > 0`). Todo blindado con test Vitest del bug combinado.

## 2. Cambio en `prisma/schema.prisma`

```diff
 model Product {
   sportUse     String?
+  footwearType String?       // running|trail|tenis|padel|casual|baloncesto|futbol|futbol_sala|chanclas
+  @@index([footwearType])
 }
```

**Decisión: `String?` (no enum Prisma)** — un enum genera churn de migración
(`ALTER TYPE`, y aquí evitamos `migrate dev`); la lista ya está controlada en código
por `FOOTWEAR_TYPES` (validada por Zod en admin + clasificador); es consistente con
`sportUse String?`.

`lib/categories/footwear.ts` (fuente única para auto-mapeo + admin + filtro):
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

## 4. Población de `footwearType` — `inferFootwearType` de 3 pasadas

Hallazgo (verificado en dev): los **375 calzados tienen `sportUse = NULL`** (auto por
sportUse = 0%); auto por **name** ≈ **31,5%** (118/375). Por eso el modelo es dual +
lookup, **fuente única** en `lib/categories/footwear.ts`:

```ts
export function inferFootwearType(opts: {
  sportUse: string | null; name: string; brand?: string | null;
}): FootwearType | null
```

1. **Pasada 1 — `sportUse`** (futureproof; hoy 0% pero PRICATs futuros lo traerán).
   Orden importa: `futbol_sala` ANTES que `futbol`.
   | `sportUse` contiene | tipo |
   |---|---|
   | RUNNING, JOGGIN, JOGGING | running |
   | TRAIL, MONTAÑISMO, TREKKING, MONTAÑA, SENDERISMO | trail |
   | TENIS | tenis · PADEL/PÁDEL | padel |
   | URBAN, CASUAL, LIFESTYLE, MODA | casual |
   | BALONCESTO, BASKET | baloncesto |
   | FUTBOL SALA, FÚTBOL SALA, FUTSAL, SALA | futbol_sala |
   | FUTBOL, FÚTBOL | futbol · CHANCLA(S)/SANDALIA | chanclas |

2. **Pasada 2 — `name` keywords** (word-boundary, ~31,5% hoy):
   `CHANCLA/SANDALIA→chanclas`, `BASKET/BALONCESTO→baloncesto`,
   `SALA/INDOOR/FUTSAL→futbol_sala`, `RUNNING/RUN/JOGGING→running`,
   `TRAIL/TREKKING/MONTAÑA/GTX→trail`, `TENIS→tenis`, `PADEL→padel`,
   `URBAN/CASUAL/LIFESTYLE/MODA/SNEAKER/MUSTANG→casual`, `BOTA/FG/AG→futbol`.

3. **Pasada 3 — lookup marca+modelo** (`MARCA_MODELO_LOOKUP`) — **reglas APROBADAS**
   (evidencia verificada en dev, 0 falsos positivos). Clave = `${BRAND}` (regla de
   marca completa) o `${BRAND}|${LINEA}` (LINEA = palabra de modelo tras la marca):

   | regla | tipo | nº | evidencia |
   |---|---|---|---|
   | marca `+8000` (toda) | trail | 19 | verificado: los 19 son zapatillas de montaña (TIGOR/TELMEN/TOCLA/TAJAR/TRISA), 0 outliers |
   | `MIZUNO\|WAVE` | running | 20 | Wave Ultima/Rider/Skyrise |
   | `MIZUNO\|NEO` | running | 4 | Neo Zen |
   | `PUMA\|FUTURE` | futbol | 9 | Future MG/FG/AG (botas) |
   | `PUMA\|ULTRA` | futbol | 6 | Ultra MG (botas) |
   | `ASICS\|PATRIOT` | running | 4 | Patriot = running |
   | `BABOLAT\|JET` | tenis | 4 | Jet Tere Clay = tenis |

   **NO entran en pasada 3** (ya resueltos por pasada 2, evita ambigüedad de orden):
   `MUSTANG`→casual (keyword), `PUMA|POPCAT`→chanclas (keyword `CHANCLA`). El grueso
   de JOMA y resto de BABOLAT/JHAYBER quedan **sin regla → NULL → manual** (ambiguos).

4. **Resto → `null`** → etiquetado manual (selector ficha + acción bulk).

> Cobertura estimada tras pasadas 2+3 ≈ **49%** (~184/375); el resto (~191) NULL →
> manual. Pasada 1 hoy aporta 0 (sportUse vacío). Cifra real se confirma con la
> verificación de cobertura tras escribir `footwear.ts`.

## 5. Verificación previa (ejecutada en dev)

```
Calzado: 375 · sportUse: 375 NULL (100%) · name-based: 118 (31,5%) · 257 NULL
name-based: 37 chanclas·23 futbol·23 casual·16 futbol_sala·7 running·5 trail·4 padel·3 baloncesto
```
Verificación marca+modelo (pasada 3): se ejecuta y se aprueban reglas antes de
escribir `footwear.ts` (ver final del documento).

## 6. Edición desde admin — selector en ficha (`ProductEditor`)

`<Select>` "Tipo de calzado" en pestaña "General", 9 opciones + "(sin asignar)"
(`null`). **Solo visible si** `primaryCategory.slug.endsWith('-calzado')`. Guarda con
la mutación normal. Zod: `z.enum(FOOTWEAR_TYPES).nullable()`.

## 7. UI del filtro público — multi, CSV en URL

Grupo `<FilterGroup>` "Tipo de calzado" en `ProductFilters.tsx`, **solo** en las 4
páginas de calzado (prop `showFootwearFilter`, true si la categoría es `*-calzado`).
Checkboxes con contador (faceta). NO en accesorios ni textil.

**Multi-selección, patrón idéntico a `marca`/`color`/`talla`:**
- **Parse:** `searchParams.get("tipo")?.split(",").filter(Boolean)` → `string[]`.
- **Serialize:** al togglear, `sp.set("tipo", next.join(","))` o `sp.delete("tipo")`
  si vacío; `?tipo=running,trail`.
- **Sync URL:** `router.push` con `scroll:false` (mismo `pushParams`/`toggleMulti`
  que ya usa `ProductFilters`). Reutiliza la maquinaria existente, solo añade la key
  `tipo`.
- **Chips activos:** "Tipo: Running" con su `onRemove` (igual que el resto).

## 8. `buildProductWhere` + `getCategoryFacets`

En `buildProductWhere` (`lib/public-queries.ts`), **mismo array `AND`** (intersección
estricta; patrón del fix de filtros combinados — NUNCA OR ni campo suelto):

```ts
// footwearType (escalar) — intersección con el resto de filtros del AND.
if (filters.tipo?.length) andClauses.push({ footwearType: { in: filters.tipo } });
```

Y el **filtro de talla pasa a stock-aware** (cambio aprobado, mismo AND):
```ts
// ANTES: sizes: { some: { size: { in: tallas } } }
// AHORA: exige stock > 0 en la talla concreta (consistencia con Bloque 1).
andClauses.push({ OR: tallas.map((t) => ({
  sizes: { some: { size: { equals: t, mode: "insensitive" }, stock: { gt: 0 } } },
})) });
```

`parseCategoryParams`: parsear `tipo` como lista CSV (igual que `talla`).
`getCategoryFacets`: añadir faceta `footwearTypes` (groupBy `footwearType`, where
`status ACTIVE` + categoría). `FiltersData`/`ProductFilters` ganan `footwearTypes`.

## 9. Test Vitest del bug combinado (OBLIGATORIO) — `tests/unit/product-filters-where.test.ts`

`buildProductWhere` es función pura → se asevera la estructura del `where` (sin BD,
sin mock), patrón unit del repo. Los 3 escenarios, **todos en Bloque 3**:
- **(a) Regresión bug original:** `{ color:["negro"], talla:["40"], marca:["joma"] }`
  → `where.AND` con cláusula de color y cláusula de talla `some:{size equals 40,...}`,
  ANDed (no OR raíz). Blinda "no aparece talla 43".
- **(b) Filtro nuevo combinado:** `+ tipo:["padel"]` → el AND incluye además
  `footwearType:{ in:["padel"] }` junto a los otros 3 (intersección de los 4).
- **(c) Stock + talla:** la cláusula de talla incluye `stock:{ gt:0 }` dentro del
  `some` → solo cuenta si esa talla tiene stock. (Incluido en B3 — mismo AND.)
- Extra: test de `inferFootwearType` (sportUse, name y marca+modelo → tipo esperado).

## 10. Actualización de redirecciones (paso h)

UPDATE idempotente de `RedirectRule.to`:
```
/running : /hombre/calzado → /hombre/calzado?tipo=running
/montana : /hombre/calzado → /hombre/calzado?tipo=trail
```
Parte de `scripts/migrate-footweartype.ts` (STEP final) o script aparte.

## 11. Orden de aplicación (puntos de OK)

- **(a)** Migración aditiva en dev (schema `footwearType` + SQL a mano + `migrate deploy`).
- **(b)** `scripts/migrate-footweartype.ts --dry-run` — resumen de pasadas 1+2+3 + NULL.
- **(c)** Script en modo real en dev.
- **(d)** UI admin: selector "Tipo de calzado" en `ProductEditor` (solo familia calzado).
- **(e)** UI admin: acción **bulk** "Asignar tipo de calzado" en `/admin/productos`
  (reusa la infra `bulkAction`/`bulkSetCategory`). Dialog con dropdown de 9 tipos;
  **solo si todos los seleccionados son familia calzado** (si no, mensaje "Selecciona
  solo productos de calzado para esta acción"). Para etiquetar los 257 NULL en lote.
- **(f)** UI público: filtro multi en `/[seccion]/calzado` + integración
  `buildProductWhere` (footwearType + talla stock-aware) + facetas.
- **(g)** Test Vitest (3 escenarios + `inferFootwearType`).
- **(h)** UPDATE de `RedirectRule` (`/running`→`?tipo=running`, `/montana`→`?tipo=trail`).

## Decisiones confirmadas
- §4 Población: **Opción B reforzada** (dual + lookup marca+modelo con evidencia).
- §7 Filtro: **multi** CSV `?tipo=running,trail`.
- §9(c): filtro de talla **stock-aware** incluido en B3.
- Bloque 1-facetas queda reducido a la **UI de contadores** del sidebar (independiente
  de la query, que ya se hace stock-aware aquí).

## Reglas marca+modelo APROBADAS (pasada 3)
7 reglas (ver §4): `+8000`→trail (marca, 19 verificados sin outliers), `MIZUNO|WAVE`
y `MIZUNO|NEO`→running, `PUMA|FUTURE` y `PUMA|ULTRA`→futbol, `ASICS|PATRIOT`→running,
`BABOLAT|JET`→tenis. `MUSTANG`/`POPCAT` se quedan en pasada 2 (no se duplican en p3).

## 12. Migración parcial de filtrado por categoría (paso f, opción C)

Hallazgo: las páginas de categoría nuevas (`hombre-calzado`…) filtraban por el
`categoryId` ANTIGUO → 0 productos (los productos se enlazan ahora vía
`primaryCategoryId`/pivote del Bloque 2). **Smoke verificado en dev:** `hombre-calzado`
pivote=125 (=§4) · primary=125 · categoryId-antiguo=**0**; `nina-textil` pivote=72
(con dup BEBE) · primary=71.

En el paso (f) se migran **SOLO las 2 funciones públicas** de `lib/public-queries.ts`
(`buildProductWhere` y `getCategoryFacets`) a filtrar por la relación m2m:
`where: { categories: { some: { categoryId: id } }, … }`. Se usa el **pivote** (no
`primaryCategoryId`) porque en listados públicos queremos **apariciones** (un BEBE
textil aparece en `/nino/textil` y `/nina/textil`), no el canonical SEO. El resto del
código sigue con `categoryId` (ver §13). El `andClauses[]` (color/talla/marca/género/
precio — fix de filtros combinados) queda **intocado**.

## 13. TODOs post-Bloque 3 (no se hacen ahora)

- [ ] **Facetas filter-aware.** Hoy `getCategoryFacets` da counts INDEPENDIENTES (no
  respetan otros filtros activos) — patrón consistente para marca/color/talla/
  footwearType. Hacer que respeten los demás filtros es una mejora **transversal**
  (afecta a las 4-5 facetas a la vez) que **cambia la firma** de `getCategoryFacets`
  (debe recibir los filtros activos). Pendiente, fuera del Bloque 3.
- [ ] **Migración completa `categoryId` → `primaryCategoryId`/`categories[]`.** El paso
  (f) solo migró las 2 funciones públicas. Quedan ~35 archivos (admin, importers,
  `mutations.ts`, etc.) usando `categoryId`. Es **Bloque 5 PR2**, ANTES de aplicar la
  migración contractiva (que retira `categoryId`). Ver `docs/BLOCK-2-PLAN.md` §10.
