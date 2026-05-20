# Bloque 4 — Tarjetas hub (TEXTIL/CALZADO) + ruta anidada `[seccion]/[familia]`

> Estado: **Fase 4.0 (diseño + exploración).** NO se ha tocado código de
> implementación. Este documento es el contrato de diseño; espera OK del
> usuario antes de la Fase 4.1.
>
> Reglas vigentes: cero prod · sin push · sin migrate dev · stock intacto ·
> FTS intacto · `categoryId` antigua intacta. **Bloque 4 es 100% frontend:
> cero migraciones de BD.**

---

## §1. Resumen ejecutivo

Introducir la **ruta anidada `/[seccion]/[familia]`** (p.ej. `/hombre/calzado`,
`/mujer/textil`) que resuelve la categoría por slug compuesto `${seccion}-${familia}`
— estas categorías ya existen en BD desde el Bloque 2. Rediseñar los **hubs de
género** (`/hombre`, `/mujer`, y nuevos `/nino`, `/nina`) para que su pieza
central sean **2 tarjetas grandes — TEXTIL y CALZADO — con borde cónico animado**
que enlazan a la ruta anidada. Limpiar el `nav` (Header `SPORT_NAV` + Footer +
megamenú) de los slugs muertos (`/running`, `/montana`, `/padel`, `/calzado`
sueltos) y alinearlo con la taxonomía género→familia. `/accesorios` se queda
como está (no encaja en el patrón textil/calzado). Respeto obligatorio de
`prefers-reduced-motion` y diseño mobile-first.

---

## §2. Estado actual (exploración 2026-05-21)

### 2.1 Páginas hub existentes
| Ruta | Archivo | Componente | Qué renderiza |
|---|---|---|---|
| `/hombre` | `app/(public)/hombre/page.tsx` | `GenderLanding slug="hombre"` | Hero foto + "Por tipo de prenda" (4 cards: Camisetas/Pantalones/Sudaderas/Calzado → `/${slug}?genero=HOMBRE`) + productos destacados + marcas |
| `/mujer` | `app/(public)/mujer/page.tsx` | `GenderLanding slug="mujer"` | idem |
| `/ninos` | `app/(public)/ninos/page.tsx` | `NinosLanding` | Hero foto + 3 bloques apilados (Niño/Niña/Accesorios), 4 tiles cada uno → `/${slug}?genero=NINO\|NINA` |
| `/nino` | — | — | **NO existe.** `next.config` redirige 307 → `/catalogo?genero=NINO` |
| `/nina` | — | — | **NO existe.** `next.config` redirige 307 → `/catalogo?genero=NINA` |
| `/[seccion]/[familia]` | — | — | **NO existe.** Hay que crearla |

### 2.2 Categorías género→familia en BD (verificado en dev, recuento vía pivote m2m)
| Sección (ROOT) | textil | calzado |
|---|---|---|
| `hombre` | `hombre-textil` (315) | `hombre-calzado` (125) |
| `mujer` | `mujer-textil` (188) | `mujer-calzado` (60) |
| `nino` | `nino-textil` (189) | `nino-calzado` (83) |
| `nina` | `nina-textil` (72) | `nina-calzado` (107) |

- ROOT `hombre`/`mujer`/`nino`/`nina`/`bebe` existen como categorías.
- `accesorios` es su propio árbol ROOT con 5 hijas (`accesorios-balones`,
  `-calcetines`, `-mochilas`, `-otros`, `-padel`). **No** hay `*-accesorios` por
  género → confirma que accesorios queda fuera del patrón textil/calzado.
- **No** existe categoría `ninos` (solo la landing combinada).
- El resolver `getCategoryBySlug("hombre-calzado")` ya devuelve la categoría real
  (verificado: smoke del paso f → 125 productos). La ruta anidada reutiliza este
  resolver con el slug compuesto.

### 2.3 Navegación actual (4 fuentes)
1. **`SPORT_NAV`** (`Header.tsx` L37): `/running`, `/padel`, `/montana`,
   `/calzado`, `/marcas`, `/blog`, `/contacto`. → Los 4 primeros son slugs
   muertos / sueltos.
