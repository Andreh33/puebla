# Reorganización de descripciones en la ficha (corta arriba, técnica abajo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar la descripción corta del CSV de WooCommerce debajo del precio y la larga/técnica abajo del todo, y rellenar ambos campos verbatim para todos los productos en producción.

**Architecture:** Reutilizamos los campos existentes `description` (pasa a ser la corta, se pinta debajo del precio) y `technicalDescription` (pasa a ser la larga, se pinta abajo). Se intercambia qué campo se renderiza en cada zona de la ficha, se ajustan etiquetas del editor, se extiende el endpoint de backfill para aceptar `technicalDescription`, y un feeder local lee el CSV y aplica los textos vía ese endpoint. Sin migración de esquema, sin generación, sin scraping.

**Tech Stack:** Next 16 App Router (React Server Components), Prisma 6, TypeScript, react-markdown + remark-gfm, endpoint admin protegido con Bearer SETUP_TOKEN, script local con tsx + papaparse.

## Global Constraints

- **Verbatim:** los textos se copian tal cual del CSV `wp/wc-product-export-16-6-2026-1781596350587.csv`. Nada de generación ni mínimo de palabras.
- **Mapeo fijo:** `description` ← columna "Descripción corta"; `technicalDescription` ← columna "Descripción" (larga).
- **Respeto a ediciones manuales:** el backfill solo toca productos con `isCustomized:false`.
- **Aplicación:** directo a producción (`https://zonasport.vercel.app`), por lotes, idempotente.
- **Orden crítico:** el endpoint extendido debe estar **desplegado** antes de correr el feeder.
- **No tocar:** la tabla "Ficha técnica" (`<dl>`) ni el `InfoAccordion`.
- **Estilo:** seguir el patrón existente HTML-sanitizado vs ReactMarkdown que ya hay en la ficha (las descripciones de Woo vienen como HTML).

---

### Task 1: Extender el endpoint `set_descriptions` para escribir `technicalDescription`

**Files:**
- Modify: `app/api/admin/import-woo/route.ts:335-381` (acción `set_descriptions`)

**Interfaces:**
- Produces: la acción `set_descriptions` acepta ahora items `{ wooId, description?, technicalDescription?, metaDescription? }` y escribe los tres campos presentes y no vacíos en productos `isCustomized:false`, casando por `externalId = woocommerce:<wooId>`. Respuesta sin cambios: `{ ok, updated, notFoundOrCustom, skipped, errorCount, errors }`.

- [ ] **Step 1: Añadir `technicalDescription` al tipo y al objeto `data`**

En `app/api/admin/import-woo/route.ts`, dentro del bloque `if (body.action === "set_descriptions")`, cambiar el tipo `DescItem` y el objeto `data`:

```ts
    type DescItem = {
      wooId?: string | number;
      description?: string;
      technicalDescription?: string;
      metaDescription?: string;
    };
```

y, donde hoy se construye `data`:

```ts
      const data: {
        description?: string;
        technicalDescription?: string;
        metaDescription?: string;
      } = {};
      if (typeof item.description === "string" && item.description.trim()) {
        data.description = item.description;
      }
      if (typeof item.technicalDescription === "string" && item.technicalDescription.trim()) {
        data.technicalDescription = item.technicalDescription;
      }
      if (typeof item.metaDescription === "string" && item.metaDescription.trim()) {
        data.metaDescription = item.metaDescription;
      }
```

Actualizar también el comentario de cabecera del bloque (líneas ~329-334) para reflejar que ahora `description` ← corta y `technicalDescription` ← larga.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (sin errores nuevos en `import-woo/route.ts`).

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/import-woo/route.ts
git commit -m "feat(import): set_descriptions acepta technicalDescription (corta/larga separadas)"
```

---

### Task 2: Feeder local que aplica corta→description y larga→technicalDescription

**Files:**
- Create: `scripts/feed-split-descriptions.ts`

**Interfaces:**
- Consumes: `parseWooCommerceFile` de `lib/importer/woocommerce` (devuelve `{ groups }`, cada `g.parent` con `wooId`, `description` (larga) y `shortDescription` (corta)). El endpoint `set_descriptions` de Task 1.
- Produces: script CLI `npx tsx scripts/feed-split-descriptions.ts [--csv <ruta>] [--dry-run] [--chunk N] [--limit N]`. En `--dry-run` no envía nada y solo imprime conteos + muestra. Con `SETUP_TOKEN` aplica a `IMPORT_BASE` (default `https://zonasport.vercel.app`).

