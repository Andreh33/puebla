# Zona Sport — Tienda online + CRM

Tienda online y CRM unificado para **Zona Sport**, tienda de deportes multimarca en
Puebla de la Calzada (Badajoz). Catálogo público, blog, panel `/admin` y conectores
con fuentes externas (Movalia, Amazon Associates), todo desplegable en Vercel.

> **Pagos online**: NO en MVP. Placeholder "Pagos próximamente" con CTA a WhatsApp.
> Stripe se integra en fase 2 (ver `docs/PHASE-2-STRIPE.md`).

---

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui |
| ORM / DB | Prisma 6 + Neon Postgres (Vercel Marketplace) |
| Auth | Auth.js v5 (Credentials + JWT) |
| Storage | Vercel Blob (`@vercel/blob`) |
| Email | Resend |
| Cron | Vercel Cron |
| Imágenes | sharp (server) + browser-image-compression (cliente) |
| Excel | exceljs |
| Amazon | paapi5-nodejs-sdk (PA-API 5.0) |
| Tests | Vitest (unit) + Playwright (e2e) |
| Hosting | Vercel (Fluid Compute) |

Versiones mínimas: Node ≥ 20.18, npm 11 o pnpm 9.

---

## Arranque local

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno y rellenar
cp .env.example .env.local
# editar .env.local — al menos DATABASE_URL y AUTH_SECRET

# 3. Generar cliente Prisma
npm run db:generate

# 4. Aplicar schema a la base de datos
npm run db:migrate    # crea migración inicial
# A continuación, aplicar la migración SQL extra de FTS:
# npx prisma db execute --file prisma/migrations/0001_init_fts/migration.sql

# 5. Seed (admin OWNER + marcas + categorías + post de bienvenida)
npm run seed

# 6. (Opcional) Importar las 3.109 referencias del PRICAT
npm run import:pricat

# 7. Levantar dev server
npm run dev
# → http://localhost:3000
# → http://localhost:3000/admin/login
```

Credenciales del seed (cambiar antes de producción):

```
Email:    admin@zonasport.es     (env SEED_OWNER_EMAIL)
Password: ChangeMe2026!          (env SEED_OWNER_PASSWORD)
```

---

## Estructura

```
app/
├── (public)/             # Tienda pública (Header + Footer + WhatsApp floating)
│   ├── page.tsx          # Home
│   ├── [categoria]/      # /running, /padel, /calzado…
│   ├── producto/[slug]/  # Ficha producto
│   ├── marca/[slug]/     # Página de marca
│   ├── blog/             # Listado + post
│   ├── tienda-en/[muni]/ # Landings locales (6 inicial)
│   ├── contacto/
│   ├── sobre-nosotros/
│   └── (legal)/          # aviso, privacidad, cookies, condiciones
├── admin/
│   ├── layout.tsx        # Protegido por middleware + auth()
│   ├── productos/        # Tabla + editor 6 pestañas
│   ├── importar/         # XLSX, Movalia, Amazon, historial
│   ├── imagenes/         # Galería Vercel Blob
│   ├── blog/             # Editor markdown
│   ├── leads/            # CRM básico
│   ├── ajustes/          # Settings JSON (NAP, SEO, conectores, usuarios)
│   ├── marcas/, categorias/, redirecciones/
│   └── login/
├── api/
│   ├── auth/[...nextauth]/
│   ├── upload/           # Blob upload
│   ├── upload-from-url/
│   ├── import/{xlsx,movalia,amazon}/
│   ├── leads/, newsletter/, search/
│   └── cron/{refresh-amazon,refresh-movalia,blob-garbage-collect,sitemap-revalidate}/
├── layout.tsx            # Root (fuentes, JSON-LD store, Toaster, Analytics)
├── sitemap.ts, robots.ts, manifest.ts
└── opengraph-image.tsx   # OG por defecto

components/
├── ui/                   # shadcn primitives (Button, Input, Card, Badge…)
├── public/               # Header, Footer, WhatsAppButton, ProductCard…
└── admin/

lib/
├── db.ts                 # Prisma singleton
├── auth.ts               # NextAuth config
├── seo/{metadata,schema-org,slug}.ts
├── importer/{xlsx,normalize}.ts
├── blob/{upload,process,garbage-collect}.ts
├── amazon/paapi-client.ts
├── movalia/{provider,adapters}/
├── whatsapp.ts, price.ts, utils.ts, validators.ts

prisma/
├── schema.prisma         # 14 modelos + enums
├── migrations/0001_init_fts/  # FTS Postgres + pg_trgm
└── seed.ts

scripts/
└── import-pricat.ts      # CLI ejecutable

