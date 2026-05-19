# Conectores externos · Zona Sport

Este documento describe los conectores que pueblan el catálogo desde fuentes
externas. Hay dos: **Amazon** (afiliados, PA-API 5.0) y **Miravia** (feed de
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
| `AMAZON_ENABLED`        | sí          | â€”                          | Pon a `true` para habilitar admin + crons. |
| `AMAZON_ACCESS_KEY`     | sí          | â€”                          | Access Key de PA-API 5.0.                  |
| `AMAZON_SECRET_KEY`     | sí          | â€”                          | Secret Key de PA-API 5.0.                  |
| `AMAZON_ASSOCIATE_TAG`  | sí          | â€”                          | Tag de afiliados, ej. `zonasport-21`.      |
| `AMAZON_HOST`           | no          | `webservices.amazon.es`    | Endpoint regional.                         |
| `AMAZON_REGION`         | no          | `eu-west-1`                | Región AWS para firmar la petición.        |
| `AMAZON_MARKETPLACE`    | no          | `www.amazon.es`            | Dominio público (para URLs de afiliado).   |

### Endpoints / páginas

- `GET /admin/importar/amazon` â€” UI con input ASIN/URL y modo bulk (máx. 10).
- `POST /api/import/amazon/preview` â€” devuelve preview sin tocar DB.
- `POST /api/import/amazon` â€” crea/actualiza productos (`source=AMAZON`).
- `GET  /api/cron/refresh-amazon` â€” cron nocturno (4:00 UTC) que refresca
  precio y disponibilidad en bloques de 10 ASIN.

### Cómo activar

1. Date de alta en Amazon Associates España.
2. En PA-API, genera credenciales (asegúrate de tener ventas recientes â€” si no,
   los endpoints devuelven `RequestThrottled`).
3. Configura las variables en Vercel (Project â†’ Settings â†’ Environment).
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
serializa todas las llamadas â€” no necesitas preocuparte por eso. Los lotes
grandes se procesarán secuencialmente.

---

## Miravia (proveedor de moda deportiva)

Sincroniza el catálogo completo de Miravia. La fuente es un fichero (CSV,
JSON o XML) â€” la URL la negocia el proveedor.

### Variables de entorno

| Nombre                | Obligatoria | Por defecto | Descripción                                              |
| --------------------- | ----------- | ----------- | -------------------------------------------------------- |
| `MIRAVIA_ENABLED`     | sí          | â€”           | Pon a `true` para habilitar admin + crons.               |
| `MIRAVIA_FEED_URL`    | sí          | â€”           | URL HTTPS o path local del fichero.                      |
| `MIRAVIA_FEED_FORMAT` | no          | `csv`       | `csv` / `json` / `xml`.                                  |
| `MIRAVIA_INTERNAL_URL` | no         | `NEXT_PUBLIC_SITE_URL` | Base URL para llamar a `/api/upload-from-url` desde el cron. |

### Endpoints / páginas

- `GET  /admin/importar/miravia` â€” UI con botones "Dry run" y "Sincronizar".
- `POST /api/import/miravia` â€” dispara `runMiraviaSync()`.
- `GET  /api/cron/refresh-miravia` â€” cron nocturno (5:00 UTC).

### Adaptadores

- `lib/miravia/adapters/csv.ts` â€” parser CSV propio (sin dependencias), soporta
  separadores `,` y `;`, encoding UTF-8 y Latin-1, escapado de comillas. El
  mapping de columnas se configura en el Setting `miravia.csvMapping` como
  `Record<sourceField, targetField>`.
- `lib/miravia/adapters/json.ts` â€” JSON.parse + coerción.
- `lib/miravia/adapters/xml.ts` â€” **esqueleto** (TODO: instalar
  `fast-xml-parser` y completar cuando recibamos el primer feed XML real).

### "1 color = 1 producto"

La sincronización agrupa por `externalId`. Si el feed devuelve un mismo
producto con varios colores en filas separadas, cada color genera un Product
distinto con su propio slug y galería. Si los agrupa en una sola fila, hay
que desnormalizar en el adapter â€” por defecto el CSV asume "una fila por
talla, un externalId por color".

### Cómo probar localmente

Genera un CSV de prueba:

```bash
cat > /tmp/miravia-fake.csv <<EOF
externalId,name,brand,category,colorName,retailPrice,size,ean,stock,imageUrl
MV001,Camiseta Run,Adidas,Running,Negro,21.99,M,1234567890123,5,
MV001,Camiseta Run,Adidas,Running,Negro,21.99,L,1234567890124,3,
EOF
```

```bash
export MIRAVIA_ENABLED=true
export MIRAVIA_FEED_URL=/tmp/miravia-fake.csv
export MIRAVIA_FEED_FORMAT=csv
npm run dev
```

Y dispara desde `/admin/importar/miravia â†’ Dry run` para verificar que
todo se interpreta bien antes de escribir.

---

## Crons

Configurados en `vercel.json`:

| Cron                          | Horario UTC | Descripción                                                |
| ----------------------------- | ----------- | ---------------------------------------------------------- |
| `/api/cron/refresh-amazon`    | 04:00       | Refresca precio + disponibilidad de productos `AMAZON`.    |
| `/api/cron/refresh-miravia`   | 05:00       | Re-sincroniza Miravia.                                     |
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
