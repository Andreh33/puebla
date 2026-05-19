# Setup Neon Postgres — 30 segundos

El proyecto está enlazado a Vercel (`latech767-8157s-projects/zonasport`). Solo
falta provisionar la base de datos.

## Pasos (1 vez)

1. Abre el dashboard del proyecto:
   - https://vercel.com/latech767-8157s-projects/zonasport/storage

2. Pulsa **"Create Database"** → elige **Neon (Postgres)** → región **fra1** (Frankfurt) → plan free.

3. Cuando termine el provisioning, asegúrate de que **el toggle "Connect to project: zonasport"** está activado y los environments **Production / Preview / Development** están marcados. Confirma.

   Esto inyecta automáticamente en las env vars del proyecto:
   - `DATABASE_URL`
   - `DATABASE_URL_UNPOOLED`
   - `POSTGRES_URL`, `POSTGRES_PRISMA_URL` (alias compatibles)

4. Vuelve a la terminal y sincroniza las env vars con tu `.env.local`:

   ```bash
   vercel env pull .env.local
   ```

5. Ejecuta el setup completo:

   ```bash
   npm run setup:db
   ```

   Esto hace en orden:
   - `prisma migrate deploy` (crea las 14 tablas + enums + índices).
   - Aplica la migración SQL extra de **FTS (pg_trgm + tsvector)**.
   - `npm run seed` (admin OWNER, marcas, categorías, post bienvenida).
   - `npm run import:pricat` (descarga ~583 imágenes de aguirreycia.es a Vercel Blob, publica los productos con imagen verificada y deja el resto en DRAFT).

   ⏱ Tiempo estimado: 10–25 minutos. La mayoría del tiempo se invierte en
   descargar las imágenes del proveedor con concurrencia 5 y validación de
   magic bytes.

## Cuando termine

- Visita http://localhost:3000 — la home muestra productos REALES con imágenes
  oficiales del catálogo.
- Inicia sesión en `/admin/login` con las credenciales del seed:
  - **Email**: `admin@zonasport.es` (o `SEED_OWNER_EMAIL`)
  - **Password**: `ChangeMe2026!` (o `SEED_OWNER_PASSWORD`) → cámbialo en producción.

## Vercel Blob

Si quieres que las imágenes se sirvan desde Blob (recomendado en producción), añade
también:

1. Dashboard → Storage → **Create Database** → **Blob** → Connect Project.
2. `vercel env pull .env.local`
3. La variable `BLOB_READ_WRITE_TOKEN` queda inyectada y el importador la usa
   automáticamente.

Si no añades Blob, el importador lanzará `BlobConfigError` por cada imagen y los
productos quedarán en DRAFT — pero la home seguirá mostrando los productos demo
de `lib/demo-products.ts`.

## Deploy a producción

```bash
vercel --prod
```

Las migraciones se aplican automáticamente en el build (ver `vercel.json` →
`buildCommand`).

## Troubleshooting

- **`prisma migrate deploy` falla**: tu DB no tiene migraciones aplicadas todavía.
  El script automáticamente cae a `prisma migrate dev --name init --skip-seed`.

- **`prisma db execute` para FTS falla**: tu DB no tiene la extensión `pg_trgm`.
  Neon la incluye por defecto, así que verifica que el connection string apunta
  al pooler correcto.

- **import:pricat se queda colgado**: el origen aguirreycia.es a veces tarda.
  Cancela con Ctrl-C y relanza — el job es idempotente.
