# Zona Sport â€” Tienda online + CRM

Tienda online y CRM unificado para **Zona Sport**, tienda de deportes multimarca en
Puebla de la Calzada (Badajoz). CatÃ¡logo pÃºblico, blog, panel `/admin` y conectores
con fuentes externas (Miravia, Amazon Associates), todo desplegable en Vercel.

> **Pagos online**: NO en MVP. Placeholder "Pagos prÃ³ximamente" con CTA a WhatsApp.
> Stripe se integra en fase 2 (ver `docs/PHASE-2-STRIPE.md`).

---

## Stack

| Capa | TecnologÃ­a |
|------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui |
| ORM / DB | Prisma 6 + Neon Postgres (Vercel Marketplace) |
| Auth | Auth.js v5 (Credentials + JWT) |
| Storage | Vercel Blob (`@vercel/blob`) |
| Email | Resend |
| Cron | Vercel Cron |
| ImÃ¡genes | sharp (server) + browser-image-compression (cliente) |
| Excel | exceljs |
| Amazon | paapi5-nodejs-sdk (PA-API 5.0) |
| Tests | Vitest (unit) + Playwright (e2e) |
| Hosting | Vercel (Fluid Compute) |

Versiones mÃ­nimas: Node â‰¥ 20.18, npm 11 o pnpm 9.

---

## Arranque local

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno y rellenar
cp .env.example .env.local
# editar .env.local â€” al menos DATABASE_URL y AUTH_SECRET

# 3. Generar cliente Prisma
npm run db:generate

# 4. Aplicar schema a la base de datos
npm run db:migrate    # crea migraciÃ³n inicial
# A continuaciÃ³n, aplicar la migraciÃ³n SQL extra de FTS:
# npx prisma db execute --file prisma/migrations/0001_init_fts/migration.sql

# 5. Seed (admin OWNER + marcas + categorÃ­as + post de bienvenida)
npm run seed

# 6. (Opcional) Importar las 3.109 referencias del PRICAT
npm run import:pricat

# 7. Levantar dev server
npm run dev
# â†’ http://localhost:3000
# â†’ http://localhost:3000/admin/login
```

Credenciales del seed (cambiar antes de producciÃ³n):

```
Email:    admin@zonasport.es     (env SEED_OWNER_EMAIL)
Password: ChangeMe2026!          (env SEED_OWNER_PASSWORD)
```

---

## Estructura

```
app/
â”œâ”€â”€ (public)/             # Tienda pÃºblica (Header + Footer + WhatsApp floating)
â”‚   â”œâ”€â”€ page.tsx          # Home
â”‚   â”œâ”€â”€ [categoria]/      # /running, /padel, /calzadoâ€¦
â”‚   â”œâ”€â”€ producto/[slug]/  # Ficha producto
â”‚   â”œâ”€â”€ marca/[slug]/     # PÃ¡gina de marca
â”‚   â”œâ”€â”€ blog/             # Listado + post
â”‚   â”œâ”€â”€ tienda-en/[muni]/ # Landings locales (6 inicial)
â”‚   â”œâ”€â”€ contacto/
â”‚   â”œâ”€â”€ sobre-nosotros/
â”‚   â””â”€â”€ (legal)/          # aviso, privacidad, cookies, condiciones
â”œâ”€â”€ admin/
â”‚   â”œâ”€â”€ layout.tsx        # Protegido por middleware + auth()
â”‚   â”œâ”€â”€ productos/        # Tabla + editor 6 pestaÃ±as
â”‚   â”œâ”€â”€ importar/         # XLSX, Miravia, Amazon, historial
â”‚   â”œâ”€â”€ imagenes/         # GalerÃ­a Vercel Blob
â”‚   â”œâ”€â”€ blog/             # Editor markdown
â”‚   â”œâ”€â”€ leads/            # CRM bÃ¡sico
â”‚   â”œâ”€â”€ ajustes/          # Settings JSON (NAP, SEO, conectores, usuarios)
â”‚   â”œâ”€â”€ marcas/, categorias/, redirecciones/
â”‚   â””â”€â”€ login/
â”œâ”€â”€ api/
â”‚   â”œâ”€â”€ auth/[...nextauth]/
â”‚   â”œâ”€â”€ upload/           # Blob upload
â”‚   â”œâ”€â”€ upload-from-url/
â”‚   â”œâ”€â”€ import/{xlsx,miravia,amazon}/
â”‚   â”œâ”€â”€ leads/, newsletter/, search/
â”‚   â””â”€â”€ cron/{refresh-amazon,refresh-miravia,blob-garbage-collect,sitemap-revalidate}/
â”œâ”€â”€ layout.tsx            # Root (fuentes, JSON-LD store, Toaster, Analytics)
â”œâ”€â”€ sitemap.ts, robots.ts, manifest.ts
â””â”€â”€ opengraph-image.tsx   # OG por defecto

components/
â”œâ”€â”€ ui/                   # shadcn primitives (Button, Input, Card, Badgeâ€¦)
â”œâ”€â”€ public/               # Header, Footer, WhatsAppButton, ProductCardâ€¦
â””â”€â”€ admin/

lib/
â”œâ”€â”€ db.ts                 # Prisma singleton
â”œâ”€â”€ auth.ts               # NextAuth config
â”œâ”€â”€ seo/{metadata,schema-org,slug}.ts
â”œâ”€â”€ importer/{xlsx,normalize}.ts
â”œâ”€â”€ blob/{upload,process,garbage-collect}.ts
â”œâ”€â”€ amazon/paapi-client.ts
â”œâ”€â”€ miravia/{provider,adapters}/
â”œâ”€â”€ whatsapp.ts, price.ts, utils.ts, validators.ts

