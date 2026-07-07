# Taxonomía, Navegación, Complementos y Bebé — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar en código todos los cambios de taxonomía/navegación pedidos por el cliente (renombrar Accesorios→Complementos, separar camisetas/polos y sudaderas/polares, ampliar ropa de hombre, "Ver todo el calzado", subcategorías finas de Complementos, sección Bebé completa) y purgar el catálogo demo, dejando el árbol de categorías listo para la importación real.

**Architecture:** El sitio tiene **dos sistemas de taxonomía desacoplados**: (1) el **megamenú hardcodeado** en `lib/menu/mega-menu.ts` que dibuja la navegación superior, y (2) el **árbol `Category` en BD** (construido por `scripts/migrate-categories.ts` / endpoints admin) que alimenta las páginas de listado, filtros dinámicos y SEO. Los filtros del sidebar se derivan dinámicamente de `product.groupBy()` (solo aparece un filtro si existen productos con ese atributo). Los tipos de prenda/calzado/accesorio son **strings libres** controlados por listas en `lib/categories/` (NO enums Prisma), por lo que añadir tipos no requiere migración de schema. Como vamos a **borrar todos los productos demo**, los cambios de clasificador no requieren migración de datos: aplican a las importaciones reales futuras.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Prisma 6 (Postgres/Neon), Tailwind 4, Vitest (tests unit), Vercel (deploy + endpoints admin protegidos por Bearer).

**Fuera de alcance (Plan 2 aparte):** El editor de menú self-service en `/admin` (hacer el megamenú gestionable desde BD). Este plan deja el megamenú hardcodeado pero correcto; el Plan 2 lo migra a BD.

**Convención de commits:** un commit pequeño por tarea. Co-Authored-By footer según repo.

---

## Mapa de archivos (qué se toca y por qué)

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `lib/categories/garment.ts` | Modificar | Añadir tipos `polo` y `polar`; reasignar tokens POLO→polo, FORRO/POLAR→polar; labels separados. |
| `lib/categories/classify.ts` | Modificar | Subfamilias finas de accesorios (gorras/guantes/bolsos/billeteros/rinonera/espinilleras/gafas-natacion/patinaje/varios); `otros`→`varios`. |
| `lib/menu/mega-menu.ts` | Modificar | "Ver todo el calzado"; ampliar grupo ROPA (polo, polar, chaqueta, abrigo, cortavientos, conjunto, calentador); ROPA por género (mujer sin bermuda); añadir tab `bebe`. |
| `components/public/Header.tsx` | Modificar | Tab Bebé en `GENDER_TABS`; renombrar "Accesorios"→"Complementos" en `SUBTABS_NINOS`. |
| `components/public/Footer.tsx` | Modificar | Enlace "Accesorios"→"Complementos". |
| `components/public/home/GenderSplit.tsx` | Modificar | CTA "Entrar a Bebé" → `/bebe`. |
| `components/public/GenderLanding.tsx` | Modificar | Config `GENDER_LANDINGS.bebe` (clonar `nino`). |
| `app/(public)/bebe/page.tsx` | Crear | Landing `/bebe` = `<GenderLanding slug="bebe" />`. |
| `app/(public)/[categoria]/[familia]/page.tsx` | Modificar | `VALID_SECCIONES` += `bebe`; excluir `bermuda` de facetas en `mujer`. |
| `lib/public-queries.ts` | Modificar | `RESERVED_SLUGS` += `bebe`; quitar alias demo `bebe`; helper exclusión bermuda. |
| `scripts/migrate-categories.ts` | Modificar | `TREE`: nodos `bebe`/`bebe-textil`/`bebe-calzado` + hijos finos de accesorios + rename Accesorios→Complementos; case `BEBE`→`bebe-${f}`; quitar redirect `/bebe`. |
| `lib/seed/core.ts` | Modificar | Quitar root duplicado `complementos`; renombrar `accesorios`→nombre "Complementos". |
| `lib/categories/taxonomy-tree.ts` | Crear | Fuente única del árbol (TREE) compartida por el script y el endpoint admin. |
| `app/api/admin/apply-taxonomy/route.ts` | Crear | Endpoint protegido: upsert del árbol de categorías en prod (idempotente). |
| `app/api/admin/purge-products/route.ts` | Crear | Endpoint protegido: borra todos los productos (y dependientes) en prod. |
| `app/(public)/catalogo/page.tsx`, `condiciones-de-venta/page.tsx`, `lib/seed/description-templates.ts`, `lib/blog/templates.ts` | Modificar | Copy "accesorios"→"complementos". |
| Tests en `tests/unit/` | Modificar/crear | Cubrir polo/polar y subfamilias de accesorios. |

---

## Fase 0 — Preparación

### Task 0: Rama de trabajo y verificación base

**Files:** ninguno (git).

- [ ] **Step 1: Crear rama desde master**

```bash
git checkout -b feat/taxonomia-complementos-bebe
```

- [ ] **Step 2: Verificar que la suite y el typecheck pasan ANTES de tocar nada**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS (si algo ya falla, anotarlo para no atribuirlo a este trabajo).

- [ ] **Step 3: Localizar los tests de clasificadores existentes**

Run: `npx vitest run tests/unit/garment-classifier.test.ts tests/unit/garment-variant-classifier.test.ts`
Expected: PASS. Leerlos para conocer el estilo antes de la Fase 2.

---

## Fase 1 — Megamenú: "Ver todo el calzado" + ampliar Ropa (R5, R8)

### Task 1: Renombrar el item general de Calzado

**Files:**
- Modify: `lib/menu/mega-menu.ts:79-93` (const `CALZADO`)

- [ ] **Step 1: Cambiar el label del primer item de CALZADO**

En `lib/menu/mega-menu.ts`, dentro de `const CALZADO`, cambiar:

```ts
    { label: "Calzado", familia: "calzado" },
```

por:

```ts
    { label: "Ver todo el calzado", familia: "calzado" },
```

(`CALZADO_MUJER` se deriva de `CALZADO.items` con `.filter`, así que hereda el cambio automáticamente.)

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/menu/mega-menu.ts
git commit -m "feat(menu): item general de calzado pasa a 'Ver todo el calzado'"
```

### Task 2: Ampliar el grupo ROPA con todos los tipos de prenda

**Files:**
- Modify: `lib/menu/mega-menu.ts:62-73` (const `ROPA`)

> NOTA: los tipos `polo` y `polar` se crean en la Fase 2 (Task 5). Este task referencia `prenda: "polo"` y `prenda: "polar"`, que serán valores válidos de `GARMENT_TYPES` tras la Fase 2. Si se ejecuta este plan en orden, hacer **primero la Fase 2 Task 5** y luego este task, o aceptar que el typecheck de strings no valida `prenda` (es `string`, no union) — funciona igual. Para limpieza, ejecutar Fase 2 antes de desplegar.

- [ ] **Step 1: Reemplazar el array de items de ROPA**

En `lib/menu/mega-menu.ts`, sustituir el bloque `const ROPA: MegaMenuGroup = { ... }` completo por:

```ts
/**
 * Ropa: enlace general al textil + sub-categorías por prenda. Cada sub-item
 * filtra por garmentType vía ?prenda=<tipo>; etiquetas y valores coinciden con
 * GARMENT_TYPE_LABELS/GARMENT_TYPES (lib/categories/garment.ts).
 */