2. **`GENDER_TABS`** (`Header.tsx` L66): tabs con megamenú para `/mujer`,
   `/hombre`, `/nino`, `/nina`. Ya apuntan a `/nino` y `/nina`.
3. **`MEGA_MENU`** (`lib/menu/mega-menu.ts`): fuente de verdad del desplegable.
   Cada item enlaza con `buildMegaMenuHref(slug, gender)` = **`/${slug}?genero=${gender}`**
   usando slugs PLANOS: ropa (`camisetas`, `chandal`, `mallas`…), calzado
   (`running`, `trail`, `tenis-padel`, `casual`, `futbol`…), accesorios
   (`gorras`, `mochilas`, `palas-padel`…).
4. **`Footer COLS` "Tienda"** (`Footer.tsx` L11): `/running`, `/padel`,
   `/montana`, `/calzado`, `/marcas`. → mismos slugs muertos.

### 2.4 `next.config.ts` redirects (framework, 307)
```
/nino → /catalogo?genero=NINO   (permanent: false)
/nina → /catalogo?genero=NINA   (permanent: false)
```
(Las `RedirectRule` de BD `/running`→`/hombre/calzado?tipo=running` y
`/montana`→…`?tipo=trail` se actualizaron en Bloque 3 paso h.)

### 2.5 Paleta (tokens `@theme` en `app/globals.css`)
- Azul: `--color-zs-blue-700 #1e3a8a`, `-900 #14225b`, `-950 #0b1640`.
- Rojo: `--color-zs-red-600 #dc2626`.
- Acento pelota de tenis: `--color-zs-tennis-500 #c8da46` (verde-amarillo), `-600 #a8bb34`.
- **No existe token amarillo puro tipo `#FACC15`.** → ver §6 decisión (b).

### 2.6 Animación de borde
- **No hay** ningún `conic-gradient` ni `@property` en el repo → se crea de cero.
- Convención existente: `@keyframes` definidos en `app/globals.css` (shimmer,
  fadeInUp, zsBump…) o en `<style jsx-less>` inline dentro de componentes.
- `prefers-reduced-motion: reduce` ya se respeta en `globals.css` (L255) — hay
  que extenderlo a la nueva animación.

---

## §3. Decisiones de diseño

### a) Ruta anidada `/[seccion]/[familia]`
Crear `app/(public)/[seccion]/[familia]/page.tsx` (Server Component). Resuelve
`getCategoryBySlug(\`${seccion}-${familia}\`)`:
- Si existe → render del listado idéntico a `[categoria]/page.tsx` (mismo
  `buildProductWhere` con pivote m2m, mismas facetas, mismo `ProductFilters`).
  El filtro "Tipo de calzado" se enciende solo cuando `familia === "calzado"`
  (slug acaba en `-calzado`, ya soportado en Bloque 3).
- Si no existe → `notFound()`.
- `seccion` válidas: `hombre|mujer|nino|nina`. `familia` válidas: `textil|calzado`.
  Combos inválidos (p.ej. `/hombre/foo`) → 404.
- **Implicación:** la URL bonita `/hombre/calzado` empieza a existir de verdad,
  y los `RedirectRule` de paso h (`/running`→`/hombre/calzado?tipo=running`)
  pasan a apuntar a una página real (hoy ya resuelven porque next reescribe el
  single-segment, pero conviene confirmarlo en smoke).

### b) Hubs de género (`/hombre`, `/mujer`, `/nino`, `/nina`)
Componente nuevo **`GenderHub`** con **2 tarjetas grandes lado a lado**:
- **TEXTIL** (azul `zs-blue-700`) → `/[seccion]/textil`.
- **CALZADO** (amarillo — ver §6 decisión b) → `/[seccion]/calzado`.
- Toda la tarjeta es un `<Link>` clicable (no solo un botón interior).
- Borde cónico animado (ver §3c).
- Recuento de productos opcional bajo el título (lo trae el server: count del
  pivote m2m de la categoría hija).

