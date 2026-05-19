/**
 * Seed CLI — wrapper sobre `lib/seed/core.ts`.
 *
 * El núcleo del seed vive en lib/seed/core.ts para poder ejecutarlo también
 * desde `POST /api/admin/setup` (bootstrap de producción sin DATABASE_URL
 * disponible localmente en Vercel Marketplace integrations).
 *
 * Ejecutar: npm run seed
 */

import { PrismaClient } from "@prisma/client";
import { runSeed } from "../lib/seed/core";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seed: Zona Sport\n");
  const result = await runSeed(db);
  console.log(`✓ Admin OWNER: ${result.admin.email} ${result.admin.created ? "(creado)" : "(actualizado)"}`);
  console.log(`✓ Marcas: ${result.brands}`);
  console.log(`✓ Categorías: ${result.categories}`);
  console.log(`✓ Settings: ${result.settings}`);
  console.log(
    `✓ Productos demo: ${result.demoProducts.created} creados, ${result.demoProducts.existed} ya existían${
      result.demoProducts.failed ? `, ${result.demoProducts.failed} fallaron` : ""
    }`,
  );
  console.log(`✓ BlogPosts: ${result.blogPosts}`);
  console.log(`\n✅ Seed completado en ${result.durationMs} ms`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