const ROPA: MegaMenuGroup = {
  title: "Ropa",
  items: [
    { label: "Ver toda la ropa", familia: "textil" },
    { label: "Camisetas", familia: "textil", prenda: "camiseta" },
    { label: "Polos", familia: "textil", prenda: "polo" },
    { label: "Sudaderas", familia: "textil", prenda: "sudadera" },
    { label: "Polares", familia: "textil", prenda: "polar" },
    { label: "Chándal", familia: "textil", prenda: "chandal" },
    { label: "Chaquetas", familia: "textil", prenda: "chaqueta" },
    { label: "Abrigos", familia: "textil", prenda: "abrigo" },
    { label: "Cortavientos", familia: "textil", prenda: "cortavientos" },
    { label: "Conjuntos", familia: "textil", prenda: "conjunto" },
    { label: "Pantalones", familia: "textil", prenda: "pantalon" },
    { label: "Mallas y leggins", familia: "textil", prenda: "mallas" },
    { label: "Calentadores", familia: "textil", prenda: "calentador" },
    { label: "Bañadores", familia: "textil", prenda: "banador" },
  ],
};

/**
 * Ropa de MUJER: sin "Bermudas y shorts" (petición cliente). Hoy `bermuda` no
 * está en ROPA, así que de momento es idéntico; se mantiene como punto de
 * extensión y para alinear con la exclusión de facetas (ver [familia]/page.tsx).
 * Añade además prendas femeninas si el cliente las pide (faldas/vestidos).
 */
const ROPA_MUJER: MegaMenuGroup = {
  title: "Ropa",
  items: ROPA.items.filter(
    (i) => i.familia !== "textil" || i.prenda !== "bermuda",
  ),
};
```

- [ ] **Step 2: Usar ROPA_MUJER en la sección mujer**

En el objeto `MEGA_MENU`, en la entrada `mujer.sections`, cambiar `groups: [ROPA, CALZADO_MUJER]` por `groups: [ROPA_MUJER, CALZADO_MUJER]`:

```ts
  mujer: {
    href: "/mujer",
    label: "Mujer",
    heroImage: "/category-photos/mujer-hero.webp",
    sections: [{ gender: "MUJER", label: "Mujer", groups: [ROPA_MUJER, CALZADO_MUJER] }],
  },
```

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/menu/mega-menu.ts
git commit -m "feat(menu): ampliar grupo Ropa con todas las prendas; mujer sin bermudas"
```

---

## Fase 2 — Tipos de prenda: separar Polo y Polar + bermuda en mujer (R9, R8)

### Task 3: Test — el clasificador de prenda separa POLO y POLAR

**Files:**
- Test: `tests/unit/garment-classifier.test.ts` (añadir casos; si no existe, crearlo)

- [ ] **Step 1: Añadir tests que fallen**

Añadir a `tests/unit/garment-classifier.test.ts` (importando desde `@/lib/categories/garment` igual que el resto del archivo):

```ts
import { describe, it, expect } from "vitest";
import { matchByToken, inferGarmentType, GARMENT_TYPES, GARMENT_TYPE_LABELS } from "@/lib/categories/garment";

describe("split polo/polar (petición cliente 2026-06)", () => {
  it("POLO se clasifica como 'polo', no 'camiseta'", () => {
    expect(matchByToken("POLO JOHN SMITH AZUL")).toBe("polo");
  });
  it("POLOS (plural) se clasifica como 'polo'", () => {
    expect(matchByToken("POLOS PACK 2 JOMA")).toBe("polo");
  });
  it("CAMISETA sigue siendo 'camiseta'", () => {
    expect(matchByToken("CAMISETA MANGA CORTA PUMA")).toBe("camiseta");
  });
  it("POLAR se clasifica como 'polar', no 'sudadera'", () => {
    expect(matchByToken("POLAR +8000 GRIS")).toBe("polar");
  });
  it("FORRO se clasifica como 'polar'", () => {
    expect(matchByToken("FORRO POLAR MONTAÑA")).toBe("polar");
  });
  it("SUDADERA sigue siendo 'sudadera'", () => {
    expect(matchByToken("SUDADERA CAPUCHA JOHN SMITH")).toBe("sudadera");
  });
  it("polo y polar son tipos válidos con label propio", () => {
    expect(GARMENT_TYPES).toContain("polo");
    expect(GARMENT_TYPES).toContain("polar");
    expect(GARMENT_TYPE_LABELS.polo).toBe("Polos");
    expect(GARMENT_TYPE_LABELS.polar).toBe("Polares");
    expect(GARMENT_TYPE_LABELS.camiseta).toBe("Camisetas");
    expect(GARMENT_TYPE_LABELS.sudadera).toBe("Sudaderas");
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npx vitest run tests/unit/garment-classifier.test.ts`
Expected: FAIL ("polo" no está en GARMENT_TYPES; `matchByToken("POLO…")` devuelve "camiseta").

### Task 4: Implementar los tipos polo/polar en el clasificador

**Files:**
- Modify: `lib/categories/garment.ts:20-44` (GARMENT_TYPES, GARMENT_TYPE_LABELS)
- Modify: `lib/categories/garment.ts:83-105` (TOKEN_ENTRIES)
- Modify: `lib/categories/garment.ts:219-228` (inferGarmentVariant, rama camiseta)

- [ ] **Step 1: Añadir polo y polar a GARMENT_TYPES y separar labels**

Reemplazar el array `GARMENT_TYPES` y el objeto `GARMENT_TYPE_LABELS`:

```ts
export const GARMENT_TYPES = [
  "camiseta", "polo", "sudadera", "polar", "chaqueta", "abrigo", "cortavientos",
  "chandal", "conjunto", "pantalon", "bermuda", "mallas",
  "banador", "falda", "calentador", "vestido", "chaleco",
] as const;

export type GarmentType = (typeof GARMENT_TYPES)[number];

export const GARMENT_TYPE_LABELS: Record<GarmentType, string> = {
  camiseta: "Camisetas",
  polo: "Polos",
  sudadera: "Sudaderas",
  polar: "Polares",
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
  vestido: "Vestidos",
  chaleco: "Chalecos",
};
```