**Alcance sobre `GenderLanding` (decisión §6.f):** propuesta = **conservar**
`GenderHero` (foto top), productos destacados y marquee de marcas, y
**sustituir** únicamente el bloque "Por tipo de prenda" (4 cards a slugs viejos)
por el nuevo bloque `GenderHub` de 2 tarjetas TEXTIL/CALZADO. Así el rediseño es
quirúrgico y no tira contenido SEO/comercial ya pulido.

### c) CSS del borde cónico animado
```css
@property --zs-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}
@keyframes zs-spin-border { to { --zs-angle: 360deg; } }

.zs-animated-border {
  position: relative;
  background: conic-gradient(from var(--zs-angle), <c1>, <c2>, <c1>);
  animation: zs-spin-border 4s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .zs-animated-border { animation: none; }
}
```
- El borde es un **wrapper externo** con `padding: 2-3px`; la tarjeta interior
  lleva el color/foto sólido encima (técnica "gradient border via padding").
- `@property` permite animar el `--zs-angle` (sin él, el conic no transiciona).
- Fallback navegadores sin `@property` (Firefox <128 ya lo soporta; Safari 16.4+):
  degradado estático visible, sin rotación — aceptable.
- Definir en `app/globals.css` (sigue la convención de keyframes del repo).

### d) Imágenes
- Las tarjetas TEXTIL/CALZADO pueden ir con **gradient sólido** (sin foto, como
  el bloque actual "Por tipo de prenda") o con **foto de fondo** (ver §6 decisión a).
- Si se usan fotos placeholder: fuente **CC0** (Unsplash). Dejar `TODO` claro en
  el código y aquí: **el cliente debe sustituirlas por fotos propias / libres de
  derechos antes de producción.**

### e) Accesorios (sin rediseño)
`/accesorios` NO recibe tratamiento hub. Sigue siendo listado normal con sus 5
subcategorías. Justificación: no encaja en "textil vs calzado"; flujo distinto.

### f) Limpieza del nav
- **Header `SPORT_NAV`**: quitar `/running`, `/padel`, `/montana`, `/calzado`.
  Reemplazar por `/hombre`, `/mujer`, `/nino`, `/nina`, `/accesorios` (o dejar
  que los 4 géneros vivan en `GENDER_TABS` y `SPORT_NAV` quede solo con
  `Accesorios`, `Marcas`, `Blog`, `Contacto`). → ver §6 + propuesta visual al usuario.
- **Footer `COLS` "Tienda"**: misma sustitución.
- **`MEGA_MENU`** (`lib/menu/mega-menu.ts`): ver §6 decisión (c) — es el punto
  más delicado (conflicto de filosofía).

---

## §4. Conflictos detectados (requieren decisión — ver §6)

### ⚠️ Conflicto 1 — Megamenú "Calzado" por slug plano vs `footwearType`
El megamenú lista el calzado como slugs separados (`running`, `trail`,
`tenis-padel`, `casual`, `baloncesto`, `futbol`, `futbol-sala`, `chanclas`) que
enlazan a `/${slug}?genero=HOMBRE`. Pero el Bloque 3 convirtió esos mismos
conceptos en valores de **`footwearType`** dentro de UNA categoría `*-calzado`,
navegables como `/hombre/calzado?tipo=running`.

Mapeo casi 1:1 (slug megamenú → `footwearType`):
`running→running`, `trail→trail`, `casual→casual`, `baloncesto→baloncesto`,
`futbol→futbol`, `futbol-sala→futbol_sala`, `chanclas→chanclas`,
`tenis-padel→` (¡se divide en `tenis` + `padel`!).

Problema añadido: `/calzado?genero=HOMBRE` (slug ROOT `calzado`, 328 productos
legacy) **NO** enciende el filtro "Tipo de calzado" (solo lo hacen los slugs
`*-calzado`). Así que hoy el megamenú lleva a una página sin el filtro nuevo.