- [ ] **Step 1: Crear el script**

Crear `scripts/feed-split-descriptions.ts` (basado en `scripts/feed-descriptions.ts`, cambiando el mapeo):

```ts
/**
 * scripts/feed-split-descriptions.ts
 *
 * Aplica las descripciones REALES de la web antigua (CSV WooCommerce) a los
 * productos de producción, casando por wooId (externalId = woocommerce:<id>):
 *   - description          (ficha, debajo del precio) ← "Descripción corta"  (verbatim)
 *   - technicalDescription (ficha, abajo del todo)    ← "Descripción" larga   (verbatim)
 *   - metaDescription (SEO) ← "Descripción corta" recortada a ~160
 *
 * Sin generación: los productos sin corta se quedan sin texto debajo del precio.
 * El servidor solo toca productos con isCustomized:false. Idempotente.
 *
 * Uso:
 *   npx tsx scripts/feed-split-descriptions.ts --dry-run
 *   SETUP_TOKEN=<token> npx tsx scripts/feed-split-descriptions.ts
 */
import path from "node:path";
import { parseWooCommerceFile } from "../lib/importer/woocommerce";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const get = (flag: string): string | null => {
    const idx = args.indexOf(flag);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1]! : null;
  };
  const csvRel = get("--csv") ?? "wp/wc-product-export-16-6-2026-1781596350587.csv";
  const csv = path.isAbsolute(csvRel) ? csvRel : path.join(process.cwd(), csvRel);
  const chunkStr = get("--chunk");
  const chunk = chunkStr != null ? parseInt(chunkStr, 10) : 100;
  const limitStr = get("--limit");
  const limit = limitStr != null ? parseInt(limitStr, 10) : null;
  return { csv, chunk, limit, dryRun: args.includes("--dry-run") };
}

function toPlain(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toMeta(src: string | null): string | null {
  if (!src) return null;
  const plain = toPlain(src);
  if (!plain) return null;
  if (plain.length <= 160) return plain;
  return plain.slice(0, 157).replace(/\s+\S*$/, "").trim() + "…";
}

type DescItem = {
  wooId: string;
  description?: string;
  technicalDescription?: string;
  metaDescription?: string;
};

interface BatchResult {
  ok?: boolean;
  updated?: number;
  notFoundOrCustom?: number;
  skipped?: number;
  errorCount?: number;
}

async function main() {
  const { csv, chunk, limit, dryRun } = parseArgs(process.argv);
  const BASE = process.env.IMPORT_BASE ?? "https://zonasport.vercel.app";
  const TOKEN = process.env.SETUP_TOKEN;

  console.log(`\n=== Zona Sport — Feeder corta/larga ===`);
  console.log(`CSV  : ${csv}`);
  console.log(`Modo : ${dryRun ? "DRY-RUN (no envía nada)" : `ENVIAR a ${BASE}`}\n`);

  if (!dryRun && !TOKEN) {
    console.error("ERROR: falta SETUP_TOKEN. Usa --dry-run para previsualizar.");
    process.exit(1);
  }

  console.log("Parseando CSV...");
  const { groups, errors: parseErrors, totalRows } = await parseWooCommerceFile(csv);
  console.log(`  Filas CSV          : ${totalRows}`);
  console.log(`  Grupos (productos) : ${groups.length}`);
  console.log(`  Errores de parseo  : ${parseErrors.length}`);

  let items: DescItem[] = [];
  let withShort = 0;
  let withLong = 0;
  for (const g of groups) {
    const p = g.parent;
    if (!p.wooId) continue;
    const short = p.shortDescription?.trim() || null; // corta → debajo del precio
    const long = p.description?.trim() || null; // larga → abajo del todo
    if (short) withShort += 1;
    if (long) withLong += 1;
    const item: DescItem = { wooId: p.wooId };
    if (short) item.description = short;
    if (long) item.technicalDescription = long;
    const meta = toMeta(short ?? long);
    if (meta) item.metaDescription = meta;
    if (item.description || item.technicalDescription || item.metaDescription) {
      items.push(item);
    }
  }
  if (limit != null) items = items.slice(0, limit);

  console.log(`  Con corta (description)        : ${withShort}`);
  console.log(`  Con larga (technicalDescription): ${withLong}`);
  console.log(`  Items a enviar                  : ${items.length}\n`);

  const sampleN = Math.min(3, items.length);
  console.log(`--- Muestra (${sampleN}) ---`);
  for (let i = 0; i < sampleN; i++) {
    const it = items[i]!;
    const corta = (it.description ?? "(sin)").slice(0, 90).replace(/\s+/g, " ");
    const larga = (it.technicalDescription ?? "(sin)").slice(0, 90).replace(/\s+/g, " ");
    console.log(`[${i + 1}] wooId=${it.wooId}`);
    console.log(`    arriba (corta): ${corta}…`);
    console.log(`    abajo (larga) : ${larga}…`);
  }
  console.log();

  if (dryRun) {
    console.log("DRY-RUN: no se ha enviado nada. Quita --dry-run y define SETUP_TOKEN para aplicar.");
    return;
  }

  const totalChunks = Math.ceil(items.length / chunk);
  let updated = 0, notFound = 0, skipped = 0, errs = 0;
  console.log(`--- Enviando ${items.length} items en ${totalChunks} lotes de ${chunk} ---\n`);

  for (let i = 0; i < items.length; i += chunk) {
    const batchIndex = Math.floor(i / chunk) + 1;
    const batch = items.slice(i, i + chunk);
    const send = async (): Promise<BatchResult> => {
      const r = await fetch(`${BASE}/api/admin/import-woo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ action: "set_descriptions", items: batch }),
      });
      const text = await r.text();
      try {
        return JSON.parse(text) as BatchResult;
      } catch {
        throw new Error(`Respuesta no-JSON (${r.status}): ${text.slice(0, 200)}`);
      }
    };

    let res: BatchResult | null = null;
    try {
      res = await send();
    } catch (e1) {
      console.warn(`  Lote ${batchIndex}/${totalChunks} intento 1 falló: ${e1 instanceof Error ? e1.message : e1}`);
      try {
        res = await send();
      } catch (e2) {
        console.error(`  Lote ${batchIndex}/${totalChunks} FALLIDO: ${e2 instanceof Error ? e2.message : e2}`);
        errs += batch.length;
        continue;
      }
    }

    if (!res?.ok) {
      console.error(`  Lote ${batchIndex}/${totalChunks} ok=false`);
      errs += batch.length;
      continue;
    }
    updated += res.updated ?? 0;
    notFound += res.notFoundOrCustom ?? 0;
    skipped += res.skipped ?? 0;
    errs += res.errorCount ?? 0;
    console.log(`  Lote ${batchIndex}/${totalChunks} · ~${res.updated} actualizados · ${res.notFoundOrCustom} sin casar/custom · ${res.errorCount} errores`);
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`  ACTUALIZADOS     : ${updated}`);
  console.log(`  SIN CASAR/CUSTOM : ${notFound}`);
  console.log(`  OMITIDOS         : ${skipped}`);
  console.log(`  ERRORES          : ${errs}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Dry-run (verificación sin enviar nada)**

Run: `npx tsx scripts/feed-split-descriptions.ts --dry-run`
Expected: imprime `Con corta (description): ~1472`, `Con larga (technicalDescription): ~1395`, y una muestra donde "arriba (corta)" es el resumen corto y "abajo (larga)" el texto técnico. NO envía nada.

- [ ] **Step 3: Commit**

```bash
git add scripts/feed-split-descriptions.ts
git commit -m "feat(scripts): feeder corta->description, larga->technicalDescription"
```

---

### Task 3: Intercambiar el render en la ficha pública

**Files:**
- Modify: `app/(public)/producto/[slug]/page.tsx:120-140` (slot debajo del precio)
- Modify: `app/(public)/producto/[slug]/page.tsx:308-309` (paso del slot a ProductActions)
- Modify: `app/(public)/producto/[slug]/page.tsx:360-388` (sección de abajo)

**Interfaces:**
- Consumes: `product.description` y `product.technicalDescription` del `findUnique` existente (ambos ya incluidos vía `include`/campos del modelo).

- [ ] **Step 1: Slot debajo del precio renderiza `description`**

Reemplazar el bloque `const technicalDescriptionSlot = ...` (líneas ~120-140) por:

```tsx
  // Descripción comercial (corta): se muestra dentro del bloque de compra,
  // ENTRE el selector de talla y el botón de añadir al carrito. Se renderiza
  // aquí (servidor) y se pasa como slot a ProductActions.
  const descriptionSlot = product.description ? (
    <div className="rounded-xl border border-zs-border bg-zs-surface/60 p-4">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zs-muted">
        Descripción
      </p>
      <div className="prose prose-sm prose-zs max-w-none">
        {/<[a-z][\s\S]*?>/i.test(product.description) ? (
          <div
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
          />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {product.description}
          </ReactMarkdown>
        )}
      </div>
    </div>
  ) : null;
```

- [ ] **Step 2: Pasar el nuevo slot a ProductActions**

En la línea ~309, cambiar:

```tsx
              descriptionSlot={technicalDescriptionSlot}
```

por:

```tsx
              descriptionSlot={descriptionSlot}
```

- [ ] **Step 3: Sección de abajo renderiza `technicalDescription` con título "Descripción técnica"**

Reemplazar el bloque que hoy renderiza `product.description` (líneas ~362-388) por:

```tsx
            {product.technicalDescription ? (
              /<[a-z][\s\S]*?>/i.test(product.technicalDescription) ? (
                // Descripciones importadas desde WooCommerce vienen como HTML.
                <article className="prose prose-zs max-w-none">
                  <h2 className="text-2xl font-bold text-zs-blue-900">Descripción técnica</h2>
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.technicalDescription) }} />
                </article>
              ) : (
                <article className="prose prose-zs max-w-none">
                  <h2 className="text-2xl font-bold text-zs-blue-900">Descripción técnica</h2>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {product.technicalDescription}
                  </ReactMarkdown>
                </article>
              )
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-zs-blue-900">Descripción técnica</h2>
                <p className="mt-2 text-sm text-zs-muted">
                  Sin descripción técnica detallada. Si necesitas información extra,
                  consúltanos por WhatsApp y te ayudamos.
                </p>
              </div>
            )}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (sin referencias colgantes a `technicalDescriptionSlot`).

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/producto/[slug]/page.tsx"
git commit -m "feat(ficha): corta debajo del precio, descripcion tecnica (larga) abajo"
```

---

### Task 4: Ajustar etiquetas del editor /admin

**Files:**
- Modify: `app/admin/productos/[id]/ProductEditor.tsx:673-698` (campos description y technicalDescription)

**Interfaces:**
- Consumes: nada nuevo; solo texto de UI. Los `register("description")` y `register("technicalDescription")` no cambian.

- [ ] **Step 1: Añadir ayuda al campo `description` y reescribir la del técnico**

Tras el `<Textarea id="description" .../>` (línea ~678), añadir una línea de ayuda:

```tsx
                <p className="mt-1 text-xs text-zs-muted">
                  Se muestra en la ficha pública debajo del precio.
                </p>