- [ ] **Step 2: Reasignar tokens POLO→polo y FORRO/POLAR→polar**

En `TOKEN_ENTRIES`, modificar las dos filas afectadas y añadir las nuevas. Cambiar:

```ts
  [["CAMISETA", "CAMISETAS", "POLO"], "camiseta"],
```
por:
```ts
  [["CAMISETA", "CAMISETAS"], "camiseta"],
  [["POLO", "POLOS"], "polo"],
```

Y cambiar:
```ts
  [["SUDADERA", "SUDADERAS", "FORRO", "POLAR"], "sudadera"],
```
por:
```ts
  [["SUDADERA", "SUDADERAS"], "sudadera"],
  [["FORRO", "POLAR", "POLARES"], "polar"],
```

- [ ] **Step 3: Quitar la heurística POLO→manga_corta de la rama camiseta**

En `inferGarmentVariant`, dentro de `if (garmentType === "camiseta")`, eliminar estas dos líneas (un polo ya no es `camiseta`, por lo que la heurística no aplica):

```ts
    // Heurística (3.5.3): POLO sin otro token → manga corta (los polos deportivos
    // son manga corta por convención).
    if (/\bPOLO[S]?\b/.test(n)) return "manga_corta";
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

Run: `npx vitest run tests/unit/garment-classifier.test.ts tests/unit/garment-variant-classifier.test.ts`
Expected: PASS. Si algún test de variante existente asumía POLO→manga_corta, actualizarlo para reflejar el nuevo modelo (polo es su propio tipo, sin variante).

- [ ] **Step 5: Verificar que no hay otros usos rotos de GARMENT_TYPE_LABELS**

Run: `npx tsc --noEmit`
Expected: PASS (los `Record<GarmentType, string>` obligan a cubrir todas las claves; si falta alguna, el compilador lo señala).

- [ ] **Step 6: Commit**

```bash
git add lib/categories/garment.ts tests/unit/garment-classifier.test.ts tests/unit/garment-variant-classifier.test.ts
git commit -m "feat(garment): separar tipos polo y polar; labels independientes"
```

### Task 5: Excluir "bermuda" de las facetas de prenda en la sección Mujer

**Files:**
- Modify: `app/(public)/[categoria]/[familia]/page.tsx:189-196` (tras calcular facets)

- [ ] **Step 1: Filtrar la faceta garmentTypes para mujer**

En `app/(public)/[categoria]/[familia]/page.tsx`, justo DESPUÉS del bloque `try { facets = await getCategoryFacets(categoryIds); } catch ...` (alrededor de la línea 196, dentro del `if (!category.isDemo)`), añadir:

```ts
    // Petición cliente: en MUJER no ofrecemos "Bermudas y shorts" como filtro.
    if (seccion === "mujer") {
      facets = {
        ...facets,
        garmentTypes: facets.garmentTypes.filter((g) => g.value !== "bermuda"),
      };
    }
```

- [ ] **Step 2: Bloquear el filtro directo ?prenda=bermuda en mujer**

En el mismo archivo, justo después de `const filters = parseCategoryParams(sp);` (≈línea 115), añadir:

```ts
  // Coherencia con la exclusión de facetas: ignorar ?prenda=bermuda en mujer.
  if (seccion === "mujer" && filters.prenda?.length) {
    filters.prenda = filters.prenda.filter((p) => p !== "bermuda");
  }
```

- [ ] **Step 3: Verificar typecheck y build de la ruta**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/[categoria]/[familia]/page.tsx"
git commit -m "feat(mujer): ocultar filtro de bermudas/shorts en la sección mujer"
```

---

## Fase 3 — Complementos: rename + subcategorías finas (R3, R7)

### Task 6: Subfamilias finas de accesorios en el clasificador

**Files:**
- Modify: `lib/categories/classify.ts:24-32` (FamilyResult)
- Modify: `lib/categories/classify.ts:54-66` (sets ACC_*)
- Modify: `lib/categories/classify.ts:83-129` (pass1, pass2)
- Test: `tests/unit/classify-accesorios.test.ts` (crear)

- [ ] **Step 1: Test que falle — subfamilias finas**

Crear `tests/unit/classify-accesorios.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { classify } from "@/lib/categories/classify";

describe("subfamilias finas de complementos (petición cliente 2026-06)", () => {
  it("GORRA → accesorios:gorras", () => expect(classify("GORRA JOHN SMITH")).toBe("accesorios:gorras"));
  it("GUANTES → accesorios:guantes", () => expect(classify("GUANTES PORTERO")).toBe("accesorios:guantes"));
  it("BOLSA → accesorios:bolsos", () => expect(classify("BOLSA DEPORTE JOMA")).toBe("accesorios:bolsos"));
  it("BILLETERO → accesorios:billeteros", () => expect(classify("BILLETERO JOHN SMITH")).toBe("accesorios:billeteros"));
  it("RIÑONERA → accesorios:rinonera", () => expect(classify("RIÑONERA NEGRA")).toBe("accesorios:rinonera"));
  it("ESPINILLERA → accesorios:espinilleras", () => expect(classify("ESPINILLERAS FUTBOL")).toBe("accesorios:espinilleras"));
  it("GAFAS → accesorios:gafas-natacion", () => expect(classify("GAFAS NATACION SPEEDO")).toBe("accesorios:gafas-natacion"));
  it("PATINES → accesorios:patinaje", () => expect(classify("PATINES EN LINEA")).toBe("accesorios:patinaje"));
  it("BOTELLA (catch-all) → accesorios:varios", () => expect(classify("BOTELLA ALUMINIO")).toBe("accesorios:varios"));
  it("MOCHILA sigue → accesorios:mochilas", () => expect(classify("MOCHILA 30L")).toBe("accesorios:mochilas"));
  it("BALON sigue → accesorios:balones", () => expect(classify("BALON FUTBOL")).toBe("accesorios:balones"));
  it("CALCETINES sigue → accesorios:calcetines", () => expect(classify("CALCETINES PACK 3")).toBe("accesorios:calcetines"));
  it("PALA sigue → accesorios:padel", () => expect(classify("PALA BULLPADEL")).toBe("accesorios:padel"));
});
```

Run: `npx vitest run tests/unit/classify-accesorios.test.ts`
Expected: FAIL.

- [ ] **Step 2: Ampliar FamilyResult**

Reemplazar el tipo `FamilyResult` en `lib/categories/classify.ts`:

```ts
export type FamilyResult =
  | "textil"
  | "calzado"
  | "accesorios:padel"
  | "accesorios:mochilas"
  | "accesorios:balones"
  | "accesorios:calcetines"
  | "accesorios:gorras"
  | "accesorios:guantes"
  | "accesorios:bolsos"
  | "accesorios:billeteros"
  | "accesorios:rinonera"
  | "accesorios:espinilleras"
  | "accesorios:gafas-natacion"
  | "accesorios:patinaje"
  | "accesorios:varios"
  | "UNCLASSIFIED";
```

