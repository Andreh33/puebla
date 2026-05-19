/**
 * Setup completo de la base de datos:
 *   1. Verifica que DATABASE_URL esté presente.
 *   2. Ejecuta `prisma migrate deploy` (aplica migraciones en orden).
 *   3. Ejecuta la migración SQL manual de Full Text Search.
 *   4. Corre el seed (crea admin OWNER + marcas + categorías + post bienvenida).
 *   5. Lanza el import del PRICAT (descarga las ~583 imágenes de aguirreycia.es
 *      y las sube a Vercel Blob via uploadProductImage).
 *
 * Es idempotente: se puede ejecutar varias veces; cada paso es upsert.
 *
 * Ejecutar: npm run setup:db
 */

import { execSync } from "node:child_process";
import path from "node:path";

const SCRIPT_ENV_PATH = path.resolve(__dirname, "..", ".env.local");

function step(label: string) {
  console.log(`\n\x1b[36m\x1b[1m▶ ${label}\x1b[0m`);
}

function run(cmd: string, opts: { silent?: boolean } = {}) {
  console.log(`\x1b[2m  $ ${cmd}\x1b[0m`);
  return execSync(cmd, {
    stdio: opts.silent ? "pipe" : "inherit",
    env: { ...process.env, DOTENV_CONFIG_PATH: SCRIPT_ENV_PATH },
  });
}

async function main() {
  console.log("\x1b[1m╭─────────────────────────────────────────────╮\x1b[0m");
  console.log("\x1b[1m│  Zona Sport — setup DB + seed + import      │\x1b[0m");
  console.log("\x1b[1m╰─────────────────────────────────────────────╯\x1b[0m");

  // 1. Verificar DATABASE_URL
  step("Verificando DATABASE_URL…");
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes("placeholder")) {
    console.error("\x1b[31m✗ DATABASE_URL no está configurada o sigue siendo placeholder.\x1b[0m");
    console.error("\nPasos:");
    console.error(
      "  1) Abre https://vercel.com/latech767-8157s-projects/zonasport/storage",
    );
    console.error("  2) Pulsa 'Create Database' → elige Neon Postgres.");
    console.error("  3) Cuando esté lista, vuelve a la terminal y corre:");
    console.error("     \x1b[36mvercel env pull .env.local\x1b[0m");
    console.error("  4) Re-lanza: \x1b[36mnpm run setup:db\x1b[0m\n");
    process.exit(1);
  }
  console.log("  ✓ DATABASE_URL detectada.");

  // 2. Prisma migrate
  step("Aplicando migraciones Prisma…");
  try {
    run("npx prisma migrate deploy");
  } catch {
    console.warn(
      "  ⚠ migrate deploy falló (probablemente la BD está vacía). Intentando 'migrate dev --name init' como fallback…",
    );
    run("npx prisma migrate dev --name init --skip-seed");
  }

  // 3. SQL extra para FTS + pg_trgm
  step("Aplicando migración SQL de FTS (pg_trgm + tsvector + triggers)…");
  try {
    run(
      "npx prisma db execute --file prisma/migrations/0001_init_fts/migration.sql --schema prisma/schema.prisma",
    );
    console.log("  ✓ FTS aplicado.");
  } catch (err) {
    console.warn(
      `  ⚠ FTS no se pudo aplicar: ${(err as Error).message}\n     (no es bloqueante — la búsqueda usa fallback ILIKE).`,
    );
  }

  // 4. Seed
  step("Ejecutando seed (admin OWNER + marcas + categorías + post bienvenida)…");
  run("npm run seed --silent");

  // 5. Import PRICAT
  step("Importando el PRICAT (~3.109 filas, ~583 productos únicos + imágenes)…");
  console.log(
    "  Esto puede tardar entre 10 y 25 minutos según la velocidad de aguirreycia.es y de tu conexión.",
  );
  console.log("  El script publica únicamente los productos cuya imagen oficial descarga correctamente.");
  run("npm run import:pricat");

  console.log("\n\x1b[32m\x1b[1m✓ Setup completo.\x1b[0m");
  console.log("  Visita http://localhost:3000 — ya hay productos reales con imágenes.");
  console.log("  Accede a /admin con las credenciales del seed (env SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD).\n");
}

main().catch((err) => {
  console.error("\n\x1b[31m✗ setup-db abortó:\x1b[0m", err);
  process.exit(1);
});