```

Y en el bloque de `technicalDescription`, reemplazar el `<p>` de ayuda actual (líneas ~695-697) por:

```tsx
                <p className="mt-1 text-xs text-zs-muted">
                  Se muestra abajo del todo en la ficha, bajo el título «Descripción técnica».
                </p>
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/productos/[id]/ProductEditor.tsx"
git commit -m "chore(admin): etiquetas de descripcion/tecnica reflejan su posicion en la ficha"
```

---

### Task 5: Build, push y despliegue a producción

**Files:** ninguno (build + git).

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: build OK (Next compila sin errores de tipos ni de lint que rompan).

- [ ] **Step 2: Push a master (auto-deploy en Vercel)**

```bash
git push origin master
```

Expected: GitHub↔Vercel arranca el deploy de producción.

- [ ] **Step 3: Esperar a que el deploy esté LIVE**

Verificar en Vercel (o esperar ~2-3 min) a que `https://zonasport.vercel.app` sirva el nuevo build. El endpoint extendido de Task 1 debe estar desplegado **antes** de Task 6.

---

### Task 6: Backfill en producción y verificación

**Files:** ninguno (ejecución del feeder + comprobación manual).

**Interfaces:**
- Consumes: feeder de Task 2, endpoint de Task 1 ya desplegado (Task 5).