**Opciones (decisión §6.c):**
- **C1** — Reescribir los items "Calzado" del megamenú a
  `/[seccion]/calzado?tipo=${footwearType}`. Coherente con Bloque 3. `tenis-padel`
  se desdobla en dos items (Tenis, Pádel). Es lo más limpio.
- **C2** — Dejar el megamenú como está (slugs planos con alias) y solo arreglar
  los hubs. Inconsistente (hub dice `/hombre/calzado`, megamenú dice `/running?…`).
- **C3** — Híbrido: "Calzado" del megamenú apunta a `/[seccion]/calzado` (sin
  tipo) y deja que el usuario filtre allí; los subtipos desaparecen del desplegable.

### ⚠️ Conflicto 2 — Megamenú "Ropa" por prenda vs `textil`
La "Ropa" del megamenú lista prendas (`camisetas`, `chandal`, `mallas`,
`sudaderas`, `pantalones`…) como slugs → `/${slug}?genero=`. El modelo
género→familia solo tiene `*-textil` (una sola familia, sin sub-tipo de prenda).
Si reescribimos todo a `/[seccion]/textil`, **todas las prendas colapsan a un
único enlace** y se pierde la navegación por prenda.

**Opciones (decisión §6.c) → ELEGIDA: R2-colapsado (ver §9.6).**
- **R1** — Mantener "Ropa" del megamenú con los slugs de prenda actuales
  (`/camisetas?genero=…`) — siguen resolviendo vía categorías/alias existentes —
  y solo migrar "Calzado". Pragmático: no perdemos granularidad de prenda.
- **R2** ✅ — Colapsar "Ropa" a un solo "Ropa" → `/[seccion]/textil`. Los slugs
  viejos redirigen igual a `/[seccion]/textil` por `RedirectRule` del Bloque 2.
  Granularidad por prenda diferida a `garmentType` (§10, Bloque 6 futuro).
- **R3** — Introducir un campo `garmentType` análogo a `footwearType` (fuera de
  alcance de Bloque 4; sería un bloque nuevo → §10).

### ⚠️ Conflicto 3 — `/nino` `/nina` `/ninos`
El usuario pide hubs `/nino` y `/nina`. Hoy redirigen a `/catalogo` (next.config)
y existe `/ninos` combinado. El megamenú ya tiene tabs `/nino` y `/nina`.

**Opciones (decisión §6.d):**
- **N1** — Crear `/nino` y `/nina` como hubs `GenderHub` reales, **quitar** sus
  redirects de `next.config`, y redirigir `/ninos` → `/nino` (o mantener `/ninos`
  como índice que enlaza a ambos). Coherente con "4 hubs".
- **N2** — Mantener solo `/ninos` combinado (con 2 sub-hubs Niño/Niña dentro) y
  dejar que `/nino` `/nina` sigan redirigiendo. Menos rutas, pero contradice el
  enunciado de "4 hubs".

---

## §5. Archivos a tocar (estimación)

**NUEVOS:**
- `app/(public)/[seccion]/[familia]/page.tsx` — ruta anidada (resolver +
  listado + facetas, reutiliza la lógica de `[categoria]/page.tsx`).
- `components/public/GenderHub.tsx` — 2 tarjetas TEXTIL/CALZADO con borde animado.
  (Server Component salvo que el borde necesite estado; con CSS puro puede ser server.)
- (Posible) `app/(public)/nino/page.tsx`, `app/(public)/nina/page.tsx` — si N1.

**MODIFICADOS:**
- `app/globals.css` — `@property --zs-angle` + `@keyframes zs-spin-border` +
  `.zs-animated-border` + regla `prefers-reduced-motion`.
- `components/public/GenderLanding.tsx` — sustituir bloque "Por tipo de prenda"
  por `GenderHub` (manteniendo hero/productos/marcas). Soportar `nino`/`nina`.
- `components/public/Header.tsx` — limpiar `SPORT_NAV`.
- `components/public/Footer.tsx` — limpiar `COLS` "Tienda".
- `lib/menu/mega-menu.ts` — según decisión Conflicto 1/2 (§6.c).
- `next.config.ts` — quitar redirects `/nino` `/nina` si N1; (posible) añadir
  `/ninos` → `/nino`.
