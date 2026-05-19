# SEO — Zona Sport

Documento operativo de la infraestructura SEO del proyecto.
Cualquier cambio que afecte a indexabilidad, sitemaps, schema.org o búsqueda
debe quedar reflejado aquí.

## 1. Estructura de sitemaps

- `app/sitemap.ts` → sitemap principal. Incluye:
  - Páginas estáticas (home, blog, contacto, sobre-nosotros, legales, marcas).
  - Landings locales (`/tienda-en/<municipio>`).
  - Marcas (`/marca/<slug>`).
  - Categorías con al menos 1 producto (`/<slug>`).
  - Productos publicados (`/producto/<slug>`) y posts (`/blog/<slug>`) **si**
    el total no excede los ~5.000 URLs. En caso contrario, productos y posts
    quedan delegados a sus sub-sitemaps.
- `app/sitemap-products.xml/route.ts` → sub-sitemap específico de productos
  `ACTIVE` (límite duro de 50.000 URLs por archivo, según spec sitemaps.org).
- `app/sitemap-posts.xml/route.ts` → idem para posts `PUBLISHED`.

Los buscadores los descubren porque `app/robots.ts` referencia los tres en su
campo `sitemap`.

## 2. `robots.ts` y bots de IA

`robots.txt` se construye dinámicamente:

- `User-agent: *` permite todo salvo `/admin`, `/api`, `/buscar`, `?preview=`, `?utm_*`.
- `Mediapartners-Google` (AdSense) se permite explícitamente.
- Bots de scraping IA (GPTBot, anthropic-ai, ClaudeBot, CCBot, PerplexityBot,
  Bytespider, Amazonbot, Google-Extended, ChatGPT-User, OAI-SearchBot…) se
  controlan con el setting `seo.allowAI`.
  - `true` (default) → permitidos salvo admin/api.
  - `false` → `Disallow: /` para todos.

Se cambia desde la tabla `Setting` con clave `seo.allowAI` (boolean o
`{ allow: boolean }`).

## 3. Manifest PWA

`app/manifest.ts` declara `theme_color`, `background_color`, `start_url`,
categorías y los iconos SVG (`/favicon.svg`, `/logo.svg`). Pendiente: pipeline
para generar PNGs a 192/512 y variantes maskable (TODO documentado en el
propio archivo).

## 4. Open Graph y Twitter

- `app/opengraph-image.tsx` → 1200×630, gradiente azul + acentos rojos, NAP al pie.
- `app/twitter-image.tsx` → 1200×675, ratio 16:9 para X.
- Por entidad (`producto/[slug]`, `blog/[slug]`, `marca/[slug]`, etc.) la
  generan los agentes responsables de cada ruta con `next/og`.

## 5. Schema.org

`lib/seo/schema-org.ts` exporta builders puros:

| Builder | Uso |
|---|---|
| `localBusinessSchema()` | Inyectar en el layout público (`SportingGoodsStore`). |
| `organizationSchema()` | Idem; útil para autoría del blog y contactPoint. |
| `websiteSchema()` | Layout público; incluye `SearchAction`. |
| `breadcrumbSchema(items)` | Cualquier ruta con migas. |
| `productSchema(p)` | `/producto/[slug]`. |
| `productListSchema(items)` | Listados (categorías, marca). |
| `blogPostingSchema(p)` | `/blog/[slug]`. |
| `faqPageSchema(items)` | FAQs sobre/contacto/landings. |
| `brandSchema(b)` | `/marca/[slug]`. |
| `categoryCollectionSchema(c)` | `/[categoria]`. |
| `localLandingSchema(municipio)` | `/tienda-en/[m]`. |
| `aboutPageSchema()` / `contactPageSchema()` | Páginas estáticas. |
| `siteNavigationElementSchema(items)` | Opcional en el header. |