- [ ] **Step 1: Obtener el SETUP_TOKEN**

Usar el token de producción (Vercel env `SETUP_TOKEN`, o el `.setup-token.tmp` si está vigente). Si no, traerlo con `vercel env` o desde el panel.

- [ ] **Step 2: Dry-run final contra el CSV**

Run: `npx tsx scripts/feed-split-descriptions.ts --dry-run`
Expected: conteos esperados (~1472 corta, ~1395 larga) y muestra correcta.

- [ ] **Step 3: Aplicar a producción**

Run (PowerShell): `$env:SETUP_TOKEN="<token>"; npx tsx scripts/feed-split-descriptions.ts`
Expected: lotes con `ACTUALIZADOS` ~ varios miles de variantes-color (updateMany por externalId puede actualizar varias filas por wooId), `SIN CASAR/CUSTOM` bajo, `ERRORES` = 0.

- [ ] **Step 4: Verificación en producción**

Abrir 3 fichas reales y comprobar:
- Una con corta+larga: arriba (debajo del precio) sale el resumen corto; abajo, "Descripción técnica" con el texto largo.
- Una solo-corta (de las 80): arriba sale la corta; abajo el mensaje de "sin descripción técnica".
- Una solo-larga (de las 3): arriba sin bloque de descripción; abajo la técnica.