- `lib/public-queries.ts` `RESERVED_SLUGS` — añadir `nino`, `nina` si se crean
  como páginas (para que `[categoria]` no los capture).

**NO se toca:** `/accesorios` y subcategorías · filtrado (Bloque 3) · editor
admin · esquema Prisma · ninguna migración.

---

## §6. Decisiones pendientes (necesito tu OK antes de Fase 4.1)

> **RESUELTO 2026-05-21 → ver §9 (DECISIONES CERRADAS).** Se conserva el detalle
> de opciones abajo como registro de la deliberación.

**a) Tratamiento visual de las 2 tarjetas hub.**
   - Opción A: gradient sólido de marca + tipografía editorial (como el bloque
     actual "Por tipo de prenda", sin riesgo de imágenes). ← recomendada de inicio.
   - Opción B: foto de fondo CC0 (placeholder) + overlay. Más vistoso, requiere
     fotos que el cliente luego sustituye.

**b) Color exacto de la tarjeta CALZADO.**
   - Opción 1: `zs-tennis-500 #c8da46` (token de marca, verde-amarillo pelota). ← recomendada (es del logo).
   - Opción 2: Tailwind `yellow-400 #FACC15` (amarillo limpio).
   - Opción 3: `yellow-500 #EAB308` (mostaza).
   *(TEXTIL fijo en `zs-blue-700`, salvo que prefieras otro.)*

**c) Resolución de los Conflictos 1 y 2 (megamenú).**
   - Mi recomendación: **C1 + R1** — migrar "Calzado" del megamenú a
     `/[seccion]/calzado?tipo=…` (coherente con Bloque 3, desdoblando tenis/pádel),
     y **mantener "Ropa"** con los slugs de prenda actuales (no perdemos
     granularidad mientras no exista `garmentType`). ¿Lo apruebas o prefieres otra combinación?

**d) Conflicto 3 — `/nino` `/nina` `/ninos`.**
   - Mi recomendación: **N1** — crear `/nino` y `/nina` como hubs reales, quitar
     sus redirects, y redirigir `/ninos` → `/nino`. ¿OK o prefieres N2 (solo `/ninos`)?

**e) Alcance sobre `GenderLanding` (§3.b decisión f).**
   - ¿Confirmas la sustitución quirúrgica (mantener hero+productos+marcas, cambiar
     solo el bloque de 4 cards por el GenderHub de 2)? ¿O quieres un hub más
     minimalista (solo las 2 tarjetas + hero, sin productos/marcas)?

**f) Comportamiento del Header en mobile.**
   - ¿Mantener el drawer + acordeón de megamenú actual (que ya funciona) o
     simplificarlo? (Por defecto: mantener; solo limpiar links muertos.)

---

## §7. Plan de implementación por pasos (CONFIRMADO — OK usuario 2026-05-21)

- **(a)** Crear `app/(public)/[seccion]/[familia]/page.tsx`. Resolver
  `${seccion}-${familia}`. **Smoke obligatorio (4 combos, productos reales):**
  `/hombre/calzado`=125 · `/mujer/calzado`=60 · `/nino/textil`=189 ·
  `/nina/textil`=72 pivote (71 primary). Combo inválido → 404. Filtro "Tipo de
  calzado" visible solo en `*/calzado`. **PARA tras (a)** con el smoke verificado.