prisma/
â”œâ”€â”€ schema.prisma         # 14 modelos + enums
â”œâ”€â”€ migrations/0001_init_fts/  # FTS Postgres + pg_trgm
â””â”€â”€ seed.ts

scripts/
â””â”€â”€ import-pricat.ts      # CLI ejecutable

data/
â”œâ”€â”€ PRICAT_JS_Y__8000_TEMPORADA_FW24.xlsx
â””â”€â”€ (logo.webp, logo.svg)
```

---

## Regla crÃ­tica de modelado

**1 color = 1 producto independiente.** El color NO es atributo seleccionable.

Si la mochila John Smith M24205 viene en 5 colores, se crean **5 registros `Product`**
distintos, cada uno con su slug, URL, set de imÃ¡genes, SEO y stock. La **talla** sÃ­ es
una variante interna (`ProductSize`) con su EAN y stock por talla.

Razones: SEO largo de cola, merchandising visual, coincidencia con la estructura del
PRICAT (un "cÃ³digo artÃ­culo" = un modelo+color).

---

## Importador PRICAT (xlsx)

El archivo `data/PRICAT_JS_Y__8000_TEMPORADA_FW24.xlsx` contiene **3.109 referencias**.

> **LimitaciÃ³n conocida**: la columna `URL` estÃ¡ vacÃ­a en las 3.109 filas. Los productos
> importados quedan en estado `DRAFT` sin imagen y deben pasar por el flujo manual de
> subida de imagen antes de ser publicados.

Comando CLI: `npm run import:pricat`.
UI admin: `/admin/importar/xlsx` (drag & drop, dry-run, progreso, errores en CSV).

---

## Conectores externos

### Miravia (B2B, abstracto)

Interfaz `MiraviaProvider` en `lib/miravia/provider.ts` con adaptadores
intercambiables (`csv` / `xml` / `json`). Activar con `MIRAVIA_ENABLED=true` y rellenar
credenciales en `.env`. Cron diario en `/api/cron/refresh-miravia`.

### Amazon Associates (PA-API 5.0)

Stub funcional hasta que el cliente facilite `AMAZON_ACCESS_KEY` / `AMAZON_SECRET_KEY` /
`AMAZON_ASSOCIATE_TAG`. Productos con `source = AMAZON` muestran enlace de afiliado
(`rel="sponsored noopener nofollow"`) y badge "Disponible en Amazon".
**Disclosure obligatoria** al pie de cada ficha.

---

## Datos de la tienda

```
RazÃ³n social: Zona Sport (CIF: PENDIENTE)
DirecciÃ³n: C. Silos, 3, 06490 Puebla de la Calzada, Badajoz
TelÃ©fono / WhatsApp: +34 689 11 06 91
Email: hola@zonasport.es
Horario:
  Lâ€“V: 10:00â€“14:00 y 17:00â€“20:00
  SÃ¡bado: 10:00â€“14:00
  Domingo: cerrado
```

Editables desde `/admin/ajustes` (clave `store.nap`, `store.hours`, `store.social`).

---

## Despliegue en Vercel

1. Importar el repo en Vercel.
2. Instalar **Neon Postgres** desde Storage / Marketplace â†’ inyecta `DATABASE_URL` y
   `DATABASE_URL_UNPOOLED` automÃ¡ticamente.
3. Crear un store de **Vercel Blob** â†’ inyecta `BLOB_READ_WRITE_TOKEN`.
4. Configurar el resto de env vars (AUTH_SECRET, RESEND_API_KEY, CRON_SECRET,
   NEXT_PUBLIC_*, opcionales Amazon/Miravia).
5. Build command: `prisma generate && next build` (ya en `package.json`).
6. Cron jobs definidos en `vercel.json`.
7. Dominio `zonasport.es` con redirect `www` â†’ no-www.

Las preview deployments crean automÃ¡ticamente ramas de Neon (database branching).

---

## Scripts

```
npm run dev            # Dev server en :3000 (Turbopack)
npm run build          # prisma generate + next build
npm run start          # ProducciÃ³n local
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
- Lighthouse mobile objetivo â‰¥ 90 en Performance / SEO / A11y / Best Practices.
- ImÃ¡genes en 3 variantes WebP (400/800/1600) + LQIP blur.
- Fuentes vÃ­a `next/font` (Inter + Manrope, swap).
- ISR en pÃºblicas; `revalidatePath` desde admin al publicar.

---

## SEO local

- Schema `LocalBusiness + SportingGoodsStore` global con `areaServed` para municipios
  cercanos (Puebla, Montijo, LobÃ³n, Talavera la Real, MÃ©rida, Badajoz).
- 6 landings `/tienda-en/[municipio]` con contenido Ãºnico 400â€“600 palabras + FAQ schema.
- Full-text search Postgres (tsvector + pg_trgm) con trigger automÃ¡tico en `Product` y
  `BlogPost`.

---

## RGPD / LSSI-CE

- Banner de cookies con 3 categorÃ­as (necesarias / analÃ­ticas / marketing) y cookie
  tÃ©cnica `zs_consent`.
- PÃ¡ginas legales editables desde `/admin/ajustes`.
- Formularios con checkbox de consentimiento obligatorio y honeypot anti-spam.
- Endpoint `/api/privacy/request` para derechos ARCO-POL.

---

## Roadmap fase 2

Ver `docs/PHASE-2-STRIPE.md` (cuando estÃ©): Stripe Checkout + Payment Element, modelos
`Order`/`Payment`/`Address`, cuentas de cliente, cÃ¡lculo de envÃ­os, devoluciones,
cupones, reseÃ±as, wishlist.

---

## Licencia

Privado Â· Zona Sport Â· Â© 2026
