# Conectores externos · Zona Sport

Este documento describe los conectores que pueblan el catálogo desde fuentes
externas. Hay dos: **Amazon** (afiliados, PA-API 5.0) y **Movalia** (feed de
proveedor en CSV/JSON/XML).

Ambos están construidos como _stubs funcionales_: el código está completo y
testado, pero permanecen desactivados hasta que se rellenen las variables de
entorno correspondientes. Hasta entonces, las páginas del admin muestran un
aviso amarillo con instrucciones y los crons hacen un `skipped: true` en vez
de romper el deploy.

---

## Amazon Product Advertising API 5.0

Entra como afiliado, refresca precios y disponibilidad nocturnamente y guarda
productos con `source = AMAZON` y `externalId = ASIN`.

### Variables de entorno

| Nombre                  | Obligatoria | Por defecto                | Descripción                                |
| ----------------------- | ----------- | -------------------------- | ------------------------------------------ |
| `AMAZON_ENABLED`        | sí          | —                          | Pon a `true` para habilitar admin + crons. |
| `AMAZON_ACCESS_KEY`     | sí          | —                          | Access Key de PA-API 5.0.                  |
| `AMAZON_SECRET_KEY`     | sí          | —                          | Secret Key de PA-API 5.0.                  |
| `AMAZON_ASSOCIATE_TAG`  | sí          | —                          | Tag de afiliados, ej. `zonasport-21`.      |
| `AMAZON_HOST`           | no          | `webservices.amazon.es`    | Endpoint regional.                         |
| `AMAZON_REGION`         | no          | `eu-west-1`                | Región AWS para firmar la petición.        |
| `AMAZON_MARKETPLACE`    | no          | `www.amazon.es`            | Dominio público (para URLs de afiliado).   |

### Endpoints / páginas

- `GET /admin/importar/amazon` — UI con input ASIN/URL y modo bulk (máx. 10).
- `POST /api/import/amazon/preview` — devuelve preview sin tocar DB.
- `POST /api/import/amazon` — crea/actualiza productos (`source=AMAZON`).
- `GET  /api/cron/refresh-amazon` — cron nocturno (4:00 UTC) que refresca
  precio y disponibilidad en bloques de 10 ASIN.

### Cómo activar

1. Date de alta en Amazon Associates España.
2. En PA-API, genera credenciales (asegúrate de tener ventas recientes — si no,
   los endpoints devuelven `RequestThrottled`).
3. Configura las variables en Vercel (Project → Settings → Environment).
4. Marca `AMAZON_ENABLED=true`.

### Cómo probar localmente

```bash
export AMAZON_ENABLED=true
export AMAZON_ACCESS_KEY=...
export AMAZON_SECRET_KEY=...
export AMAZON_ASSOCIATE_TAG=zonasport-21
npm run dev
```

Luego abre `/admin/importar/amazon` con sesión admin y prueba con un ASIN
de un producto que sepas que existe (por ejemplo `B0DGHWX7TS`).

### Rate limiting

PA-API limita a **1 request/segundo** por cliente. El módulo
`lib/amazon/paapi-client.ts` implementa una cola interna (`TpsQueue`) que
serializa todas las llamadas — no necesitas preocuparte por eso. Los lotes
grandes se procesarán secuencialmente.

---

## Movalia (proveedor de moda deportiva)

Sincroniza el catálogo completo de Movalia. La fuente es un fichero (CSV,
JSON o XML) — la URL la negocia el proveedor.

### Variables de entorno

| Nombre                | Obligatoria | Por defecto | Descripción                                              |
| --------------------- | ----------- | ----------- | -------------------------------------------------------- |
| `MOVALIA_ENABLED`     | sí          | —           | Pon a `true` para habilitar admin + crons.               |
| `MOVALIA_FEED_URL`    | sí          | —           | URL HTTPS o path local del fichero.                      |
| `MOVALIA_FEED_FORMAT` | no          | `csv`       | `csv` / `json` / `xml`.                                  |
| `MOVALIA_INTERNAL_URL` | no         | `NEXT_PUBLIC_SITE_URL` | Base URL para llamar a `/api/upload-from-url` desde el cron. |

### Endpoints / páginas

- `GET  /admin/importar/movalia` — UI con botones "Dry run" y "Sincronizar".
- `POST /api/import/movalia` — dispara `runMovaliaSync()`.
- `GET  /api/cron/refresh-movalia` — cron nocturno (5:00 UTC).

### Adaptadores

- `lib/movalia/adapters/csv.ts` — parser CSV propio (sin dependencias), soporta
  separadores `,` y `;`, encoding UTF-8 y Latin-1, escapado de comillas. El
  mapping de columnas se configura en el Setting `movalia.csvMapping` como
  `Record<sourceField, targetField>`.
- `lib/movalia/adapters/json.ts` — JSON.parse + coerción.
- `lib/movalia/adapters/xml.ts` — **esqueleto** (TODO: instalar
  `fast-xml-parser` y completar cuando recibamos el primer feed XML real).

### "1 color = 1 producto"

La sincronización agrupa por `externalId`. Si el feed devuelve un mismo
producto con varios colores en filas separadas, cada color genera un Product
distinto con su propio slug y galería. Si los agrupa en una sola fila, hay
que desnormalizar en el adapter — por defecto el CSV asume "una fila por
talla, un externalId por color".

### Cómo probar localmente

Genera un CSV de prueba:

```bash
cat > /tmp/movalia-fake.csv <<EOF
externalId,name,brand,category,colorName,retailPrice,size,ean,stock,imageUrl
MV001,Camiseta Run,Adidas,Running,Negro,21.99,M,1234567890123,5,
MV001,Camiseta Run,Adidas,Running,Negro,21.99,L,1234567890124,3,
EOF
```

```bash
export MOVALIA_ENABLED=true
export MOVALIA_FEED_URL=/tmp/movalia-fake.csv
export MOVALIA_FEED_FORMAT=csv
npm run dev
```

Y dispara desde `/admin/importar/movalia → Dry run` para verificar que
todo se interpreta bien antes de escribir.

---

## Crons

Configurados en `vercel.json`:

| Cron                          | Horario UTC | Descripción                                                |
| ----------------------------- | ----------- | ---------------------------------------------------------- |
| `/api/cron/refresh-amazon`    | 04:00       | Refresca precio + disponibilidad de productos `AMAZON`.    |
| `/api/cron/refresh-movalia`   | 05:00       | Re-sincroniza Movalia.                                     |
| `/api/cron/blob-garbage-collect` | 03:00 (dom) | Lista huérfanos en Vercel Blob.                         |
| `/api/cron/sitemap-revalidate` | 06:00       | `revalidateTag("sitemap")` para regenerar sitemap/robots.  |

Todos requieren header `Authorization: Bearer ${CRON_SECRET}`. Vercel inyecta
ese header automáticamente cuando configures la variable `CRON_SECRET`.

---

## Resend (transactional emails)

| Nombre                      | Obligatoria | Descripción                                  |
| --------------------------- | ----------- | -------------------------------------------- |
| `RESEND_API_KEY`            | no          | Sin esto, los emails se loguean y se omiten. |
| `RESEND_FROM`               | no          | Por defecto `Zona Sport <noreply@zonasport.es>`. |
| `ADMIN_NOTIFICATION_EMAIL`  | no          | Dónde llegan los avisos de leads nuevos.    |

Los flujos que envían email son `/api/leads`, `/api/newsletter` y
`/api/privacy/request`. Todos toleran que Resend no esté configurado.