- [ ] **Step 3: Reemplazar el set ACC_OTROS por sets finos**

Sustituir la línea `const ACC_OTROS = new Set([...])` (≈59-66) por:

```ts
const ACC_GORRAS = new Set(["GORRA", "GORRAS", "GORRO", "GORROS", "VISERA", "VISERAS"]);
const ACC_GUANTES = new Set(["GUANTE", "GUANTES", "MANOPLA", "MANOPLAS"]);
const ACC_BOLSOS = new Set(["BOLSA", "BOLSAS", "BOLSO", "BOLSOS", "BANDOLERA", "NECESER"]);
const ACC_BILLETEROS = new Set(["BILLETERO", "BILLETEROS", "MONEDERO", "CARTERA"]);
const ACC_RINONERA = new Set(["RINONERA", "RINONERAS"]);
const ACC_ESPINILLERAS = new Set(["ESPINILLERA", "ESPINILLERAS", "TIBIAL", "TIBIALES"]);
const ACC_GAFAS = new Set(["GAFAS", "GAFA"]);
const ACC_PATINAJE = new Set(["PATIN", "PATINES", "PROTECCIONES", "CODERA", "CODERAS", "RODILLERA", "RODILLERAS"]);
// Catch-all de complementos: lo que no encaja en una subfamilia concreta.
const ACC_VARIOS = new Set([
  "BUFANDA", "MUNEQUERA", "MUNEQUERAS", "TOALLA", "TOALLITA", "BOTELLA", "CINTURON",
  "FUNDA", "ESTUCHE", "PLANTILLA", "PLANTILLAS", "ZAPATILLERO", "ZAPATILLEROS",
  "BANDA", "TALONERA", "VENDAS", "OREJERAS", "NASDIL", "NASODILATADOR",
  "RAQUETA", "RAQUETAS",
]);
```

- [ ] **Step 4: Enrutar las subfamilias en pass1**

En `pass1`, reemplazar el bloque `// 6. accesorios:otros\n  if (ACC_OTROS.has(fw)) return "accesorios:otros";` por:

```ts
  // 6. accesorios:<subfamilia fina>
  if (ACC_GORRAS.has(fw)) return "accesorios:gorras";
  if (ACC_GUANTES.has(fw)) return "accesorios:guantes";
  if (ACC_BOLSOS.has(fw)) return "accesorios:bolsos";
  if (ACC_BILLETEROS.has(fw)) return "accesorios:billeteros";
  if (ACC_RINONERA.has(fw)) return "accesorios:rinonera";
  if (ACC_ESPINILLERAS.has(fw)) return "accesorios:espinilleras";
  if (ACC_GAFAS.has(fw)) return "accesorios:gafas-natacion";
  if (ACC_PATINAJE.has(fw)) return "accesorios:patinaje";
  if (ACC_VARIOS.has(fw)) return "accesorios:varios";
```

- [ ] **Step 5: Enrutar las subfamilias en pass2**

En `pass2`, reemplazar `if (has(ACC_OTROS)) return "accesorios:otros";` por:

```ts
  if (has(ACC_GORRAS)) return "accesorios:gorras";
  if (has(ACC_GUANTES)) return "accesorios:guantes";
  if (has(ACC_BOLSOS)) return "accesorios:bolsos";
  if (has(ACC_BILLETEROS)) return "accesorios:billeteros";
  if (has(ACC_RINONERA)) return "accesorios:rinonera";
  if (has(ACC_ESPINILLERAS)) return "accesorios:espinilleras";
  if (has(ACC_GAFAS)) return "accesorios:gafas-natacion";
  if (has(ACC_PATINAJE)) return "accesorios:patinaje";
  if (has(ACC_VARIOS)) return "accesorios:varios";
```

- [ ] **Step 6: Ejecutar tests**

Run: `npx vitest run tests/unit/classify-accesorios.test.ts`
Expected: PASS. Si hay un test previo de classify que esperaba `accesorios:otros`, actualizarlo a `accesorios:varios`.

- [ ] **Step 7: Verificar que no quedan referencias a `accesorios:otros`**

Run: `npx tsc --noEmit`
Expected: PASS. Buscar también referencias textuales: `grep -rn "accesorios:otros\|accesorios-otros" lib scripts app` y actualizarlas (la principal es el `TREE` de `migrate-categories.ts`, que se reescribe entero en la Task 9).

- [ ] **Step 8: Commit**

```bash
git add lib/categories/classify.ts tests/unit/classify-accesorios.test.ts
git commit -m "feat(complementos): subfamilias finas (gorras, guantes, bolsos, ...) en el clasificador"
```

### Task 7: Renombrar "Accesorios"→"Complementos" en el copy visible

**Files:**
- Modify: `components/public/Header.tsx:62-64` (SUBTABS_NINOS)
- Modify: `components/public/Footer.tsx:18`
- Modify: `app/(public)/catalogo/page.tsx:46`
- Modify: `app/(public)/condiciones-de-venta/page.tsx:147`
- Modify: `lib/seed/description-templates.ts:474,484,487`
- Modify: `lib/blog/templates.ts:385`

> El **slug** de la URL se mantiene `/accesorios` (los guards `category.slug === "accesorios"` en `[categoria]/page.tsx` dependen de él). Solo cambia el **texto visible** y el **nombre** de la categoría (Task 9 y Task 12).

- [ ] **Step 1: Header — label del subtab**

En `components/public/Header.tsx`, en `SUBTABS_NINOS`, cambiar `{ label: "Accesorios", href: "/accesorios" }` por `{ label: "Complementos", href: "/accesorios" }`.

- [ ] **Step 2: Footer — enlace**

En `components/public/Footer.tsx:18`, cambiar `{ label: "Accesorios", href: "/accesorios" }` por `{ label: "Complementos", href: "/accesorios" }`.

- [ ] **Step 3: Catálogo meta**

En `app/(public)/catalogo/page.tsx:46`, cambiar "...ropa, calzado y accesorios deportivos..." por "...ropa, calzado y complementos deportivos...".

- [ ] **Step 4: Condiciones de venta**

En `app/(public)/condiciones-de-venta/page.tsx:147`, cambiar "accesorios y etiquetas" por "complementos y etiquetas".

- [ ] **Step 5: Plantillas de descripción y blog**

En `lib/seed/description-templates.ts` líneas 474/484/487, cambiar "Accesorio/accesorio" por "Complemento/complemento" en los textos de plantilla. En `lib/blog/templates.ts:385`, cambiar "accesorios" por "complementos".

