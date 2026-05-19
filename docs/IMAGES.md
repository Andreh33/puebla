# Pipeline de imÃ¡genes â€” Zona Sport

> Overview del flujo de gestiÃ³n de imÃ¡genes en Vercel Blob.

## ConfiguraciÃ³n

**Requisito imprescindible:** la variable de entorno
`BLOB_READ_WRITE_TOKEN` debe estar definida en `.env.local` (dev) y en el
proyecto de Vercel (producciÃ³n).

El pipeline **falla rÃ¡pido** si no estÃ¡ configurada (`BlobConfigError`). No
existe fallback a disco local â€” todas las imÃ¡genes viven siempre en Vercel
Blob para mantener consistencia entre dev/preview/prod.

```bash
# .env.local
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
# Para el cron de huÃ©rfanas:
CRON_SECRET=alguna-cadena-aleatoria-larga
```

## Variantes generadas

Cada imagen subida se transforma con **sharp** en 3 variantes WebP (q80):

| Variante | TamaÃ±o mÃ¡x | Uso tÃ­pico                  |
| -------- | ---------- | --------------------------- |
| `thumb`  | 400 px     | GalerÃ­as, miniaturas        |
| `medium` | 800 px     | Ficha mobile/tablet         |
| `large`  | 1600 px    | Ficha desktop, zoom         |

Adicionalmente se genera un **LQIP** (Low Quality Image Placeholder) base64
de 10Ã—10 px guardado en `ProductImage.blurDataUrl` para usar como
`placeholder="blur"` en `next/image`.

Todas las imÃ¡genes se sirven con `Cache-Control: public, max-age=31536000`
(1 aÃ±o) â€” son inmutables (URL incluye UUID).

## Path en Blob

```
products/{productId}/{uuid}-{thumb|medium|large}.webp
products/unassigned/{uuid}-...     (si se sube sin productId)
blog/{slug-uuid}-{...}.webp
brands/{slug-uuid}-{...}.webp
categories/{slug-uuid}-{...}.webp
```

## Subida desde el frontend (admin)

### Componentes

- `<UploadDropzone />` â€” drag & drop con compresiÃ³n cliente
  (browser-image-compression) + barra de progreso por archivo. Llama a
  `/api/upload`.
- `<ImagePicker />` â€” modal con 2 pestaÃ±as (Subir / GalerÃ­a existente).
  Para campos tipo "imagen Ãºnica" (cover blog, logo marcaâ€¦).
- `<ImageSortable />` â€” wrapper de @dnd-kit/sortable para reordenar las
  imÃ¡genes de un producto.

### CompresiÃ³n cliente

Antes de enviar al servidor, las imÃ¡genes se comprimen a un mÃ¡ximo de
1600 px lado mayor y calidad 0.85. Esto reduce ancho de banda y carga en
sharp server-side. Si la compresiÃ³n empeora el peso (raro), se sube el
original.

## API

| Endpoint                              | MÃ©todo | Auth                          |
| ------------------------------------- | ------ | ----------------------------- |
| `/api/upload?type=product&#124;blog&#124;brand&#124;category` | POST   | Admin (sesiÃ³n)                |
| `/api/upload-from-url`                | POST   | Admin (sesiÃ³n) + allowlist    |
| `/api/blob/list?cursor=&q=&filter=`   | GET    | Admin (sesiÃ³n)                |
| `/api/blob/list`                      | DELETE | OWNER (no permitido a EDITOR) |
| `/api/cron/blob-garbage-collect`      | GET    | `Bearer ${CRON_SECRET}`       |

### Seguridad

- **Mime real** validado por magic bytes (no se confÃ­a en la extensiÃ³n ni
  `Content-Type` del cliente / origen).
- **TamaÃ±o mÃ¡ximo 10 MB** por archivo (5 MB efectivo tras compresiÃ³n).
- **Rate limit** 50 subidas / h / usuario.
- **Allowlist** de dominios para `/api/upload-from-url`:
  - `m.media-amazon.com`, `images-na.ssl-images-amazon.com`,
    `images-eu.ssl-images-amazon.com`
  - `www.johnsmith-sport.com`, `www.mas8000.com`, `shop.miravia.com`
  - El propio dominio del Blob (para re-procesos).
- **Timeout 10s** y **bytes acotados** en el fetch de URL externa
  (no se confÃ­a en Content-Length; se interrumpe el stream si excede).
- **Filename del cliente** se sanitiza para logging pero **nunca** se usa
  como path en Blob â€” el path siempre incluye UUID v4.

## Borrado y garbage collection

Para que el almacenamiento no se llene de imÃ¡genes que ya no se usan:

1. Cron diario (`vercel.json`) golpea
   `/api/cron/blob-garbage-collect?olderThanDays=7` y devuelve la lista.
2. El admin entra en `/admin/imagenes`, filtra por "HuÃ©rfanas" y elimina.
3. El borrado masivo desde la UI **bloquea** URLs que sigan referenciadas
   en DB (devuelve 409) â€” hay que desasociar primero.

El cron **no borra automÃ¡ticamente** â€” sÃ³lo lista. Es una decisiÃ³n
consciente: una migraciÃ³n o un bug temporal podrÃ­a dejar imÃ¡genes
huÃ©rfanas que recuperarÃ­amos enseguida, asÃ­ que el borrado siempre es
manual.

## Test

```bash
npm run test -- blob
```

Cobertura unitaria:
- `tests/unit/blob-process.test.ts` â€” pipeline sharp + LQIP.
- `tests/unit/blob-garbage-collect.test.ts` â€” cruce DB â†” Blob list.