Inyección recomendada:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: jsonLd(productSchema(p)) }}
/>
```

`jsonLd()` escapa `<` para evitar inyección.

## 6. Full Text Search (Postgres)

Migración: `prisma/migrations/0001_init_fts/migration.sql`.

Aplica en local:

```bash
npx prisma db execute --file prisma/migrations/0001_init_fts/migration.sql --schema prisma/schema.prisma
```

En producción (Neon/Vercel):

1. `prisma migrate deploy` para todo lo declarativo.
2. `prisma db execute --file prisma/migrations/0001_init_fts/migration.sql`
   tras cada cambio que afecte a las funciones/triggers.

La migración añade:

- `Product.searchVector` y `BlogPost.searchVector` (`tsvector`).
- Triggers de actualización con configuración `pg_catalog.spanish` (stemming)
  y `pg_catalog.simple` (literal) en paralelo, con `unaccent`.
- Índices GIN sobre `searchVector` y trigram sobre `name`, `modelCode`,
  `title`, `ean`.

API JS: `lib/search.ts` exporta `searchProducts`, `searchPosts`, `searchAll`.
Estrategia: primero `websearch_to_tsquery`, si no hay matches → fallback
`pg_trgm` similarity con umbral 0.2.

## 7. Redirecciones gestionables

- Tabla: `RedirectRule` (Prisma).
- Admin UI: `app/admin/redirecciones`.
- Server actions: `app/admin/redirecciones/_actions.ts`.
- Cache: `lib/redirects.ts` mantiene un `Map` en memoria con TTL 60s. La
  invalidación se hace con `revalidateTag('redirects')` + reset local cuando
  el admin guarda.
- Middleware (`middleware.ts`) consulta `lookupRedirect()` antes de cualquier
  otra lógica. Es edge-safe: en caso de miss, hace `fetch` al endpoint
  `/api/redirects` (Node, con Prisma).
- Hits: el middleware envía un `POST /api/redirects` fire-and-forget; el
  endpoint acumula contadores en memoria y los persiste cada 30 s.

## 8. Revalidación on-demand

Endpoint: `POST /api/revalidate` con `Authorization: Bearer ${CRON_SECRET}` y
body `{ path?: string | string[]; tag?: string | string[] }`.

Casos de uso:

- Después de publicar un producto: `revalidatePath('/producto/<slug>')` +
  `revalidatePath('/<categoria>')` (lo hacen los agentes de producto/categoría
  en sus server actions; este endpoint cubre integraciones externas).
- Webhooks de proveedores que actualizan precio/stock.
- Crons periódicos.

## 9. Checks pre-launch

1. **Search Console** — verifica propiedad con `GOOGLE_SITE_VERIFICATION`,
   sube `sitemap.xml`, comprueba cobertura.
2. **Google Business Profile** — NAP idéntico al de `STORE_NAP` en
   `lib/seo/schema-org.ts`. Subir fotos, horarios, productos destacados.
3. **Rich Results Test** — validar Product, LocalBusiness, BlogPosting,
   FAQ, Breadcrumb en al menos una página de cada tipo.
4. **Schema.org validator** — `https://validator.schema.org/`.
5. **PageSpeed Insights / Lighthouse** — objetivo: ≥ 95 en SEO y ≥ 90 en perf.
6. **robots.txt tester** — Search Console.
7. **Bing Webmaster Tools** — añadir sitemap.
8. **Manifest válido** — `chrome://webapks/` o Lighthouse PWA.
9. **Open Graph debugger** — Facebook, Twitter Card Validator, LinkedIn.
10. **Redirects sanity-check** — desde el admin, simular en consola
    `curl -sI https://zonasport.es/url-antigua | head`.
11. **Hreflang** — pendiente fase 2 si se añaden idiomas.
12. **Indexabilidad de paginación** — los listados deben emitir `rel="next/prev"`
    o usar parámetros canónicos correctos (responsabilidad del agente 4).

## 10. Variables de entorno relevantes

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL canónica del sitio. |
| `NEXT_PUBLIC_SITE_NAME` | Nombre comercial mostrado en metadata/JSON-LD. |
| `GOOGLE_SITE_VERIFICATION` | Meta tag de verificación Search Console. |
| `CRON_SECRET` | Bearer del endpoint `/api/revalidate` y de la API de redirects. |