data/
├── PRICAT_JS_Y__8000_TEMPORADA_FW24.xlsx
└── (logo.webp, logo.svg)
```

---

## Regla crítica de modelado

**1 color = 1 producto independiente.** El color NO es atributo seleccionable.

Si la mochila John Smith M24205 viene en 5 colores, se crean **5 registros `Product`**
distintos, cada uno con su slug, URL, set de imágenes, SEO y stock. La **talla** sí es
una variante interna (`ProductSize`) con su EAN y stock por talla.

Razones: SEO largo de cola, merchandising visual, coincidencia con la estructura del
PRICAT (un "código artículo" = un modelo+color).

---

## Importador PRICAT (xlsx)

El archivo `data/PRICAT_JS_Y__8000_TEMPORADA_FW24.xlsx` contiene **3.109 referencias**.

> **Limitación conocida**: la columna `URL` está vacía en las 3.109 filas. Los productos
> importados quedan en estado `DRAFT` sin imagen y deben pasar por el flujo manual de
> subida de imagen antes de ser publicados.

Comando CLI: `npm run import:pricat`.
UI admin: `/admin/importar/xlsx` (drag & drop, dry-run, progreso, errores en CSV).

---

## Conectores externos

### Movalia (B2B, abstracto)

Interfaz `MovaliaProvider` en `lib/movalia/provider.ts` con adaptadores
intercambiables (`csv` / `xml` / `json`). Activar con `MOVALIA_ENABLED=true` y rellenar
credenciales en `.env`. Cron diario en `/api/cron/refresh-movalia`.

### Amazon Associates (PA-API 5.0)

Stub funcional hasta que el cliente facilite `AMAZON_ACCESS_KEY` / `AMAZON_SECRET_KEY` /
`AMAZON_ASSOCIATE_TAG`. Productos con `source = AMAZON` muestran enlace de afiliado
(`rel="sponsored noopener nofollow"`) y badge "Disponible en Amazon".
**Disclosure obligatoria** al pie de cada ficha.

---

## Datos de la tienda

```
Razón social: Zona Sport (CIF: PENDIENTE)
Dirección: C. Silos, 3, 06490 Puebla de la Calzada, Badajoz
Teléfono / WhatsApp: +34 689 11 06 91
Email: hola@zonasport.es
Horario:
  L–V: 10:00–14:00 y 17:00–20:00
  Sábado: 10:00–14:00
  Domingo: cerrado
```

Editables desde `/admin/ajustes` (clave `store.nap`, `store.hours`, `store.social`).

---

## Despliegue en Vercel

1. Importar el repo en Vercel.
2. Instalar **Neon Postgres** desde Storage / Marketplace → inyecta `DATABASE_URL` y
   `DATABASE_URL_UNPOOLED` automáticamente.
3. Crear un store de **Vercel Blob** → inyecta `BLOB_READ_WRITE_TOKEN`.
4. Configurar el resto de env vars (AUTH_SECRET, RESEND_API_KEY, CRON_SECRET,
   NEXT_PUBLIC_*, opcionales Amazon/Movalia).
5. Build command: `prisma generate && next build` (ya en `package.json`).
6. Cron jobs definidos en `vercel.json`.
7. Dominio `zonasport.es` con redirect `www` → no-www.

Las preview deployments crean automáticamente ramas de Neon (database branching).

---

## Scripts

```
npm run dev            # Dev server en :3000 (Turbopack)
npm run build          # prisma generate + next build
npm run start          # Producción local
npm run lint           # ESLint 9 flat
npm run typecheck      # tsc --noEmit
npm run test           # Vitest unit
npm run e2e            # Playwright e2e
npm run db:generate    # Prisma client
npm run db:migrate     # prisma migrate dev
npm run db:deploy      # prisma migrate deploy (prod)
npm run db:studio      # Prisma Studio
npm run db:reset       # Reset DB (cuidado)
npm run seed           # Seed inicial
npm run import:pricat  # Importar PRICAT xlsx
npm run format         # Prettier
```

---

## Accesibilidad y performance

- WCAG 2.1 AA. Contraste validado. Focus visible. Skip-to-content.
- Lighthouse mobile objetivo ≥ 90 en Performance / SEO / A11y / Best Practices.
- Imágenes en 3 variantes WebP (400/800/1600) + LQIP blur.
- Fuentes vía `next/font` (Inter + Manrope, swap).
- ISR en públicas; `revalidatePath` desde admin al publicar.

---

## SEO local

- Schema `LocalBusiness + SportingGoodsStore` global con `areaServed` para municipios
  cercanos (Puebla, Montijo, Lobón, Talavera la Real, Mérida, Badajoz).
- 6 landings `/tienda-en/[municipio]` con contenido único 400–600 palabras + FAQ schema.
- Full-text search Postgres (tsvector + pg_trgm) con trigger automático en `Product` y
  `BlogPost`.

---

## RGPD / LSSI-CE

- Banner de cookies con 3 categorías (necesarias / analíticas / marketing) y cookie
  técnica `zs_consent`.
- Páginas legales editables desde `/admin/ajustes`.
- Formularios con checkbox de consentimiento obligatorio y honeypot anti-spam.
- Endpoint `/api/privacy/request` para derechos ARCO-POL.

---

## Roadmap fase 2

Ver `docs/PHASE-2-STRIPE.md` (cuando esté): Stripe Checkout + Payment Element, modelos
`Order`/`Payment`/`Address`, cuentas de cliente, cálculo de envíos, devoluciones,
cupones, reseñas, wishlist.

---

## Licencia

Privado · Zona Sport · © 2026
