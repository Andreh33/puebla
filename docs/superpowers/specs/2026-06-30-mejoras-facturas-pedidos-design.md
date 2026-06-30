# Mejoras a /admin/facturas y /admin/pedidos — diseño (2026-06-30)

Continuación de la tanda 2026-06-30 (facturas ya en producción). Cuatro mejoras
sobre lo ya entregado, todas en el panel admin. Una lleva migración aditiva; el
resto no toca la BD.

## Alcance

1. **Facturas — columnas personalizadas** ("a tu gusto"). [con migración]
2. **Facturas — calendario navegable y con mejor aspecto.** [sin migración]
3. **/admin/pedidos — resaltar el rango activo** (30/60/90/Todo). [sin migración]
4. **/admin/pedidos — gráfica de pedidos por rango.** [sin migración]

---

## 1. Facturas: columnas personalizadas

Una sola tabla (la actual), pero el usuario puede añadir columnas propias con su
nombre, reordenarlas (arrastrar), redimensionarlas (arrastrar el borde) y
borrarlas. Las columnas son **globales** (compartidas por todas las facturas,
como en Excel). Los valores son **texto libre** por factura.

### Datos (migración aditiva `..._invoice_custom_columns_additive`)
- Tabla nueva `InvoiceColumn`: `id`, `name String`, `position Int`, `width Int`
  (px, default 160), `createdAt`, `updatedAt`. `@@index([position])`.
- Campo nuevo en `SupplierInvoice`: `customValues Json @default("{}")` — mapa
  `{ [columnId]: string }`. Aditivo y nullable-safe (default `{}`).
- Al borrar una columna, sus valores quedan huérfanos en el JSON: inocuos (no se
  pintan). No hace falta limpiarlos.

### Server actions (`app/admin/facturas/_actions.ts`)
- `createColumnAction(name)` → crea con `position = max+1`, `width = 160`.
- `renameColumnAction(id, name)`.
- `reorderColumnsAction(idsInOrder: string[])` → reescribe `position` por índice.
- `resizeColumnAction(id, width)` → clamp 80..600.
- `deleteColumnAction(id)`.
- `setCustomValueAction(invoiceId, columnId, value)` → fusiona en `customValues`
  (lee, setea/borra la clave, guarda). Valida que `columnId` existe.
- Todas con `requireSession()` y retorno `{ok}|{ok:false,error}` (patrón actual),
  llamadas desde el cliente vía `safeAction`.

### UI (`FacturasClient.tsx`)
- La cabecera de la tabla pinta las columnas fijas + las custom (de props).
- Cada columna custom: título editable (rename onBlur), `width` aplicado por
  estilo, handle de arrastre para reordenar (dnd-kit horizontal, ya usado en
  ProductEditor para imágenes), handle de resize en el borde derecho, botón
  borrar. Botón **"+ Columna"** al final.
- Cada fila pinta una celda editable (texto) por columna custom, cuyo valor sale
  de `customValues[columnId]` y se guarda con `setCustomValueAction`
  (optimista + rollback, igual que el resto de celdas).
- El `page.tsx` carga `db.invoiceColumn.findMany({orderBy:{position:"asc"}})` y
  serializa `customValues` de cada factura.

### Decisión
- Valores = texto libre (sin tipos numéricos/fecha en v1).
- Reordenar = arrastrar (dnd-kit). Resize = arrastrar el borde (persistido).

---

## 2. Facturas: calendario mejorado

El calendario actual sólo se mueve con el `<input type="month">` y se ve pobre.

- **Navegación:** cabecera con **‹ anterior**, **mes y año**, **siguiente ›**,
  botón **"Hoy"** y el selector de mes/año (permite saltar muy atrás/adelante).
  Estado `month` (YYYY-MM) ya existe; añadir handlers prev/next (suma/resta un
  mes con aritmética de fecha pura) y "hoy".
- **Días más ricos:** cada día con vencimientos lista sus pagos (proveedor +
  importe) en vez de solo el total; color verde/naranja/rojo por estado. Hoy
  resaltado; relleno suave en fines de semana.
- **Próximos pagos:** una lista lateral/inferior con los siguientes vencimientos
  pendientes ordenados por fecha (no limitada al mes visible), para ver de un
  vistazo lo que toca pagar.
- Lógica de rejilla y de "mover N meses" en funciones puras testeables
  (`lib/admin/calendar.ts` o ampliando `supplier-invoices.ts`).

---

## 3. /admin/pedidos: resaltar el rango activo

Hoy los botones 30/60/90/Todo no muestran cuál está puesto.

- Estado cliente `activePreset: "30"|"60"|"90"|"todo"|"custom"|null`.
- Al pulsar un preset se marca; al editar las fechas a mano → `"custom"`.
- Al cargar, se infiere del `from/to` inicial (best-effort: `from===isoDaysAgo(n)`
  y sin `to` → ese preset; sin `from/to` → `"todo"`; si no encaja → `"custom"`).
- El botón activo: `variant="default"` (relleno azul); el resto `variant="outline"`.

---

## 4. /admin/pedidos: gráfica de pedidos por rango

Gráfica nueva dentro de la página de pedidos que refleja el rango/filtros activos.

- **Datos (server, `page.tsx`):** una query extra `db.order.findMany({ where,
  select:{createdAt,total} })` con el **mismo `where`** que la tabla (status, q,
  from, to) **sin** paginación. Se agrupa con una función pura.
- **Bucketing adaptativo (`lib/admin/order-series.ts`, puro + tests):** dado el
  rango efectivo [start, end] (start = `from` o el pedido más antiguo del
  conjunto; end = `to` o hoy):
  - ≤ 62 días → por **día**; ≤ 186 días → por **semana** (lunes); si más → por
    **mes**. Devuelve serie continua `{date, ingresos, pedidos}[]` (rellena
    periodos vacíos a 0); `date` = inicio del periodo (YYYY-MM-DD).
- **Render:** se reutiliza `components/admin/SalesChart.tsx` (ya acepta
  `{date,ingresos,pedidos}`), dentro de una Card "Evolución de pedidos" encima de
  la tabla. `ingresos` = Σ `total` del conjunto filtrado; `pedidos` = nº por
  periodo. Coherente con lo que muestra la tabla (mismos filtros).
- Nota: con filtro de estado "todos", la gráfica incluye cancelados/pendientes
  (igual que la tabla); es deliberado para que cuadre con la lista.

---

## Testing
- Puro + TDD: bucketing de `order-series` (día/semana/mes, relleno de huecos,
  rango vacío), aritmética de meses del calendario, inferencia de preset activo.
- typecheck + vitest + lint + build antes de desplegar. Migración probada en dev
  + smoke CRUD de columnas. Revisión adversarial Opus de la parte con migración.

## Despliegue
Dos commits lógicos: (a) sin migración (calendario, pedidos color, gráfica), (b)
con migración (columnas custom). Push a master → Vercel aplica `migrate deploy` +
deploy. Verificación local completa antes del push.

## No incluido (YAGNI)
- Tipos de columna (número/fecha/checkbox): v1 sólo texto.
- Exportar la gráfica; varios meses de calendario a la vez; columnas por-lista.