- [ ] **Step 6: Verificar que no queda copy visible con "accesorio"**

Run: `grep -rn -i "accesorio" app components lib --include=*.tsx --include=*.ts | grep -v "slug.*accesorios\|=== \"accesorios\"\|/accesorios\|accesorios:" `
Expected: revisar manualmente la salida; solo deben quedar referencias técnicas (slug/URL/familia), no copy visible.

- [ ] **Step 7: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/public/Header.tsx components/public/Footer.tsx "app/(public)/catalogo/page.tsx" "app/(public)/condiciones-de-venta/page.tsx" lib/seed/description-templates.ts lib/blog/templates.ts
git commit -m "feat(copy): renombrar Accesorios a Complementos en todo el texto visible"
```

---

## Fase 4 — Sección Bebé completa (R2)

### Task 8: Tab Bebé en el megamenú y el Header

**Files:**
- Modify: `lib/menu/mega-menu.ts:15` (MegaMenuGender), `:46-51` (SECCION_BY_GENDER), `:37-43` (MegaMenuTab.href), `:110-145` (MEGA_MENU + keys)
- Modify: `components/public/Header.tsx:66-99` (GENDER_TABS)

- [ ] **Step 1: Ampliar el tipo de género y el mapa de sección**

En `lib/menu/mega-menu.ts`:

```ts
export type MegaMenuGender = "MUJER" | "HOMBRE" | "NINO" | "NINA" | "BEBE";
```

Y en `SECCION_BY_GENDER` añadir `BEBE: "bebe"`:

```ts
const SECCION_BY_GENDER: Record<MegaMenuGender, "mujer" | "hombre" | "nino" | "nina" | "bebe"> = {
  MUJER: "mujer",
  HOMBRE: "hombre",
  NINO: "nino",
  NINA: "nina",
  BEBE: "bebe",
};
```

- [ ] **Step 2: Ampliar el href de MegaMenuTab**

En el tipo `MegaMenuTab`, cambiar la unión `href` para incluir `/bebe`:

```ts
  href: "/mujer" | "/hombre" | "/nino" | "/nina" | "/bebe";
```

- [ ] **Step 3: Añadir la tab bebe al objeto MEGA_MENU**

Cambiar el tipo del objeto `MEGA_MENU` para incluir `bebe: MegaMenuTab` y añadir la entrada (usa el grupo ROPA + CALZADO completos, como niño/niña):

```ts
export const MEGA_MENU: {
  mujer: MegaMenuTab;
  hombre: MegaMenuTab;
  nino: MegaMenuTab;
  nina: MegaMenuTab;
  bebe: MegaMenuTab;
} = {
  // ...mujer, hombre, nino, nina sin cambios...
  bebe: {
    href: "/bebe",
    label: "Bebé",
    heroImage: "/category-photos/ninos-hero.jpg",
    sections: [{ gender: "BEBE", label: "Bebé", groups: [ROPA, CALZADO] }],
  },
};
```

Y añadir `"bebe"` a `MEGA_MENU_KEYS`:

```ts
export const MEGA_MENU_KEYS: MegaMenuKey[] = ["mujer", "hombre", "nino", "nina", "bebe"];
```

- [ ] **Step 4: Añadir la tab Bebé en el Header**

En `components/public/Header.tsx`, en `GENDER_TABS`, añadir tras la entrada `nina`:

```ts
  {
    key: "bebe",
    label: "Bebé",
    href: "/bebe",
    match: (p) => p === "/bebe" || p.startsWith("/bebe/"),
  },
```

- [ ] **Step 5: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (las tabs del Header tipan `key: MegaMenuKey`, que ahora incluye `bebe`).

- [ ] **Step 6: Commit**

```bash
git add lib/menu/mega-menu.ts components/public/Header.tsx
git commit -m "feat(bebe): tab Bebé en megamenú y header (Ropa + Calzado)"
```

### Task 9: Árbol de categorías compartido + nodos Bebé y subcategorías de Complementos

**Files:**
- Create: `lib/categories/taxonomy-tree.ts`
- Modify: `scripts/migrate-categories.ts:21-42` (importar TREE del módulo nuevo), `:97` (case BEBE), `:45-69` (quitar redirect `/bebe`)

- [ ] **Step 1: Crear el módulo de árbol compartido**

Crear `lib/categories/taxonomy-tree.ts` con el árbol completo (raíces + compuestas incl. **bebe** + hijos finos de **complementos**). Este módulo es la fuente única que usan el script y el endpoint admin (Task 11):

```ts
/**
 * Árbol de categorías canónico de Zona Sport (fuente única).
 *
 * Lo consumen:
 *   · scripts/migrate-categories.ts (migración CLI)
 *   · app/api/admin/apply-taxonomy/route.ts (upsert en prod vía HTTP)
 *
 * Nivel 0: raíces de género (hombre/mujer/nino/nina/bebe) + complementos.
 * Nivel 1: familia por género (`<gen>-textil`, `<gen>-calzado`) + hijos de
 * complementos (subfamilias finas que casan con classify.ts → accesorios:<x>).
 *
 * IMPORTANTE: el slug raíz de complementos sigue siendo "accesorios" (los
 * guards de UI dependen de él); solo cambia el NOMBRE visible a "Complementos".
 */
export type TaxonomyNode = {
  slug: string;
  name: string;
  parentSlug: string | null;
  position: number;
  metaTitle: string;
  metaDescription: string;
};

const GENEROS: Array<{ slug: string; name: string; position: number }> = [
  { slug: "hombre", name: "Hombre", position: 1 },
  { slug: "mujer", name: "Mujer", position: 2 },
  { slug: "nino", name: "Niño", position: 3 },
  { slug: "nina", name: "Niña", position: 4 },
  { slug: "bebe", name: "Bebé", position: 5 },
];

// Subfamilias de complementos — el sufijo del slug DEBE coincidir con la parte
// tras "accesorios:" en classify.ts (accesorios-<suffix>).
const COMPLEMENTOS_HIJOS: Array<{ suffix: string; name: string }> = [
  { suffix: "balones", name: "Balones" },
  { suffix: "billeteros", name: "Billeteros" },
  { suffix: "bolsos", name: "Bolsos" },
  { suffix: "calcetines", name: "Calcetines" },
  { suffix: "espinilleras", name: "Espinilleras" },
  { suffix: "gafas-natacion", name: "Gafas de natación" },
  { suffix: "gorras", name: "Gorras" },
  { suffix: "guantes", name: "Guantes" },
  { suffix: "mochilas", name: "Mochilas" },
  { suffix: "patinaje", name: "Patinaje" },
  { suffix: "rinonera", name: "Riñonera" },
  { suffix: "padel", name: "Pádel" },
  { suffix: "varios", name: "Varios" },
];