- **(b)** Crear `GenderHub` + CSS borde animado (`@property --zs-angle` +
  `@keyframes`). Generar `previews/calzado-color-comparison.html` (o screenshots)
  comparando los 3 amarillos (#c8da46 · #FACC15 · #EAB308) en la tarjeta CALZADO.
  Verificar `prefers-reduced-motion`. **PARA tras enseñar el preview** (cierra
  decisión de color).
- **(c)** Integrar `GenderHub` en `GenderLanding` (sustitución quirúrgica del
  bloque "Por tipo de prenda") para `/hombre`, `/mujer`; crear `/nino`, `/nina`
  reales con `GenderHub`. Prueba visual mobile + desktop.
- **(d)** Quitar redirects `/nino`→`/catalogo` y `/nina`→`/catalogo` de
  `next.config.ts`. Añadir `/ninos`→`/nino` **301**. Actualizar `RESERVED_SLUGS`
  (`nino`, `nina`).
- **(e)** Limpiar `Header` `SPORT_NAV` (quitar `/running` `/montana` `/padel`
  `/calzado` sueltos) + migrar megamenú (**C1** calzado + **R1-colapsado** ropa).
- **(f)** Limpiar `Footer` (mismo criterio que Header).
- **(g)** Smoke end-to-end: Header → hub → familia → producto; y `/ninos`→`/nino`.
  typecheck + build.

Cada paso = commit atómico. PARO entre pasos según la cadencia del usuario.

---

## §9. DECISIONES CERRADAS (OK del usuario 2026-05-21)

1. **Visual tarjetas** = **A (gradient sólido de marca)**, sin foto. ✅
2. **Color CALZADO** = pre-cerrado a `zs-tennis-500 #c8da46`, pero **decisión
   final colgada** hasta el preview comparativo del paso (b) con `#c8da46` ·
   `#FACC15` (yellow-400) · `#EAB308` (yellow-500). TEXTIL = `zs-blue-700`. ⏳
3. **Header mobile** = mantener drawer/acordeón actual; solo limpiar links. ✅
4. **`GenderLanding`** = sustitución quirúrgica: mantener hero + productos
   destacados + marcas; cambiar solo el bloque "Por tipo de prenda" (4 cards)
   por `GenderHub` (2 tarjetas). ✅
5. **C1 — megamenú Calzado** = migrar a `/[seccion]/calzado?tipo=…`:
   - Primer ítem de la lista = **"Calzado"** general SIN filtro tipo
     (`/[seccion]/calzado`).
   - Resto, mapeo 1:1 (`running`, `trail`, `tenis`, `padel`, `futbol`,
     `futbol-sala`, `casual`, `baloncesto`, `chanclas` → `?tipo=…`).
   - `tenis-padel` (combinado) se **desdobla** en 2 items: Tenis + Pádel. ✅
6. **R1-colapsado — megamenú Ropa** = colapsar la sección "Ropa" a **UN solo
   enlace** `/[seccion]/textil` con label "Ropa". Justificación: los slugs viejos
   de prenda redirigen igualmente a `/[seccion]/textil` por `RedirectRule` del
   Bloque 2. (Se pierde temporalmente la granularidad por prenda → ver §10.) ✅
7. **C3 — `/nino` `/nina` reales** = crear hubs reales con `GenderHub`; quitar
   redirects de `next.config`; `/ninos`→`/nino` **301**; añadir `nino`/`nina` a
   `RESERVED_SLUGS`. ✅

---

## §10. TODOs post-Bloque-4

- **[Bloque 6 futuro] `Product.garmentType` + filtro multi en `/[seccion]/textil`**
  — análogo a `footwearType` del Bloque 3. Devolvería la granularidad por prenda
  (camisetas, pantalones, sudaderas, chándal, mallas…) que en Bloque 4 colapsamos
  a un único enlace "Ropa" (decisión §9.6). Implica: campo aditivo en schema +
  clasificador por nombre + facet + filtro UI + migración de datos, todo bajo la
  misma política expand/contract y `migrate deploy`.
- **`/ninos` → `/nino` (301):** el plural combinado se retira del modelo
  género→familia separado; queda solo como redirect permanente.

---

## §8. Restricciones (recordatorio)
- NO tocar `/accesorios` ni subcategorías.
- NO tocar el filtrado (Bloque 3 cerrado).
- NO tocar el editor admin.
- Cero migraciones de BD (Bloque 4 = 100% frontend).
- `prefers-reduced-motion: reduce` respetado **obligatoriamente**.
- Mobile-first: bonito en móvil, no solo desktop.
- Imágenes: solo CC0 + `TODO` para sustitución por el cliente.