- [ ] **Step 5: Commit de cierre (si aplica notas/memoria)**

Actualizar la memoria del proyecto con el resultado del backfill (nº actualizados) y, si se manejó el SETUP_TOKEN en claro, recordar rotarlo.

---

## Self-Review

**Spec coverage:**
- Semántica de campos (description=corta arriba, technicalDescription=larga abajo) → Task 3 (render) + Task 2/Task 1 (datos). ✓
- Ficha pública (slot arriba, sección abajo con título "Descripción técnica") → Task 3. ✓
- Editor /admin (etiquetas) → Task 4. ✓
- Backfill verbatim desde CSV, sin generación, solo isCustomized:false → Task 1 + Task 2 + Task 6. ✓
- Directo a producción → Task 5 + Task 6. ✓
- Orden crítico (deploy antes del feeder) → Task 5 antes de Task 6. ✓
- No tocar Ficha técnica `<dl>` ni InfoAccordion → no se modifican esas líneas. ✓

**Placeholder scan:** sin TBD/TODO; todo el código está completo. ✓

**Type consistency:** `set_descriptions` acepta `{ wooId, description?, technicalDescription?, metaDescription? }` (Task 1) y el feeder envía exactamente esos campos (Task 2). El slot pasa a llamarse `descriptionSlot` y se usa con ese nombre en `ProductActions` (Task 3). ✓