export const TAXONOMY_TREE: TaxonomyNode[] = [
  ...GENEROS.map((g) => ({
    slug: g.slug,
    name: g.name,
    parentSlug: null,
    position: g.position,
    metaTitle: `${g.name} — Ropa y calzado deportivo | Zona Sport`,
    metaDescription: `Equipación deportiva de ${g.name.toLowerCase()}: textil y calzado. Envío a toda España.`,
  })),
  {
    slug: "accesorios",
    name: "Complementos",
    parentSlug: null,
    position: 6,
    metaTitle: "Complementos deportivos | Zona Sport",
    metaDescription: "Mochilas, balones, calcetines, gorras, guantes y más complementos deportivos.",
  },
  ...GENEROS.flatMap((g) => [
    {
      slug: `${g.slug}-textil`,
      name: `Textil ${g.name.toLowerCase()}`,
      parentSlug: g.slug,
      position: 1,
      metaTitle: `Ropa de ${g.name.toLowerCase()} | Zona Sport`,
      metaDescription: `Camisetas, polos, sudaderas, chándales y abrigos de ${g.name.toLowerCase()}.`,
    },
    {
      slug: `${g.slug}-calzado`,
      name: `Calzado ${g.name.toLowerCase()}`,
      parentSlug: g.slug,
      position: 2,
      metaTitle: `Zapatillas y calzado de ${g.name.toLowerCase()} | Zona Sport`,
      metaDescription: `Zapatillas de running, pádel y casual para ${g.name.toLowerCase()}.`,
    },
  ]),
  ...COMPLEMENTOS_HIJOS.map((h, i) => ({
    slug: `accesorios-${h.suffix}`,
    name: h.name,
    parentSlug: "accesorios",
    position: i + 1,
    metaTitle: `${h.name} | Zona Sport`,
    metaDescription: `${h.name} deportivos multimarca en Zona Sport.`,
  })),
];
```

- [ ] **Step 2: Hacer que migrate-categories.ts use el árbol compartido**

En `scripts/migrate-categories.ts`, sustituir la definición local de `TREE` (líneas 21-42) por un import del módulo nuevo:

```ts
import { TAXONOMY_TREE, type TaxonomyNode } from "../lib/categories/taxonomy-tree";

type Node = TaxonomyNode;
const TREE: Node[] = TAXONOMY_TREE;
const TREE_SLUGS = new Set(TREE.map((t) => t.slug));
```

Eliminar la validación `if (TREE.length !== 18)` (el árbol ahora tiene más nodos) o cambiarla a `if (TREE.length !== TAXONOMY_TREE.length)` (siempre cierto → quitarla). Quitar también el bloque `EXPECTED`/conteos esperados o dejarlo (es solo informe de dry-run; no bloquea).

- [ ] **Step 3: Bebé como categoría propia en la asignación**

En `assignCategories` (≈línea 97), cambiar el case `BEBE` para que apunte a su propia sección en vez de niño/niña:

```ts
    case "BEBE": return { ok: true, primary: `bebe-${f}`, all: [`bebe-${f}`] };
```

- [ ] **Step 4: Quitar el redirect /bebe → /nino/calzado**

En el objeto `REDIRECTS` (≈línea 52), eliminar la línea:

```ts
  "/bebe": "/nino/calzado", // D1 ajustada: coherencia con primary fijo de BEBE
```

(De lo contrario `/bebe` redirige y nunca llega a la landing nueva.)

- [ ] **Step 5: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/categories/taxonomy-tree.ts scripts/migrate-categories.ts
git commit -m "feat(taxonomy): árbol compartido con sección Bebé y subcategorías finas de complementos"
```

### Task 10: Landing /bebe + ruta de sección/familia

**Files:**
- Create: `app/(public)/bebe/page.tsx`
- Modify: `components/public/GenderLanding.tsx` (config GENDER_LANDINGS)
- Modify: `app/(public)/[categoria]/[familia]/page.tsx:40` (VALID_SECCIONES)
- Modify: `lib/public-queries.ts:764-790` (RESERVED_SLUGS) y `:97-99` (alias demo bebe)

- [ ] **Step 1: Leer la config de landings y clonar la de niño**

Abrir `components/public/GenderLanding.tsx`, localizar `GENDER_LANDINGS` y la entrada `nino`. Añadir una entrada `bebe` clonando la de `nino` (mismos campos: `seoLead`, títulos, imágenes, tiles), adaptando textos a "Bebé" y el `slug`/género a `bebe`/`BEBE`. Verificar el tipo del objeto: si `GenderLanding` acepta `slug: "mujer" | ... | "nina"`, ampliar esa unión con `"bebe"` y el mapa de género a `BEBE`.

> Acción concreta de ejecución: copiar el objeto `nino` completo dentro de `GENDER_LANDINGS`, renombrar la clave a `bebe`, cambiar `name`/títulos a "Bebé" y cualquier `gender: "NINO"` por `gender: "BEBE"`. Reutilizar la imagen `/category-photos/ninos-hero.jpg` salvo que exista una de bebé.

- [ ] **Step 2: Crear la página landing**

Crear `app/(public)/bebe/page.tsx`:

```tsx
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { GenderLanding, GENDER_LANDINGS } from "@/components/public/GenderLanding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Bebé — Ropa, calzado y equipación deportiva",
  description: GENDER_LANDINGS.bebe.seoLead,
  path: "/bebe",
});

export default function BebePage() {
  return <GenderLanding slug="bebe" />;
}
```

- [ ] **Step 3: Permitir /bebe/textil y /bebe/calzado**

En `app/(public)/[categoria]/[familia]/page.tsx:40`, ampliar:

```ts
const VALID_SECCIONES = ["hombre", "mujer", "nino", "nina", "bebe"] as const;
```

- [ ] **Step 4: Reservar el slug bebe y quitar su alias demo**

En `lib/public-queries.ts`, añadir `"bebe"` al `RESERVED_SLUGS` (junto a nino/nina) para que la ruta genérica `[categoria]` no capture `/bebe` (ahora es landing estática). Y eliminar del objeto `DEMO_CATEGORY_ALIASES` la entrada `bebe: { name: "Bebé", categorySlugs: [] }` (≈línea 98), ya innecesaria.

```ts
  // En RESERVED_SLUGS, junto a "nino", "nina":
  "nino",
  "nina",
  "bebe",
```

