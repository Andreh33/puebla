# Pipeline de imágenes â€” Zona Sport

> Overview del flujo de gestión de imágenes en Vercel Blob.

## Configuración

**Requisito imprescindible:** la variable de entorno
`BLOB_READ_WRITE_TOKEN` debe estar definida en `.env.local` (dev) y en el
proyecto de Vercel (producción).

El pipeline **falla rápido** si no está configurada (`BlobConfigError`). No
existe fallback a disco local â€” todas las imágenes viven siempre en Vercel
Blob para mantener consistencia entre dev/preview/prod.

```bash
# .env.local
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
# Para el cron de huérfanas:
CRON_SECRET=alguna-cadena-aleatoria-larga
```

## Variantes generadas

Cada imagen subida se transforma con **sharp** en 3 variantes WebP (q80):

| Variante | Tamaño máx | Uso típico                  |
| -------- | ---------- | --------------------------- |
| `thumb`  | 400 px     | Galerías, miniaturas        |
| `medium` | 800 px     | Ficha mobile/tablet         |
| `large`  | 1600 px    | Ficha desktop, zoom         |

Adicionalmente se genera un **LQIP** (Low Quality Image Placeholder) base64
de 10Ã—10 px guardado en `ProductImage.blurDataUrl` para usar como
`placeholder="blur"` en `next/image`.

Todas las imágenes se sirven con `Cache-Control: public, max-age=31536000`
(1 año) â€” son inmutables (URL incluye UUID).

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

- `<UploadDropzone />` â€” drag & drop con compresión cliente
  (browser-image-compression) + barra de progreso por archivo. Llama a
  `/api/upload`.
- `<ImagePicker />` â€” modal con 2 pestañas (Subir / Galería existente).
  Para campos tipo "imagen única" (cover blog, logo marca…).
- `<ImageSortable />` â€” wrapper de @dnd-kit/sortable para reordenar las
  imágenes de un producto.

### Compresión cliente

Antes de enviar al servidor, las imágenes se comprimen a un máximo de
1600 px lado mayor y calidad 0.85. Esto reduce ancho de banda y carga en
sharp server-side. Si la compresión empeora el peso (raro), se sube el
original.

## API

| Endpoint                              | Método | Auth                          |
| ------------------------------------- | ------ | ----------------------------- |
| `/api/upload?type=product&#124;blog&#124;brand&#124;category` | POST   | Admin (sesión)                |
| `/api/upload-from-url`                | POST   | Admin (sesión) + allowlist    |
| `/api/blob/list?cursor=&q=&filter=`   | GET    | Admin (sesión)                |
| `/api/blob/list`                      | DELETE | OWNER (no permitido a EDITOR) |
| `/api/cron/blob-garbage-collect`      | GET    | `Bearer ${CRON_SECRET}`       |

### Seguridad

- **Mime real** validado por magic bytes (no se confía en la extensión ni
  `Content-Type` del cliente / origen).
- **Tamaño máximo 10 MB** por archivo (5 MB efectivo tras compresión).
- **Rate limit** 50 subidas / h / usuario.
- **Allowlist** de dominios para `/api/upload-from-url`:
  - `m.media-amazon.com`, `images-na.ssl-images-amazon.com`,
    `images-eu.ssl-images-amazon.com`
  - `www.johnsmith-sport.com`, `www.mas8000.com`, `shop.miravia.com`
  - El propio dominio del Blob (para re-procesos).
- **Timeout 10s** y **bytes acotados** en el fetch de URL externa
  (no se confía en Content-Length; se interrumpe el stream si excede).
- **Filename del cliente** se sanitiza para logging pero **nunca** se usa
  como path en Blob â€” el path siempre incluye UUID v4.

## Borrado y garbage collection

Para que el almacenamiento no se llene de imágenes que ya no se usan:

1. Cron diario (`vercel.json`) golpea
   `/api/cron/blob-garbage-collect?olderThanDays=7` y devuelve la lista.
2. El admin entra en `/admin/imagenes`, filtra por "Huérfanas" y elimina.
3. El borrado masivo desde la UI **bloquea** URLs que sigan referenciadas
   en DB (devuelve 409) â€” hay que desasociar primero.

El cron **no borra automáticamente** â€” sólo lista. Es una decisión
consciente: una migración o un bug temporal podría dejar imágenes
huérfanas que recuperaríamos enseguida, así que el borrado siempre es
manual.

## Test

```bash
npm run test -- blob
```

Cobertura unitaria:
- `tests/unit/blob-process.test.ts` â€” pipeline sharp + LQIP.
- `tests/unit/blob-garbage-collect.test.ts` â€” cruce DB â†” Blob list.
