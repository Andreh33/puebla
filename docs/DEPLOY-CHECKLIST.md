# Despliegue rÃ¡pido â€” Zona Sport

Tienes el proyecto **linkeado a Vercel** ya:
`latech767-8157s-projects/zonasport` (project_id: `prj_G4BSPgarENsrFooK3vxAi5uX79n4`).

## 1 Â· GitHub (en marcha)

Cuando termines `gh auth login --web`, yo crearÃ© el repo y harÃ© push automÃ¡tico
con `gh repo create zonasport --public --source=. --push`.

## 2 Â· Neon Postgres (30 segundos en el dashboard)

> No hay CLI pÃºblico para crear stores de Marketplace, asÃ­ que estos 3 pasos
> son inevitables. Total < 30 s.

1. Abre: <https://vercel.com/latech767-8157s-projects/zonasport/storage>
2. Pulsa **"Create Database"** â†’ elige **Neon (Serverless Postgres)** â†’
   regiÃ³n **fra1** (Frankfurt, mejor latencia desde EspaÃ±a) â†’ plan **Free**.
3. En el toggle "Connect to Project", asegÃºrate de que **zonasport** estÃ¡
   marcado y los 3 environments (Production Â· Preview Â· Development) estÃ¡n
   activos. Pulsa "Connect".

Eso inyecta automÃ¡ticamente en tus env vars: `DATABASE_URL`,
`DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`.

## 3 Â· Vercel Blob (otros 20 segundos)

Las imÃ¡genes de producto las sube el importador a Vercel Blob.

1. Mismo dashboard: <https://vercel.com/latech767-8157s-projects/zonasport/storage>
2. **"Create Database"** â†’ **Blob** â†’ Connect to Project zonasport.
3. Eso inyecta `BLOB_READ_WRITE_TOKEN`.

## 4 Â· Tras provisionar (vuelves a la terminal)

```bash
vercel env pull .env.local
npm run setup:db
```

`setup:db` ejecuta en serie:

- `prisma migrate deploy` (14 tablas + enums + Ã­ndices).
- SQL extra de **FTS Postgres** (pg_trgm + tsvector + triggers).
- `npm run seed` (admin OWNER + marcas + categorÃ­as + post bienvenida).
- `npm run import:pricat` que descarga las ~583 imÃ¡genes oficiales de
  `aguirreycia.es` con concurrencia 5 y publica los productos verificados.

Tarda 10â€“25 minutos por la descarga de imÃ¡genes.

## 5 Â· Deploy a producciÃ³n

```bash
vercel --prod
```

`vercel.json` ya tiene:

- `buildCommand`: `prisma generate && next build`.
- `regions`: `fra1`.
- `crons`: 4 cron jobs (refresh-amazon, refresh-miravia, blob-gc,
  sitemap-revalidate) con `Authorization: Bearer ${CRON_SECRET}`.

## 6 Â· Variables de entorno mÃ­nimas en Vercel

Estas las aÃ±ade automÃ¡ticamente la integraciÃ³n Neon + Blob:

- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`
- `BLOB_READ_WRITE_TOKEN`

Estas las aÃ±ades tÃº una vez (`vercel env add`):

- `AUTH_SECRET` (genera con `openssl rand -base64 32`)
- `CRON_SECRET` (genera con `openssl rand -hex 32`)
- `RESEND_API_KEY` (opcional para emails â€” `re_xxxxxxx`)
- `NEXT_PUBLIC_SITE_URL` (`https://zonasport.es` o el dominio que asignes)
- `SEED_OWNER_EMAIL` (`admin@zonasport.es` o el tuyo)
- `SEED_OWNER_PASSWORD` (cÃ¡mbialo, no uses ChangeMe2026!)

Estas las dejas vacÃ­as hasta que tengas credenciales:

- `RESEND_API_KEY`, `RESEND_FROM`
- `AMAZON_*` (PA-API 5.0)
- `MIRAVIA_*` (feed B2B)

## 7 Â· Dominio (opcional)

Vercel â†’ Settings â†’ Domains â†’ aÃ±ade `zonasport.es`. Te da los registros DNS.
Como `zonasport.es` parece libre, podrÃ­as comprarlo desde el propio Vercel:
*Vercel Domains* (gratis el primer aÃ±o en algunos TLDs).

## 8 Â· Comprobaciones post-deploy

```
https://zonasport.es                  â†’ Home con scroll 3D + catÃ¡logo
https://zonasport.es/admin/login      â†’ Login admin (SEED_OWNER_EMAIL/PASSWORD)
https://zonasport.es/api/health       â†’ { status: "ok" }
https://zonasport.es/sitemap.xml      â†’ sitemap con TODAS las URLs
https://zonasport.es/manifest.webmanifest â†’ PWA manifest
```