- [ ] **Step 5: Verificar typecheck y build**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run build`
Expected: build OK; en la salida debe aparecer la ruta `/bebe` y prerenders `/[categoria]/[familia]` incluyendo combos de bebe.

- [ ] **Step 6: Commit**

```bash
git add "app/(public)/bebe/page.tsx" components/public/GenderLanding.tsx "app/(public)/[categoria]/[familia]/page.tsx" lib/public-queries.ts
git commit -m "feat(bebe): landing /bebe + rutas /bebe/textil y /bebe/calzado"
```

### Task 11: CTA "Entrar a Bebé" en la home

**Files:**
- Modify: `components/public/home/GenderSplit.tsx:177-194` (botonera)

- [ ] **Step 1: Añadir el botón Bebé**

En `components/public/home/GenderSplit.tsx`, dentro del `<div className="flex flex-wrap items-center gap-3 pt-2">`, tras el `<Link href="/nina">…</Link>`, añadir:

```tsx
              <Link
                href="/bebe"
                data-cursor="Bebé"
                className="group/cta inline-flex h-12 items-center gap-2 rounded-xl bg-zs-blue-950 px-6 text-sm font-bold uppercase tracking-[0.12em] text-zs-tennis-300 shadow-lg transition hover:bg-zs-red-600 hover:text-white"
              >
                Entrar a Bebé
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover/cta:rotate-45" />
              </Link>
```

(La lista decorativa inferior ya muestra `["Niño", "Niña", "Bebé"]`, así que queda coherente.)

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "components/public/home/GenderSplit.tsx"
git commit -m "feat(home): CTA 'Entrar a Bebé' en el bloque Para los pequeños"
```

---

## Fase 5 — Datos en producción: aplicar árbol + purgar demo (R1, R7-data, R2-data)

> Producción se gestiona por **endpoints admin protegidos con Bearer** (no se corren scripts locales contra prod; `DATABASE_URL` de prod no se pulle a local — ver `memory/project_db_bootstrap`). Reutilizamos `SETUP_TOKEN` como Bearer (el mismo de `/api/admin/setup`). Estos pasos se ejecutan **después de desplegar** el código de las fases 1-4.

### Task 12: Endpoint de aplicación de taxonomía (upsert del árbol)

**Files:**
- Create: `app/api/admin/apply-taxonomy/route.ts`

- [ ] **Step 1: Leer el patrón de auth existente**

Abrir `app/api/admin/clean-product-names/route.ts` (o `app/api/admin/setup`) y replicar exactamente su comprobación de Bearer (`Authorization: Bearer <SETUP_TOKEN>` o el header que use) y `runtime`/`dynamic`.

- [ ] **Step 2: Crear el endpoint**

Crear `app/api/admin/apply-taxonomy/route.ts` (ajustar el check de token al patrón del paso 1):

```ts
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { TAXONOMY_TREE } from "@/lib/categories/taxonomy-tree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const token = process.env.SETUP_TOKEN;
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const slugToId: Record<string, string> = {};
  // Raíces primero (parentId null), luego hijas.
  for (const n of TAXONOMY_TREE.filter((t) => !t.parentSlug)) {
    const c = await db.category.upsert({
      where: { slug: n.slug },
      update: { name: n.name, position: n.position, metaTitle: n.metaTitle, metaDescription: n.metaDescription, parentId: null },
      create: { slug: n.slug, name: n.name, parentId: null, position: n.position, metaTitle: n.metaTitle, metaDescription: n.metaDescription },
    });
    slugToId[n.slug] = c.id;
  }
  for (const n of TAXONOMY_TREE.filter((t) => t.parentSlug)) {
    const c = await db.category.upsert({
      where: { slug: n.slug },
      update: { name: n.name, parentId: slugToId[n.parentSlug!], position: n.position, metaTitle: n.metaTitle, metaDescription: n.metaDescription },
      create: { slug: n.slug, name: n.name, parentId: slugToId[n.parentSlug!], position: n.position, metaTitle: n.metaTitle, metaDescription: n.metaDescription },
    });
    slugToId[n.slug] = c.id;
  }
  // Quitar el redirect /bebe si existía (ahora /bebe es landing).
  await db.redirectRule.deleteMany({ where: { from: "/bebe" } });
  return NextResponse.json({ ok: true, upserted: Object.keys(slugToId).length });
}
```

- [ ] **Step 3: Verificar build local del endpoint**

Run: `npm run build`
Expected: la ruta `/api/admin/apply-taxonomy` aparece en la salida.

- [ ] **Step 4: Commit**

```bash
git add "app/api/admin/apply-taxonomy/route.ts"
git commit -m "feat(admin): endpoint protegido para aplicar el árbol de categorías en prod"
```

### Task 13: Endpoint de purga de productos demo

**Files:**
- Create: `app/api/admin/purge-products/route.ts`

- [ ] **Step 1: Crear el endpoint con doble confirmación**

Crear `app/api/admin/purge-products/route.ts`. Borra todos los productos (las dependencias `ProductImage`/`ProductSize`/`ProductAudit`/`ProductCategory` caen por `onDelete: Cascade`). Requiere Bearer **y** un body `{ "confirm": "BORRAR-TODOS-LOS-PRODUCTOS" }` para evitar accidentes:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRM = "BORRAR-TODOS-LOS-PRODUCTOS";

function authorized(req: NextRequest): boolean {
  const token = process.env.SETUP_TOKEN;
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch { /* sin body */ }
  if (body.confirm !== CONFIRM) {
    return NextResponse.json(
      { error: "confirmation_required", hint: `POST { "confirm": "${CONFIRM}" }` },
      { status: 400 },
    );
  }
  const before = await db.product.count();
  // Cascade borra ProductImage/Size/Audit/ProductCategory. OrderItem.productId es
  // nullable sin FK cascade: lo desvinculamos para no dejar referencias colgando.
  await db.orderItem.updateMany({ where: { productId: { not: null } }, data: { productId: null } });
  await db.product.deleteMany({});
  const after = await db.product.count();
  return NextResponse.json({ ok: true, deleted: before, remaining: after });
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: la ruta `/api/admin/purge-products` aparece en la salida.

- [ ] **Step 3: Commit**

```bash
git add "app/api/admin/purge-products/route.ts"
git commit -m "feat(admin): endpoint protegido para purgar productos (doble confirmación)"
```

### Task 14: Limpiar el seed (quitar root duplicado + rename)

**Files:**
- Modify: `lib/seed/core.ts:116-131` (rootCategories)

- [ ] **Step 1: Consolidar Complementos en el seed**

En `lib/seed/core.ts`, en `rootCategories`: **eliminar** la entrada duplicada `{ name: "Complementos", slug: "complementos", ... }` (position 7) y **renombrar** la entrada `{ name: "Accesorios", slug: "accesorios", ... }` a `name: "Complementos"` (mantener `slug: "accesorios"`). Esto evita dos raíces de complementos y alinea el seed con el árbol canónico.

- [ ] **Step 2: Verificar typecheck y test del seed (si existe)**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/seed/core.ts
git commit -m "chore(seed): consolidar Complementos (quitar root duplicado) y renombrar accesorios"
```

---

## Fase 6 — Verificación, deploy y ejecución en prod

### Task 15: Verificación local completa

- [ ] **Step 1: Suite + typecheck + lint + build**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: todo PASS. Anotar cualquier fallo y resolverlo antes de continuar.

- [ ] **Step 2: Smoke manual con el dev server (skill `run`)**

Levantar `npm run dev` y comprobar visualmente:
- Megamenú: Mujer/Hombre/Niño/Niña/**Bebé**; en Calzado el primer item dice **"Ver todo el calzado"**; en Ropa aparecen Camisetas, **Polos**, Sudaderas, **Polares**, Chándal, Chaquetas, Abrigos, Cortavientos, Conjuntos, Pantalones, Mallas y leggins, Calentadores, Bañadores.
- Header y Footer dicen **"Complementos"** (no "Accesorios").
- Home → bloque "Para los pequeños" muestra **"Entrar a Bebé"**.
- `/bebe` carga la landing; `/bebe/calzado` y `/bebe/textil` cargan (vacíos por ahora).
- En `mujer` (megamenú/filtros) **no** aparece "Bermudas y shorts".

### Task 16: Merge y deploy

- [ ] **Step 1: Abrir PR (o merge directo a master según preferencia del cliente)**

```bash
git push -u origin feat/taxonomia-complementos-bebe
```

(Crear PR con `gh pr create` o, si el cliente prefiere, mergear a `master` para que Vercel despliegue.)

- [ ] **Step 2: Esperar el deploy de Vercel a producción**

Confirmar en el dashboard de Vercel que el deploy de `master` está `Ready`.

### Task 17: Ejecutar las operaciones de datos en prod (orden estricto)

> Requiere `SETUP_TOKEN` (env var de prod). Ejecutar **después** de que el deploy esté live. Orden: aplicar árbol → purgar productos. (El orden no es crítico porque purgar no borra categorías, pero aplicar el árbol primero deja la nav correcta de inmediato.)

- [ ] **Step 1: Aplicar el árbol de categorías en prod**

```bash
curl -X POST https://zonasport.es/api/admin/apply-taxonomy \
  -H "Authorization: Bearer $SETUP_TOKEN"
```
Expected: `{ "ok": true, "upserted": <n> }` (n = nº de nodos del árbol). En PowerShell: `Invoke-RestMethod -Method Post -Uri https://zonasport.es/api/admin/apply-taxonomy -Headers @{ Authorization = "Bearer $env:SETUP_TOKEN" }`.

- [ ] **Step 2: Purgar los productos demo en prod**

```bash
curl -X POST https://zonasport.es/api/admin/purge-products \
  -H "Authorization: Bearer $SETUP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirm":"BORRAR-TODOS-LOS-PRODUCTOS"}'
```
Expected: `{ "ok": true, "deleted": <n>, "remaining": 0 }`.

- [ ] **Step 3: Verificar en producción**

- `/complementos` o `/accesorios`: muestra los chips de subcategoría nuevos (Balones, Billeteros, Bolsos, Calcetines, Espinilleras, Gafas de natación, Gorras, Guantes, Mochilas, Patinaje, Riñonera, Pádel, Varios) y "0 productos" / estado vacío.
- `/bebe`, `/bebe/calzado`, `/bebe/textil`: cargan (vacíos).
- Catálogo sin productos demo.

- [ ] **Step 4: (Opcional) Re-seed mínimo si hace falta admin/settings**

Si la purga o cualquier paso dejó algo inconsistente, `POST /api/admin/setup` es idempotente y re-crea admin/marcas/categorías base (no duplica). Las categorías canónicas las gobierna `apply-taxonomy`.

---

## Self-Review

**Cobertura del spec (peticiones del cliente):**
1. ✅ Borrar productos demo → Task 13 (endpoint) + Task 17 (ejecución).
2. ✅ Sección Bebé en negrita + "Entrar a Bebé" → Task 8 (tab, en negrita por estilo de tab), Task 10 (landing/rutas), Task 11 (CTA home).
3. ✅ "accesorio" → "complementos" → Task 7 (copy), Task 9/12/14 (nombre de categoría).
4. ✅ Calzado mujer tenis/pádel sin productos → es problema de DATOS; se resuelve al importar productos mujer+pádel reales (filtro dinámico, ya configurado en megamenú). Documentado en Task 17 step 3 / Fase 5. *No requiere cambio de código adicional.*
5. ✅ "Calzado" → "Ver todo el calzado" → Task 1.
6. ⏭️ Sección admin para gestionar secciones/subcategorías → `/admin/categorias` YA existe (CRUD + anidar + reordenar). Hacerlo gobernar el megamenú = **Plan 2** (editor de menú DB-driven), fuera de alcance aquí.
7. ✅ Subcategorías de Complementos → Task 6 (clasificador) + Task 9 (árbol) + Task 12 (prod).
8. ✅ /hombre/ropa con abrigo + lista de prendas → Task 2 (grupo ROPA ampliado).
9. ✅ Mujer sin bermudas/shorts + separar camisetas/polos → Task 5 (bermuda), Task 3/4 (polo/polar), Task 2 (megamenú).

**Escaneo de placeholders:** Task 10 step 1 (clonar `GENDER_LANDINGS.nino`→`bebe`) describe la acción sobre un archivo no leído en detalle: marcar como paso de ejecución que requiere abrir el archivo. El resto lleva código completo.

**Consistencia de tipos:** `MegaMenuGender` (+BEBE), `SECCION_BY_GENDER` (+bebe), `MegaMenuTab.href` (+/bebe), `MEGA_MENU.bebe`, `MEGA_MENU_KEYS` (+bebe) y `GENDER_TABS` (key `bebe`) están alineados. Las subfamilias de `classify.ts` (`accesorios:<suffix>`) casan 1:1 con los slugs `accesorios-<suffix>` de `taxonomy-tree.ts` vía `"accesorios-" + fam.split(":")[1]`. `GARMENT_TYPES`/`GARMENT_TYPE_LABELS` cubren las mismas claves (el `Record<GarmentType,string>` lo fuerza).

**Riesgos / decisiones abiertas a confirmar antes de ejecutar:**
- URL de complementos: se **mantiene `/accesorios`** (slug). Si el cliente quiere `/complementos` en la barra, es un task extra (alias + RedirectRule 301 + actualizar guards `slug === "accesorios"`).
- Hijos de complementos: incluyo `padel` además de la lista del cliente (se usa en otras rutas). Si no lo quiere visible, quitar de `COMPLEMENTOS_HIJOS`.
- Bebé reutiliza la foto `ninos-hero.jpg` hasta tener una propia.
